import React from 'react';
import {
  Map,
  Satellite,
  CloudRain,
  Wind,
  Thermometer,
  Droplets,
  Gauge,
  Snowflake,
  SunMedium,
  Eye,
  Waves,
  WindIcon,
  ThermometerSun,
  ThermometerSnowflake,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

interface LayerSelectorProps {
  activeBasemap: string;
  onBasemapChange: (basemap: string) => void;
  activeWeatherLayers: string[];
  onWeatherLayerToggle: (layer: string) => void;
}

/**
 * LayerSelector Component
 * - Displays basemap and weather layer options
 * - Includes fade transition when changing basemap
 */
const LayerSelector: React.FC<LayerSelectorProps> = ({
  activeBasemap,
  onBasemapChange,
  activeWeatherLayers,
  onWeatherLayerToggle
}) => {
  // ────────────────────────────────
  // 🗺️ BASEMAPS
  // ────────────────────────────────
  const basemaps = [
    { id: 'openstreetmap', name: 'OpenStreetMap', icon: Map },
    { id: 'modis', name: 'NASA MODIS (Daily)', icon: Satellite },
    { id: 'viirs', name: 'NASA VIIRS (Daily)', icon: Satellite },
    { id: 'esri', name: 'ESRI Imagery', icon: Satellite },
  ];

  // ────────────────────────────────
  // 🌦️ WEATHER LAYERS
  // ────────────────────────────────
  const weatherLayers = [
    { id: 'temperature', name: 'Temperature', icon: Thermometer, color: 'text-weather-temp' },
    // { id: 'feels_like', name: 'Feels Like', icon: ThermometerSun, color: 'text-weather-temp' },
    // { id: 'dewpoint', name: 'Dew Point', icon: ThermometerSnowflake, color: 'text-weather-temp' },
    { id: 'wind', name: 'Wind', icon: Wind, color: 'text-weather-wind' },
    // { id: 'wind_gust', name: 'Wind Gusts', icon: WindIcon, color: 'text-weather-wind' },
    { id: 'clouds', name: 'Clouds', icon: Droplets, color: 'text-weather-humidity' },
    // { id: 'humidity', name: 'Humidity', icon: Waves, color: 'text-weather-humidity' },
    { id: 'precipitation', name: 'Precipitation', icon: CloudRain, color: 'text-weather-precip' },
    { id: 'snow', name: 'Snow', icon: Snowflake, color: 'text-sky-400' },
    { id: 'pressure', name: 'Pressure', icon: Gauge, color: 'text-weather-pressure' },
    // { id: 'visibility', name: 'Visibility', icon: Eye, color: 'text-slate-500' },
    // { id: 'uvi', name: 'UV Index', icon: SunMedium, color: 'text-yellow-500' },
  ];

  const activeBasemapData = basemaps.find(b => b.id === activeBasemap);
  const ActiveBasemapIcon = activeBasemapData?.icon || Map;

  // ────────────────────────────────
  // 💫 SMOOTH FADE TRANSITION
  // ────────────────────────────────
  const handleBasemapSwitch = (newBasemap: string) => {
    if (newBasemap === activeBasemap) return;

    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.background = 'rgba(0,0,0,0.3)';
    overlay.style.backdropFilter = 'blur(4px)';
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.5s ease-in-out';
    overlay.style.zIndex = '999';
    overlay.style.pointerEvents = 'none';
    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
    });

    setTimeout(() => {
      onBasemapChange(newBasemap);
      overlay.style.opacity = '0';
    }, 250);

    setTimeout(() => {
      document.body.removeChild(overlay);
    }, 800);
  };

  // ────────────────────────────────
  // 🔁 WEATHER LAYER TOGGLE HANDLER
  // ────────────────────────────────
  const handleWeatherClick = (layerId: string) => {
    if (activeWeatherLayers.includes(layerId)) {
      onWeatherLayerToggle(layerId);
    } else {
      activeWeatherLayers.forEach(l => {
        if (l !== layerId) onWeatherLayerToggle(l);
      });
      onWeatherLayerToggle(layerId);
    }
  };

  // ────────────────────────────────
  // 🌍 RENDER
  // ────────────────────────────────
  return (
    <div className="absolute top-20 left-4 z-40 w-30 space-y-3 pointer-events-none">
      {/* Basemap Selector Dropdown */}
      <div className="weather-panel pointer-events-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" className="layer-button w-full justify-between">
              <div className="flex items-center gap-2">
                <ActiveBasemapIcon className="h-4 w-4" />
                <span>Map Imagery</span>
              </div>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48 weather-panel">
            {basemaps.map((basemap) => {
              const Icon = basemap.icon;
              const isActive = activeBasemap === basemap.id;

              return (
                <DropdownMenuItem
                  key={basemap.id}
                  onClick={() => handleBasemapSwitch(basemap.id)}
                  className={`flex items-center gap-2 ${isActive ? 'bg-primary/20 text-primary' : ''
                    }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{basemap.name}</span>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Weather Layer Buttons */}
      <div className="weather-panel pointer-events-auto flex flex-col gap-1 p-2 rounded-md bg-background/60 backdrop-blur-md">
        {weatherLayers.map((layer) => {
          const Icon = layer.icon;
          const isActive = activeWeatherLayers.includes(layer.id);

          return (
            <Button
              key={layer.id}
              size="sm"
              variant={isActive ? 'default' : 'secondary'}
              onClick={() => handleWeatherClick(layer.id)}
              className={`flex items-center justify-start gap-2 w-full text-sm py-1 h-8 transition-all ${isActive ? 'ring-2 ring-primary/40 bg-primary/10 text-primary' : ''
                }`}
            >
              <Icon className={`h-3.5 w-3.5 ${layer.color}`} />
              <span>{layer.name}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
};

export default LayerSelector;
