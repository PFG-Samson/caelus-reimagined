import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';

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
// Combined endpoint: returns weather + forecast + air quality + insights
// Insights are empty for Phase 1 — will be populated by the Rule Engine in Phase 2
app.get('/api/insights', async (req, res) => {
  const { lat, lon, units = 'metric' } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({ error: 'lat and lon query parameters are required' });
  }

  try {
    const [weatherRes, forecastRes, airRes] = await Promise.all([
      axios.get('https://api.openweathermap.org/data/2.5/weather', {
        params: { lat, lon, units, appid: OPENWEATHER_KEY },
      }),
      axios.get('https://api.openweathermap.org/data/2.5/forecast', {
        params: { lat, lon, units, appid: OPENWEATHER_KEY },
      }),
      axios.get('https://api.openweathermap.org/data/2.5/air_pollution', {
        params: { lat, lon, appid: OPENWEATHER_KEY },
      }),
    ]);

    res.json({
      current: weatherRes.data,
      forecast: forecastRes.data,
      airQuality: airRes.data,
      // Phase 2: insights will be populated by the Rule Engine
      insights: [],
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
app.listen(port, () => {
  console.log(`\n🧠 CAELUS Intelligence Layer running on http://localhost:${port}`);
  console.log(`   Health check: http://localhost:${port}/api/health`);
  console.log(`   Weather:      http://localhost:${port}/api/weather?lat=6.5&lon=3.4`);
  console.log(`   Insights:     http://localhost:${port}/api/insights?lat=6.5&lon=3.4\n`);
});
