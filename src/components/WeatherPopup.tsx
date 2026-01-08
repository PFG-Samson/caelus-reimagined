// src/components/WeatherPopup.tsx
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, X, RefreshCcw, Sun, Cloud, CloudRain, Wind, Droplets, Gauge } from "lucide-react";
import { useSettings } from "@/context/SettingsContext";
import {
  convertTemperature,
  getTemperatureUnit,
  convertWindSpeed,
  getWindSpeedUnit,
  convertWindDirection,
  convertPressure,
  getPressureUnit,
  convertDistance,
  getDistanceUnit,
  formatTime
} from "@/lib/utils";

interface WeatherPopupProps {
  lat: number;
  lon: number;
  isOpen: boolean;
  onClose: () => void;
}

const OPENWEATHER_KEY = "659534d15f836bc0f7389edc9d7a1920";

interface WeatherData {
  temp: number;
  feels_like: number;
  humidity: number;
  pressure: number;
  wind_speed: number;
  wind_deg: number;
  weather: { description: string; icon: string; main: string }[];
  sunrise: number;
  sunset: number;
  visibility: number;
  timezone: number;
  name?: string;
}

const WeatherPopup: React.FC<WeatherPopupProps> = ({ lat, lon, isOpen, onClose }) => {
  const { state } = useSettings();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);

  /** Fetch weather data when lat/lon changes */
  const fetchWeather = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${OPENWEATHER_KEY}`
      );
      if (!res.ok) throw new Error("Failed to fetch weather data");

      const data = await res.json();
      setWeather({
        temp: data.main.temp,
        feels_like: data.main.feels_like,
        humidity: data.main.humidity,
        pressure: data.main.pressure,
        wind_speed: data.wind.speed,
        wind_deg: data.wind.deg,
        weather: data.weather,
        sunrise: data.sys.sunrise,
        sunset: data.sys.sunset,
        visibility: data.visibility,
        timezone: data.timezone,
        name: data.name,
      });
    } catch (err: any) {
      setError(err.message || "Error fetching weather data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchWeather();
  }, [lat, lon, isOpen]);

  // Weather condition → gradient mapping
  const getGradient = () => {
    if (!weather) return "from-gray-700 to-gray-900";

    const main = weather.weather[0].main.toLowerCase();
    if (main.includes("clear")) return "from-amber-500 to-sky-500";
    if (main.includes("cloud")) return "from-gray-500 to-gray-700";
    if (main.includes("rain")) return "from-blue-800 to-indigo-800";
    if (main.includes("snow")) return "from-blue-300 to-blue-500";
    return "from-gray-600 to-gray-800";
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className={`absolute z-[9999] w-80 max-w-[90vw] rounded-2xl shadow-2xl border border-white/10 p-4 backdrop-blur-xl bg-gradient-to-br ${getGradient()} text-white`}
          style={{
            left: "50%",
            top: "20px",
            transform: "translateX(-50%)",
          }}
        >
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm opacity-80">{weather?.name || `Lat: ${lat.toFixed(2)}, Lon: ${lon.toFixed(2)}`}</span>
            <button onClick={onClose} className="hover:scale-110 transition">
              <X size={18} />
            </button>
          </div>

          {loading ? (
            <div className="flex flex-col items-center py-6">
              <Loader2 className="animate-spin text-white/70" size={32} />
              <p className="mt-2 text-sm text-white/70">Loading weather...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center text-center">
              <p className="text-red-300 text-sm mb-2">{error}</p>
              <button
                onClick={fetchWeather}
                className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1 rounded-md"
              >
                Retry
              </button>
            </div>
          ) : weather ? (
            <div className="space-y-3">
              {/* Temperature & condition */}
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-4xl font-bold">
                    {Math.round(convertTemperature(weather.temp, state.units.temperature))}
                    {getTemperatureUnit(state.units.temperature)}
                  </h1>
                  <p className="text-sm opacity-90 capitalize">{weather.weather[0].description}</p>
                  <p className="text-xs opacity-70">
                    Feels like {Math.round(convertTemperature(weather.feels_like, state.units.temperature))}
                    {getTemperatureUnit(state.units.temperature)}
                  </p>
                </div>
                <img
                  src={`https://openweathermap.org/img/wn/${weather.weather[0].icon}@2x.png`}
                  alt={weather.weather[0].description}
                  className="h-16 w-16"
                />
              </div>

              {/* Secondary info */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <Droplets size={14}/> Humidity: {weather.humidity}%
                </div>
                <div className="flex items-center gap-1">
                  <Wind size={14}/> Wind: {convertWindSpeed(weather.wind_speed, state.units.windspeed).toFixed(1)} {getWindSpeedUnit(state.units.windspeed)}
                </div>
                <div className="flex items-center gap-1">
                  <Gauge size={14}/> Pressure: {convertPressure(weather.pressure, state.units.pressure).toFixed(1)} {getPressureUnit(state.units.pressure)}
                </div>
                <div>
                  Visibility: {convertDistance(weather.visibility, state.units.distance).toFixed(1)} {getDistanceUnit(state.units.distance)}
                </div>
              </div>

              {/* Sunrise & sunset */}
              <div className="flex justify-between text-xs opacity-80">
                <div>🌅 {formatTime(new Date(weather.sunrise * 1000), state.time.format, state.time.timezone)}</div>
                <div>🌇 {formatTime(new Date(weather.sunset * 1000), state.time.format, state.time.timezone)}</div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={fetchWeather}
                  className="bg-white/10 hover:bg-white/20 px-3 py-1 rounded-md flex items-center gap-1 text-xs"
                >
                  <RefreshCcw size={12} /> Refresh
                </button>
              </div>
            </div>
          ) : null}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WeatherPopup;
