import { WeatherSignal } from './types';

export function extractSignals(
  current: any,
  forecast: any,
  airQuality: any
): WeatherSignal[] {
  const signals: WeatherSignal[] = [];

  if (!current) return signals;

  // Temperature (C)
  if (current.main?.temp !== undefined) {
    signals.push({ name: 'temperature', value: current.main.temp, unit: '°C' });
  }
  if (current.main?.feels_like !== undefined) {
    signals.push({ name: 'feels_like', value: current.main.feels_like, unit: '°C' });
  }

  // Humidity (%)
  if (current.main?.humidity !== undefined) {
    signals.push({ name: 'humidity', value: current.main.humidity, unit: '%' });
  }

  // Pressure (hPa)
  if (current.main?.pressure !== undefined) {
    signals.push({ name: 'pressure', value: current.main.pressure, unit: 'hPa' });
  }

  // Wind (m/s -> km/h)
  if (current.wind?.speed !== undefined) {
    // OpenWeather returns speed in m/s (metric) or mph (imperial).
    // Assuming 'metric' is requested, so we convert m/s to km/h.
    signals.push({ name: 'wind_speed', value: current.wind.speed * 3.6, unit: 'km/h' });
  }
  if (current.wind?.gust !== undefined) {
    signals.push({ name: 'wind_gust', value: current.wind.gust * 3.6, unit: 'km/h' });
  }

  // Visibility (m -> km)
  if (current.visibility !== undefined) {
    signals.push({ name: 'visibility', value: current.visibility / 1000, unit: 'km' });
  }

  // Cloudiness (%)
  if (current.clouds?.all !== undefined) {
    signals.push({ name: 'cloudiness', value: current.clouds.all, unit: '%' });
  }

  // Rain (mm)
  if (current.rain?.['1h'] !== undefined) {
    signals.push({ name: 'rainfall_1h', value: current.rain['1h'], unit: 'mm' });
  }
  if (current.rain?.['3h'] !== undefined) {
    signals.push({ name: 'rainfall_3h', value: current.rain['3h'], unit: 'mm' });
  }

  // Snow (mm)
  if (current.snow?.['1h'] !== undefined) {
    signals.push({ name: 'snowfall_1h', value: current.snow['1h'], unit: 'mm' });
  }

  // Air Quality Index (1-5)
  if (airQuality?.list?.[0]?.main?.aqi !== undefined) {
    signals.push({ name: 'air_quality_index', value: airQuality.list[0].main.aqi, unit: 'AQI' });
  }

  return signals;
}
