import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import { z } from 'zod';
import { extractSignals } from './engine/signals';
import { defaultRules } from './engine/rules';
import { evaluate } from './engine/evaluator';
import { ensurePostGIS, findZonesContainingPoint } from './engine/spatial';
import { defaultZones } from './engine/defaultZones';
import rulesRouter from './routes/rules';
import zonesRouter from './routes/zones';
import { PrismaClient } from '@prisma/client';
import type { RiskRule, ZoneSummary } from './engine/types';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;
const OPENWEATHER_KEY = process.env.OPENWEATHER_KEY;
const prisma = new PrismaClient();

if (!OPENWEATHER_KEY) {
  console.error('❌ OPENWEATHER_KEY is not set in .env');
  process.exit(1);
}

const FRONTEND_URL = process.env.FRONTEND_URL;
if (FRONTEND_URL) {
  app.use(cors({ origin: FRONTEND_URL }));
} else {
  app.use(cors());
}
app.use(express.json());

// In‑memory cache for insights
const insightsCache = new Map<string, { data: any; expires: number }>();

// Updated error response format
// Weather endpoint
app.get('/api/weather', async (req, res) => {
  const { lat, lon, units = 'metric' } = req.query;
  if (!lat || !lon) {
    return res.status(400).json({ error: { code: 'MISSING_PARAMS', message: 'lat and lon query parameters are required' } });
  }
  try {
    const response = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
      params: { lat, lon, units, appid: OPENWEATHER_KEY },
    });
    res.json(response.data);
  } catch (error: any) {
    console.error('Error fetching weather:', error.message);
    res.status(error.response?.status || 500).json({
      error: { code: 'WEATHER_FETCH_ERROR', message: 'Failed to fetch weather data' },
      details: error.response?.data?.message || error.message,
    });
  }
});

// Forecast endpoint
app.get('/api/forecast', async (req, res) => {
  const { lat, lon, units = 'metric' } = req.query;
  if (!lat || !lon) {
    return res.status(400).json({ error: { code: 'MISSING_PARAMS', message: 'lat and lon query parameters are required' } });
  }
  try {
    const response = await axios.get('https://api.openweathermap.org/data/2.5/forecast', {
      params: { lat, lon, units, appid: OPENWEATHER_KEY },
    });
    res.json(response.data);
  } catch (error: any) {
    console.error('Error fetching forecast:', error.message);
    res.status(error.response?.status || 500).json({
      error: { code: 'FORECAST_FETCH_ERROR', message: 'Failed to fetch forecast data' },
      details: error.response?.data?.message || error.message,
    });
  }
});

// Air Quality endpoint
app.get('/api/air-quality', async (req, res) => {
  const { lat, lon } = req.query;
  if (!lat || !lon) {
    return res.status(400).json({ error: { code: 'MISSING_PARAMS', message: 'lat and lon query parameters are required' } });
  }
  try {
    const response = await axios.get('https://api.openweathermap.org/data/2.5/air_pollution', {
      params: { lat, lon, appid: OPENWEATHER_KEY },
    });
    res.json(response.data);
  } catch (error: any) {
    console.error('Error fetching air quality:', error.message);
    res.status(error.response?.status || 500).json({
      error: { code: 'AIR_QUALITY_FETCH_ERROR', message: 'Failed to fetch air quality data' },
      details: error.response?.data?.message || error.message,
    });
  }
});

// Tile endpoint (proxy OpenWeather map tiles)
app.get('/api/tiles/:layer/:z/:x/:y', async (req, res) => {
  const { layer, z, x, y } = req.params;
  try {
    const response = await axios.get(`https://tile.openweathermap.org/map/${layer}/${z}/${x}/${y}.png`, {
      params: { appid: OPENWEATHER_KEY },
      responseType: 'arraybuffer',
    });
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=600'); // cache 10 min
    res.send(response.data);
  } catch (error: any) {
    console.error('Error fetching tile:', error.message);
    res.status(error.response?.status || 500).json({
      error: { code: 'TILE_FETCH_ERROR', message: 'Failed to fetch map tile' },
      details: error.response?.data?.message || error.message,
    });
  }
});

// Mount CRUD routers
app.use('/api/rules', rulesRouter);
app.use('/api/zones', zonesRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'caelus-intelligence-layer', timestamp: new Date().toISOString() });
});

