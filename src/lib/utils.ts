import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Unit conversion utilities

// Temperature conversions (from Celsius)
export function convertTemperature(celsius: number, unit: 'C' | 'F'): number {
  if (unit === 'F') {
    return (celsius * 9/5) + 32;
  }
  return celsius;
}

export function getTemperatureUnit(unit: 'C' | 'F'): string {
  return unit === 'C' ? '°C' : '°F';
}

// Wind speed conversions (from m/s)
export function convertWindSpeed(ms: number, unit: 'km/h' | 'm/s' | 'mph' | 'knots' | 'bft'): number {
  switch (unit) {
    case 'km/h':
      return ms * 3.6;
    case 'mph':
      return ms * 2.237;
    case 'knots':
      return ms * 1.944;
    case 'bft': // Beaufort scale
      return Math.round(Math.pow(ms / 0.836, 2/3));
    case 'm/s':
    default:
      return ms;
  }
}

export function getWindSpeedUnit(unit: 'km/h' | 'm/s' | 'mph' | 'knots' | 'bft'): string {
  return unit;
}

// Wind direction conversions
export function convertWindDirection(degrees: number, unit: 'compass' | 'degrees'): string {
  if (unit === 'degrees') {
    return `${Math.round(degrees)}°`;
  }
  
  // Convert to compass direction
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}

// Pressure conversions (from hPa)
export function convertPressure(hpa: number, unit: 'hPa' | 'mb' | 'mmHg' | 'inHg'): number {
  switch (unit) {
    case 'mb':
      return hpa; // mb and hPa are equivalent
    case 'mmHg':
      return hpa * 0.750062;
    case 'inHg':
      return hpa * 0.02953;
    case 'hPa':
    default:
      return hpa;
  }
}

export function getPressureUnit(unit: 'hPa' | 'mb' | 'mmHg' | 'inHg'): string {
  return unit;
}

// Distance conversions (from meters)
export function convertDistance(meters: number, unit: 'km' | 'miles' | 'nautical'): number {
  switch (unit) {
    case 'km':
      return meters / 1000;
    case 'miles':
      return meters / 1609.34;
    case 'nautical':
      return meters / 1852;
    default:
      return meters / 1000;
  }
}

export function getDistanceUnit(unit: 'km' | 'miles' | 'nautical'): string {
  switch (unit) {
    case 'miles':
      return 'mi';
    case 'nautical':
      return 'nm';
    case 'km':
    default:
      return 'km';
  }
}

// Time formatting utilities
export function formatTime(date: Date, format: '12h' | '24h', timezone: 'local' | 'utc'): string {
  const options: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: format === '12h',
    timeZone: timezone === 'utc' ? 'UTC' : undefined
  };
  return date.toLocaleTimeString('en-US', options);
}

export function formatDate(date: Date, timezone: 'local' | 'utc'): string {
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: timezone === 'utc' ? 'UTC' : undefined
  };
  return date.toLocaleDateString('en-US', options);
}
