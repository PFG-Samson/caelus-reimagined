import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import { extractSignals } from './engine/signals';
import { defaultRules } from './engine/rules';
import { evaluate } from './engine/evaluator';
import { ensurePostGIS, findZonesContainingPoint } from './engine/spatial';
import { defaultZones } from './engine/defaultZones';
import rulesRouter from './routes/rules';
import zonesRouter from './routes/zones';
import { PrismaClient } from './generated/prisma';
import type { RiskRule, ZoneSummary } from './engine/types';

const prisma = new PrismaClient();

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;
const OPENWEATHER_KEY = process.env.OPENWEATHER_KEY;

if (!OPENWEATHER_KEY) {
  console.error('❌ OPENWEATHER_KEY is not set in .env');
  process.exit(1);
}

app.use(cors());
app.use(express.json());

// Mount CRUD routers
app.use('/api/rules', rulesRouter);
app.use('/api/zones', zonesRouter);

// ─── Health Check ────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'caelus-intelligence-layer', timestamp: new Date().toISOString() });
});

// ─── GET /api/weather ────────────────────────────────────────────
// Proxies current weather data from OpenWeather
app.get('/api/weather', async (req, res) => {
  const { lat, lon, units = 'metric' } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({ error: 'lat and lon query parameters are required' });
  }

  try {
    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather`,
      { params: { lat, lon, units, appid: OPENWEATHER_KEY } }
    );
    res.json(response.data);
  } catch (error: any) {
    console.error('Error fetching weather:', error.message);
    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch weather data',
      details: error.response?.data?.message || error.message,
    });
  }
});

// ─── GET /api/forecast ───────────────────────────────────────────
// Proxies 5-day / 3-hour forecast from OpenWeather
app.get('/api/forecast', async (req, res) => {
  const { lat, lon, units = 'metric' } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({ error: 'lat and lon query parameters are required' });
  }

  try {
    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/forecast`,
      { params: { lat, lon, units, appid: OPENWEATHER_KEY } }
    );
    res.json(response.data);
  } catch (error: any) {
    console.error('Error fetching forecast:', error.message);
    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch forecast data',
      details: error.response?.data?.message || error.message,
    });
  }
});

// ─── GET /api/air-quality ────────────────────────────────────────
// Proxies air pollution data from OpenWeather
app.get('/api/air-quality', async (req, res) => {
  const { lat, lon } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({ error: 'lat and lon query parameters are required' });
  }

  try {
    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/air_pollution`,
      { params: { lat, lon, appid: OPENWEATHER_KEY } }
    );
    res.json(response.data);
  } catch (error: any) {
    console.error('Error fetching air quality:', error.message);
    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch air quality data',
      details: error.response?.data?.message || error.message,
    });
  }
});

// ─── GET /api/tiles/:layer/:z/:x/:y ─────────────────────────────
// Proxies OpenWeather map tiles (removes API key exposure on frontend)
app.get('/api/tiles/:layer/:z/:x/:y', async (req, res) => {
  const { layer, z, x, y } = req.params;

  try {
    const response = await axios.get(
      `https://tile.openweathermap.org/map/${layer}/${z}/${x}/${y}.png`,
      {
        params: { appid: OPENWEATHER_KEY },
        responseType: 'arraybuffer',
      }
    );
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=600'); // Cache tiles for 10 min
    res.send(response.data);
  } catch (error: any) {
    console.error('Error fetching tile:', error.message);
    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch map tile',
    });
  }
});

