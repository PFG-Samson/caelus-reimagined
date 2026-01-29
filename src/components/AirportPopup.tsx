// src/components/AirportPopup.tsx
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, X, RefreshCcw, Plane, Wind, Droplets, Gauge, MapPin, Navigation } from "lucide-react";
import { useSettings } from "@/context/SettingsContext";
import { airportService, type Airport } from "@/services/airportService";
import {
    convertTemperature,
    getTemperatureUnit,
    convertWindSpeed,
    getWindSpeedUnit,
    convertPressure,
    getPressureUnit,
    formatTime
} from "@/lib/utils";

interface AirportPopupProps {
    airport: Airport;
    isOpen: boolean;
    onClose: () => void;
}

const OPENWEATHER_KEY = import.meta.env.VITE_OPENWEATHER_KEY;

interface AirportWeatherData {
    temp: number;
    feels_like: number;
    humidity: number;
    pressure: number;
    wind_speed: number;
    wind_deg: number;
    weather: { description: string; icon: string; main: string }[];
}

const AirportPopup: React.FC<AirportPopupProps> = ({ airport, isOpen, onClose }) => {
    const { state } = useSettings();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [weather, setWeather] = useState<AirportWeatherData | null>(null);

    const fetchWeather = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(
                `https://api.openweathermap.org/data/2.5/weather?lat=${airport.lat}&lon=${airport.lon}&units=metric&appid=${OPENWEATHER_KEY}`
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
            });
        } catch (err: any) {
            setError(err.message || "Error fetching weather data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) fetchWeather();
    }, [airport.lat, airport.lon, isOpen]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ x: 300, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 300, opacity: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                    className="fixed right-4 top-20 z-[100] w-80 max-w-[90vw] rounded-2xl shadow-2xl border border-white/10 overflow-hidden backdrop-blur-xl bg-slate-900/90 text-white"
                >
                    {/* Header */}
                    <div className="bg-blue-600 p-4 flex justify-between items-start">
                        <div className="flex items-center gap-2">
                            <Plane className={airport.type === 'large_airport' ? "text-yellow-400" : "text-white"} size={20} />
                            <div>
                                <h3 className="font-bold text-lg leading-tight">{airport.name}</h3>
                                <p className="text-xs opacity-80">{airport.type === 'large_airport' ? 'International Airport' : 'Medium Airport'}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full transition">
                            <X size={18} />
                        </button>
                    </div>

                    <div className="p-4 space-y-4">
                        {/* Codes & Elevation */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white/5 p-2 rounded-lg border border-white/10">
                                <p className="text-[10px] uppercase opacity-60">ICAO / IATA</p>
                                <p className="font-mono font-bold">{airport.icao || '---'} / {airport.iata || '---'}</p>
                            </div>
                            <div className="bg-white/5 p-2 rounded-lg border border-white/10">
                                <p className="text-[10px] uppercase opacity-60">Elevation</p>
                                <p className="font-bold">{airport.elev} ft</p>
                            </div>
                        </div>

                        {/* Weather Section */}
                        <div className="border-t border-white/10 pt-4">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-sm font-semibold flex items-center gap-1">
                                    <Wind size={14} className="text-blue-400" />
                                    Current Weather
                                </h4>
                                <button onClick={fetchWeather} disabled={loading} className="hover:rotate-180 transition-transform duration-500">
                                    <RefreshCcw size={14} className={loading ? "animate-spin" : ""} />
                                </button>
                            </div>

                            {loading ? (
                                <div className="flex items-center justify-center py-4">
                                    <Loader2 className="animate-spin opacity-50" size={24} />
                                </div>
                            ) : error ? (
                                <p className="text-xs text-red-400 py-2">{error}</p>
                            ) : weather ? (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <span className="text-3xl font-bold">
                                                {Math.round(convertTemperature(weather.temp, state.units.temperature))}°
                                                <span className="text-lg font-normal">{getTemperatureUnit(state.units.temperature)}</span>
                                            </span>
                                            <p className="text-xs opacity-70 capitalize">{weather.weather[0].description}</p>
                                        </div>
                                        <img
                                            src={`https://openweathermap.org/img/wn/${weather.weather[0].icon}@2x.png`}
                                            alt="weather"
                                            className="w-12 h-12"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div className="flex items-center gap-1 opacity-80">
                                            <Wind size={12} /> {convertWindSpeed(weather.wind_speed, state.units.windspeed).toFixed(1)} {getWindSpeedUnit(state.units.windspeed)}
                                        </div>
                                        <div className="flex items-center gap-1 opacity-80">
                                            <Droplets size={12} /> {weather.humidity}%
                                        </div>
                                        <div className="flex items-center gap-1 opacity-80">
                                            <Gauge size={12} /> {convertPressure(weather.pressure, state.units.pressure).toFixed(0)} {getPressureUnit(state.units.pressure)}
                                        </div>
                                        <div className="flex items-center gap-1 opacity-80">
                                            <Navigation size={12} style={{ transform: `rotate(${weather.wind_deg}deg)` }} /> {weather.wind_deg}°
                                        </div>
                                    </div>
                                </div>
                            ) : null}
                        </div>

                        {/* Location Info */}
                        <div className="bg-blue-900/30 p-3 rounded-xl flex items-center gap-3">
                            <div className="bg-blue-500/20 p-2 rounded-full">
                                <MapPin size={16} className="text-blue-400" />
                            </div>
                            <div className="text-[11px]">
                                <p className="opacity-60 uppercase">Coordinates</p>
                                <p className="font-mono">{airport.lat.toFixed(4)}, {airport.lon.toFixed(4)}</p>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default AirportPopup;