// Insights endpoint – combines weather, forecast, air quality and zone‑aware rule evaluation
app.get('/api/insights', async (req, res) => {
  const schema = z.object({
    lat: z.coerce.number().min(-90, { message: 'Latitude must be >= -90' }).max(90, { message: 'Latitude must be <= 90' }),
    lon: z.coerce.number().min(-180, { message: 'Longitude must be >= -180' }).max(180, { message: 'Longitude must be <= 180' }),
    units: z.enum(['metric', 'imperial']).default('metric'),
    force: z.preprocess((v) => (v === 'true' ? true : false), z.boolean()).optional(),
  });
  const parseResult = schema.safeParse(req.query);
  if (!parseResult.success) {
    return res.status(400).json({
      error: { code: 'INVALID_PARAMS', message: parseResult.error.errors.map(e => e.message).join('; ') },
    });
  }
  const { lat, lon, units, force } = parseResult.data;
  const cacheKey = `${lat}-${lon}-${units}`;
  if (!force && insightsCache.has(cacheKey)) {
    const cached = insightsCache.get(cacheKey)!;
    if (Date.now() < cached.expires) {
      return res.json(cached.data);
    }
    insightsCache.delete(cacheKey);
  }
  try {
    const [weatherRes, forecastRes, airRes, matchingZones] = await Promise.all([
      axios.get('https://api.openweathermap.org/data/2.5/weather', { params: { lat, lon, units, appid: OPENWEATHER_KEY } }),
      axios.get('https://api.openweathermap.org/data/2.5/forecast', { params: { lat, lon, units, appid: OPENWEATHER_KEY } }),
      axios.get('https://api.openweathermap.org/data/2.5/air_pollution', { params: { lat, lon, appid: OPENWEATHER_KEY } }),
      findZonesContainingPoint(Number(lat), Number(lon)),
    ]);
    const signals = extractSignals(weatherRes.data, forecastRes.data, airRes.data);
    // Ensure baseline rules exist
    let dbRules = await prisma.rule.findMany();
    if (dbRules.length === 0) {
      await prisma.rule.createMany({ data: defaultRules.map(r => ({
        name: r.name,
        signal: r.signal,
        operator: r.operator,
        threshold: r.threshold,
        severity: r.severity,
        message: r.message,
        category: r.category,
      })) });
      dbRules = await prisma.rule.findMany();
    }
    const globalInsights = evaluate(signals, dbRules as any);
    const zoneSummaries: ZoneSummary[] = [];
    const zoneInsights: typeof globalInsights = [];
    if (matchingZones.length > 0) {
      const zoneRules = await prisma.zoneRule.findMany({
        where: { zoneId: { in: matchingZones.map(z => z.id) } },
        include: { rule: true, zone: true },
      });
      for (const zr of zoneRules) {
        const ruleForEval: RiskRule = {
          id: zr.rule.id,
          name: zr.rule.name,
          signal: zr.rule.signal as any,
          operator: zr.rule.operator as any,
          threshold: zr.thresholdOverride ?? zr.rule.threshold,
          severity: zr.rule.severity as any,
          message: zr.rule.message,
          category: zr.rule.category as any,
        };
        const zoneResult = evaluate(signals, [ruleForEval]);
        zoneResult.forEach(insight => {
          insight.zoneName = zr.zone.name;
          insight.zoneId = zr.zone.id;
        });
        zoneInsights.push(...zoneResult);
      }
      for (const zone of matchingZones) {
        zoneSummaries.push({
          id: zone.id,
          name: zone.name,
          type: zone.type as any,
          insightCount: zoneInsights.filter(i => i.zoneId === zone.id).length,
        });
      }
    }
    const allInsights = [...zoneInsights, ...globalInsights];
    const responsePayload = {
      current: weatherRes.data,
      forecast: forecastRes.data,
      airQuality: airRes.data,
      signals,
      insights: allInsights,
      zones: zoneSummaries,
    };
    insightsCache.set(cacheKey, { data: responsePayload, expires: Date.now() + 5 * 60 * 1000 });
    return res.json(responsePayload);
  } catch (error: any) {
    const status = error.response?.status || 500;
    const details = error.response?.data?.message || error.message;
    return res.status(status).json({
      error: { code: 'INSIGHTS_FETCH_ERROR', message: 'Failed to fetch insights data', details },
    });
  }
});

// Start server
async function startServer() {
  await ensurePostGIS();
  // Seed default zones if none exist
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
    console.log(`   Weather: http://localhost:${port}/api/weather?lat=6.5&lon=3.4`);
    console.log(`   Insights: http://localhost:${port}/api/insights?lat=6.5&lon=3.4`);
    console.log(`   Zones: http://localhost:${port}/api/zones`);
  });
}

startServer().catch(err => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});