// ─── GET /api/insights ───────────────────────────────────────────
// Combined endpoint: returns weather + forecast + air quality + zone-aware insights
app.get('/api/insights', async (req, res) => {
  const { lat, lon, units = 'metric' } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({ error: 'lat and lon query parameters are required' });
  }

  try {
    // Fetch weather data and find matching zones in parallel
    const [weatherRes, forecastRes, airRes, matchingZones] = await Promise.all([
      axios.get('https://api.openweathermap.org/data/2.5/weather', {
        params: { lat, lon, units, appid: OPENWEATHER_KEY },
      }),
      axios.get('https://api.openweathermap.org/data/2.5/forecast', {
        params: { lat, lon, units, appid: OPENWEATHER_KEY },
      }),
      axios.get('https://api.openweathermap.org/data/2.5/air_pollution', {
        params: { lat, lon, appid: OPENWEATHER_KEY },
      }),
      findZonesContainingPoint(Number(lat), Number(lon)),
    ]);

    const signals = extractSignals(weatherRes.data, forecastRes.data, airRes.data);
    
    // Fetch global rules from database
    let dbRules = await prisma.rule.findMany();
    
    // Seed default rules if database is empty
    if (dbRules.length === 0) {
      console.log('Seeding default rules into the database...');
      await prisma.rule.createMany({
        data: defaultRules.map(rule => ({
          name: rule.name,
          signal: rule.signal,
          operator: rule.operator,
          threshold: rule.threshold,
          severity: rule.severity,
          message: rule.message,
          category: rule.category,
        })),
      });
      dbRules = await prisma.rule.findMany();
    }

    // Evaluate global rules (no zone tag)
    const globalInsights = evaluate(signals, dbRules as any);

    // Evaluate zone-specific rules
    const zoneSummaries: ZoneSummary[] = [];
    const zoneInsights: typeof globalInsights = [];

    if (matchingZones.length > 0) {
      // Fetch zone rules for all matching zones
      const zoneRules = await prisma.zoneRule.findMany({
        where: {
          zoneId: { in: matchingZones.map(z => z.id) },
        },
        include: { rule: true, zone: true },
      });

      // Evaluate zone-specific rules
      for (const zr of zoneRules) {
        const rule = zr.rule;
        const ruleForEval: RiskRule = {
          id: rule.id,
          name: rule.name,
          signal: rule.signal as any,
          operator: rule.operator as any,
          threshold: zr.thresholdOverride ?? rule.threshold,
          severity: rule.severity as any,
          message: rule.message,
          category: rule.category as any,
        };

        const zoneResult = evaluate(signals, [ruleForEval]);
        zoneResult.forEach(insight => {
          insight.zoneName = zr.zone.name;
          insight.zoneId = zr.zone.id;
        });
        zoneInsights.push(...zoneResult);
      }

      // Build zone summaries
      for (const zone of matchingZones) {
        zoneSummaries.push({
          id: zone.id,
          name: zone.name,
          type: zone.type as any,
          insightCount: zoneInsights.filter(i => i.zoneId === zone.id).length,
        });
      }
    }

    // Merge: zone insights first (they're location-specific), then global
    const allInsights = [...zoneInsights, ...globalInsights];

    res.json({
      current: weatherRes.data,
      forecast: forecastRes.data,
      airQuality: airRes.data,
      signals: signals,
      insights: allInsights,
      zones: zoneSummaries,
    });
  } catch (error: any) {
    console.error('Error fetching insights:', error.message);
    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch insights data',
      details: error.response?.data?.message || error.message,
    });
  }
});

// ─── Start Server ────────────────────────────────────────────────
async function startServer() {
  // Enable PostGIS extension
  await ensurePostGIS();

  // Seed default zones if table is empty
  const zoneCount = await prisma.zone.count();
  if (zoneCount === 0) {
    console.log('   Seeding default zones...');
    for (const zone of defaultZones) {
      await prisma.zone.create({ data: zone });
    }
    console.log(`   Seeded ${defaultZones.length} default zones.`);
  }

  app.listen(port, () => {
    console.log(`\n🧠 CAELUS Intelligence Layer running on http://localhost:${port}`);
    console.log(`   Health check: http://localhost:${port}/api/health`);
    console.log(`   Weather:      http://localhost:${port}/api/weather?lat=6.5&lon=3.4`);
    console.log(`   Insights:     http://localhost:${port}/api/insights?lat=6.5&lon=3.4`);
    console.log(`   Zones:        http://localhost:${port}/api/zones\n`);
  });
}

startServer().catch((err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});
