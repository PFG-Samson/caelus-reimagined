// src/components/Globe3D.tsx
import React, { useEffect, useRef, forwardRef, useImperativeHandle, useState, useCallback } from 'react';
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import { X, Sparkles } from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';
import { weatherAI, type WeatherSummaryInput } from '@/lib/aiService';
import {
  convertTemperature,
  getTemperatureUnit,
  convertWindSpeed,
  getWindSpeedUnit,
  convertWindDirection,
  convertPressure,
  getPressureUnit,
  formatTime
} from '@/lib/utils';
import { airportService, type Airport } from '@/services/airportService';

// Cesium Ion access token
Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_TOKEN;

const OPENWEATHER_KEY = import.meta.env.VITE_OPENWEATHER_KEY;

const weatherCache = new Map<string, { timestamp: number; payload: any }>();
const CACHE_TTL_MS = 1000 * 60 * 5;

interface Globe3DProps {
  activeBasemap: string;
  activeWeatherLayers: string[];
  currentDate: Date;
  onCoordinatesChange: (lat: number, lng: number) => void;
  showAirports: boolean;
  onAirportClick: (airport: Airport) => void;
  onWeatherPanelOpen?: () => void;
}

export interface Globe3DRef {
  flyTo: (lat: number, lng: number, zoom?: number) => void;
  searchAndShowWeather: (lat: number, lng: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomToUserLocation: () => void;
  closeWeatherPanel: () => void;
}

const Globe3D = forwardRef<Globe3DRef, Globe3DProps>(
  ({ activeBasemap, activeWeatherLayers, currentDate, onCoordinatesChange, showAirports, onAirportClick, onWeatherPanelOpen }, ref) => {
    const { state } = useSettings();
    const cesiumContainer = useRef<HTMLDivElement>(null);
    const viewer = useRef<Cesium.Viewer | null>(null);
    const weatherImageryLayers = useRef<Map<string, Cesium.ImageryLayer>>(new Map());
    const locationMarker = useRef<Cesium.Entity | null>(null);
    const airportEntities = useRef<Cesium.Entity[]>([]);

    const [weatherPanelOpen, setWeatherPanelOpen] = useState(false);
    const [weatherPayload, setWeatherPayload] = useState<any | null>(null);
    const [weatherLoading, setWeatherLoading] = useState(false);
    const [weatherError, setWeatherError] = useState<string | null>(null);
    const [weatherSummary, setWeatherSummary] = useState<string | null>(null);
    const [summaryLoading, setSummaryLoading] = useState(false);

    useEffect(() => {
      if (!cesiumContainer.current || viewer.current) return;

      // Initialize Cesium Viewer with default imagery (includes labels)
      viewer.current = new Cesium.Viewer(cesiumContainer.current, {
        animation: false,
        baseLayerPicker: false,
        fullscreenButton: false,
        geocoder: false,
        homeButton: false,
        infoBox: false,
        sceneModePicker: false,
        selectionIndicator: false,
        timeline: false,
        navigationHelpButton: false,
        shouldAnimate: true,
      });

      // Enable lighting for realistic globe
      viewer.current.scene.globe.enableLighting = true;

      // 🏙️ Initial Labels Overlay (Optional/Static)
      // Note: We handle dynamic labels in the activeBasemap effect

      // Track mouse movement for coordinates
      const handler = new Cesium.ScreenSpaceEventHandler(viewer.current.scene.canvas);
      handler.setInputAction((movement: any) => {
        const cartesian = viewer.current!.camera.pickEllipsoid(
          movement.endPosition,
          viewer.current!.scene.globe.ellipsoid
        );
        if (cartesian) {
          const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
          const lat = Cesium.Math.toDegrees(cartographic.latitude);
          const lng = Cesium.Math.toDegrees(cartographic.longitude);
          onCoordinatesChange(lat, lng);
        }
      }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

      // Handle click to show weather
      handler.setInputAction(async (click: any) => {
        const cartesian = viewer.current!.camera.pickEllipsoid(
          click.position,
          viewer.current!.scene.globe.ellipsoid
        );
        if (cartesian) {
          const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
          const lat = Cesium.Math.toDegrees(cartographic.latitude);
          const lng = Cesium.Math.toDegrees(cartographic.longitude);

          // Add marker at clicked location
          if (locationMarker.current) {
            viewer.current!.entities.remove(locationMarker.current);
          }
          locationMarker.current = viewer.current!.entities.add({
            position: cartesian,
            point: {
              pixelSize: 10,
              color: Cesium.Color.YELLOW,
              outlineColor: Cesium.Color.WHITE,
              outlineWidth: 2,
            },
          });

          // Fetch and display weather
          setWeatherPayload(null);
          setWeatherError(null);
          setWeatherSummary(null);
          setWeatherLoading(true);
          setWeatherPanelOpen(true);
          onWeatherPanelOpen?.();

          const payload = await fetchWeather(lat, lng);
          setWeatherLoading(false);

          if (payload) {
            setWeatherPayload(payload);
            setWeatherError(null);

            // Generate AI summary in the background
            setSummaryLoading(true);
            try {
              const summary = await generateWeatherSummary(payload);
              setWeatherSummary(summary);
            } catch (error) {
              console.error('AI summary generation failed:', error);
              setWeatherSummary("AI summary temporarily unavailable.");
            } finally {
              setSummaryLoading(false);
            }
          }
        }
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

      return () => {
        if (viewer.current) {
          viewer.current.destroy();
          viewer.current = null;
        }
      };
    }, [onCoordinatesChange]);

    // Helper for GIBS URLs
    const gibUrl = (layerId: string, dateStr: string) =>
      `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${layerId}/default/${dateStr}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`;

    // Helper function to get weather tile URL
    const getWeatherTileUrl = (layerId: string): string | null => {
      // Format date for GIBS API (YYYY-MM-DD)
      const dateStr = currentDate.toISOString().split("T")[0];

      const owmMap: Record<string, string> = {
        temperature: `https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=${OPENWEATHER_KEY}`,
        precipitation: `https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${OPENWEATHER_KEY}`,
        wind: `https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=${OPENWEATHER_KEY}`,
        pressure: `https://tile.openweathermap.org/map/pressure_new/{z}/{x}/{y}.png?appid=${OPENWEATHER_KEY}`,
        clouds: `https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${OPENWEATHER_KEY}`,
        snow: `https://tile.openweathermap.org/map/snow_new/{z}/{x}/{y}.png?appid=${OPENWEATHER_KEY}`,
        wind_gust: `https://tile.openweathermap.org/map/wind_gust/{z}/{x}/{y}.png?appid=${OPENWEATHER_KEY}`,

        // Add GIBS layers support
        modis: gibUrl("MODIS_Terra_CorrectedReflectance_TrueColor", dateStr),
        viirs: gibUrl("VIIRS_SNPP_CorrectedReflectance_TrueColor", dateStr),
      };
      return owmMap[layerId] || null;
    };

    // Fetch weather data
    const generateWeatherSummary = async (weatherData: any): Promise<string> => {
      const current = weatherData.current;
      const forecast = weatherData.forecast;
      const airQuality = weatherData.airQuality;

      const summaryInput: WeatherSummaryInput = {
        current: {
          temp: current.main.temp,
          conditions: current.weather[0]?.description || 'unknown',
          windSpeed: current.wind?.speed || 0,
          humidity: current.main.humidity,
          pressure: current.main.pressure,
          location: current.name || 'Unknown location'
        },
        forecast: forecast?.list?.slice(0, 5).map((item: any) => {
          const date = new Date(item.dt * 1000);
          const hours = date.getHours();
          const timeLabel = hours === 0 ? 'midnight' : hours === 12 ? 'noon' : hours < 12 ? `${hours}am` : `${hours - 12}pm`;
          return {
            date: `${date.toLocaleDateString()} ${timeLabel}`,
            temp: item.main.temp,
            conditions: item.weather[0]?.description || 'unknown'
          };
        }),
        airQuality: airQuality?.list?.[0] ? {
          aqi: airQuality.list[0].main.aqi,
          pm25: airQuality.list[0].components.pm2_5,
          pm10: airQuality.list[0].components.pm10
        } : undefined
      };

      try {
        return await weatherAI.generateWeatherSummary(summaryInput);
      } catch (error) {
        console.error("AI summary error:", error);
        return "Weather summary temporarily unavailable.";
      }
    };

    const fetchWeather = useCallback(async (lat: number, lon: number) => {
      const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
      const now = Date.now();
      const cached = weatherCache.get(key);
      if (cached && now - cached.timestamp < CACHE_TTL_MS) {
        return cached.payload;
      }

      setWeatherLoading(true);
      setWeatherError(null);

      try {
        const currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_KEY}&units=metric`;
        const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_KEY}&units=metric`;
        const airUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_KEY}`;

        const [curRes, foreRes, airRes] = await Promise.all([
          fetch(currentUrl),
          fetch(forecastUrl),
          fetch(airUrl),
        ]);

        const curText = await curRes.text();
        const foreText = await foreRes.text();
        const airText = await airRes.text();

        if (!curRes.ok) throw new Error(JSON.parse(curText)?.message || `OpenWeather current error ${curRes.status}`);
        if (!foreRes.ok) throw new Error(JSON.parse(foreText)?.message || `OpenWeather forecast error ${foreRes.status}`);
        if (!airRes.ok) throw new Error(JSON.parse(airText)?.message || `OpenWeather AQI error ${airRes.status}`);

        const current = JSON.parse(curText);
        const forecast = JSON.parse(foreText);
        const airQuality = JSON.parse(airText);

        const payload = { current, forecast, airQuality };
        weatherCache.set(key, { timestamp: now, payload });
        return payload;
      } catch (err: any) {
        console.error("[Globe3D] fetchWeather error:", err);
        setWeatherError(err?.message || "Failed to fetch weather");
        return null;
      } finally {
        setWeatherLoading(false);
      }
    }, []);

    const closeWeatherPanel = () => {
      setWeatherPanelOpen(false);
      if (locationMarker.current && viewer.current) {
        viewer.current.entities.remove(locationMarker.current);
        locationMarker.current = null;
      }
    };

    const renderWeatherPanelContent = () => {
      if (weatherLoading) return <div className="flex-1 flex items-center justify-center">Loading weather…</div>;
      if (weatherError) return <div className="flex-1 p-4 text-sm">Error: {weatherError}</div>;
      if (!weatherPayload) return <div className="flex-1 p-4 text-sm">Click on the globe to load weather for a location.</div>;

      const c = weatherPayload.current;
      const f = weatherPayload.forecast;
      const aq = weatherPayload.airQuality?.list?.[0];
      const temp = Math.round(c.main.temp);
      const feels = Math.round(c.main.feels_like);
      const desc = (c.weather?.[0]?.description || "").toLowerCase();
      const icon = c.weather?.[0]?.icon || "01d";
      const iconUrl = `https://openweathermap.org/img/wn/${icon}@2x.png`;
      const humidity = c.main.humidity;
      const pressure = c.main.pressure;
      const windSpeed = c.wind?.speed ?? 0;
      const windDeg = c.wind?.deg ?? 0;
      const city = c.name || "Unknown location";

      const hourly = Array.isArray(f?.list) ? f.list.slice(0, 6) : [];
      const hourlyEls = hourly.map((it: any, idx: number) => {
        const t = new Date(it.dt * 1000);
        const time = formatTime(t, state.time.format, state.time.timezone);
        const itIcon = it.weather?.[0]?.icon || "01d";
        const tempConverted = Math.round(convertTemperature(it.main.temp, state.units.temperature));
        return (
          <div key={idx} className="flex flex-col items-center min-w-[64px] px-1 text-white">
            <div className="text-xs opacity-90">{time}</div>
            <img src={`https://openweathermap.org/img/wn/${itIcon}.png`} alt="" className="w-7 h-7" />
            <div className="font-semibold mt-1">{tempConverted}{getTemperatureUnit(state.units.temperature)}</div>
          </div>
        );
      });

      const dailyMap: Record<string, { temps: number[]; icons: string[] }> = {};
      if (Array.isArray(f?.list)) {
        f.list.forEach((it: any) => {
          const day = it.dt_txt.split(" ")[0];
          if (!dailyMap[day]) dailyMap[day] = { temps: [], icons: [] };
          dailyMap[day].temps.push(it.main.temp);
          if (it.weather?.[0]?.icon) dailyMap[day].icons.push(it.weather[0].icon);
        });
      }
      const todayKey = new Date().toISOString().split("T")[0];
      const dailyEntries = Object.keys(dailyMap).filter(k => k !== todayKey).slice(0, 3).map(k => {
        const d = dailyMap[k];
        const avgCelsius = d.temps.reduce((a, b) => a + b, 0) / d.temps.length;
        const avg = Math.round(convertTemperature(avgCelsius, state.units.temperature));
        const iconPick = d.icons[Math.floor(d.icons.length / 2)] || "01d";
        const weekday = new Date(k).toLocaleDateString([], { weekday: "short" });
        return { day: weekday, avg, icon: iconPick };
      });

      let gradient = "linear-gradient(135deg, rgba(6,6,23,0.95), rgba(18,24,33,0.9))";
      if (desc.includes("rain") || desc.includes("drizzle")) gradient = "linear-gradient(135deg,#0f172a,#1e3a8a)";
      else if (desc.includes("cloud")) gradient = "linear-gradient(135deg,#334155,#475569)";
      else if (desc.includes("clear") || desc.includes("sun")) gradient = "linear-gradient(135deg,#f59e0b,#3b82f6)";

      return (
        <div style={{ background: gradient }} className="rounded-lg p-4 text-white h-67 flex flex-col">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <img src={iconUrl} alt={desc} className="w-16 h-16 rounded-md drop-shadow-lg" />
              <div>
                <div className="text-3xl font-extrabold leading-none">
                  {Math.round(convertTemperature(temp, state.units.temperature))}{getTemperatureUnit(state.units.temperature)}
                </div>
                <div className="capitalize opacity-95 mt-1">{desc}</div>
                <div className="text-sm opacity-90 mt-1">
                  Feels like {Math.round(convertTemperature(feels, state.units.temperature))}{getTemperatureUnit(state.units.temperature)}
                </div>
              </div>
            </div>
            <div className="text-right min-w-[96px]">
              <div className="font-semibold">{city}</div>
              <div className="text-xs opacity-90 mt-2">{formatTime(new Date(), state.time.format, state.time.timezone)}</div>
              <div className="mt-3 flex flex-col gap-1 text-sm opacity-95">
                <div>💧 {humidity}%</div>
                <div>⇡ {convertPressure(pressure, state.units.pressure).toFixed(0)} {getPressureUnit(state.units.pressure)}</div>
              </div>
            </div>
          </div>

          {/* Air Quality Section */}
          {aq && (
            <div className="mt-3 p-3 bg-white/10 rounded-md text-sm">
              <div className="font-semibold mb-1">Air Quality</div>
              <div>AQI: <span className="font-bold">{aq.main.aqi}</span> (1=Good, 5=Very Poor)</div>
              <div className="grid grid-cols-2 gap-1 mt-2 text-xs opacity-90">
                <div>PM2.5: {aq.components.pm2_5} μg/m³</div>
                <div>PM10: {aq.components.pm10} μg/m³</div>
                <div>O₃: {aq.components.o3} μg/m³</div>
                <div>NO₂: {aq.components.no2} μg/m³</div>
              </div>
            </div>
          )}

          {/* AI Summary Section */}
          <div className="mt-3 p-3 bg-white/10 rounded-md text-sm">
            <div className="flex items-center gap-2 font-semibold mb-2">
              <Sparkles size={16} className="text-blue-400" />
              <span>AI Weather Summary</span>
            </div>
            {summaryLoading ? (
              <div className="flex items-center gap-2 text-white/80">
                <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full"></div>
                <span>Generating summary...</span>
              </div>
            ) : weatherSummary ? (
              <div className="text-white/95 leading-relaxed">{weatherSummary}</div>
            ) : (
              <div className="text-white/80">AI summary will appear here</div>
            )}
          </div>

          <div className="my-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div style={{ transform: `rotate(${windDeg}deg)`, transition: "transform .2s" }} className="w-5 h-5">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L15 11L12 9L9 11L12 2Z" fill="white" /><circle cx="12" cy="14" r="6" stroke="white" strokeOpacity="0.6" strokeWidth="1" fill="none" /></svg>
              </div>
              <div className="font-semibold">
                {convertWindSpeed(windSpeed, state.units.windspeed).toFixed(1)} {getWindSpeedUnit(state.units.windspeed)}
              </div>
              <div className="text-xs opacity-90">{convertWindDirection(windDeg, state.units.windDirection)}</div>
            </div>
            <div className="text-xs opacity-90">Local</div>
          </div>

          <hr className="opacity-30 my-2" />

          <div className="text-sm font-semibold mb-2">Next hours</div>
          <div className="flex overflow-x-auto gap-2 pb-2">
            {hourlyEls.length ? hourlyEls : <div className="text-white/80">No short-term forecast</div>}
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            {dailyEntries.length ? dailyEntries.map((d, i) => (
              <div key={i} className="flex flex-col items-center text-white">
                <div className="text-sm opacity-95">{d.day}</div>
                <img src={`https://openweathermap.org/img/wn/${d.icon}.png`} alt="" className="w-9 h-9 my-1" />
                <div className="font-semibold">{d.avg}{getTemperatureUnit(state.units.temperature)}</div>
              </div>
            )) : <div className="col-span-3 text-white/80">No 3-day forecast</div>}
          </div>
        </div>
      );
    };

    // Handle basemap and weather layer changes
    useEffect(() => {
      if (!viewer.current) return;

      // Clear existing imagery layers (except possibly the bottom one)
      // but simpler to clear all and re-add
      viewer.current.imageryLayers.removeAll();

      const dateStr = currentDate.toISOString().split("T")[0];

      // 🌍 BaseMap Definitions for Cesium
      const addBasemap = async () => {
        try {
          let baseProvider;
          let labelProvider;

          switch (activeBasemap) {
            case 'esri':
              baseProvider = await (Cesium.ArcGisMapServerImageryProvider as any).fromUrl(
                'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer'
              );
              labelProvider = await (Cesium.ArcGisMapServerImageryProvider as any).fromUrl(
                'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer'
              );
              break;
            case 'modis':
              baseProvider = new (Cesium.UrlTemplateImageryProvider as any)({
                url: gibUrl("MODIS_Terra_CorrectedReflectance_TrueColor", dateStr),
                credit: 'NASA GIBS | MODIS',
                maximumLevel: 9,
              });
              break;
            case 'viirs':
              baseProvider = new (Cesium.UrlTemplateImageryProvider as any)({
                url: gibUrl("VIIRS_SNPP_CorrectedReflectance_TrueColor", dateStr),
                credit: 'NASA GIBS | VIIRS',
                maximumLevel: 9,
              });
              break;
            default: // openstreetmap
              baseProvider = new (Cesium.OpenStreetMapImageryProvider as any)({
                url: 'https://tile.openstreetmap.org/'
              });
              break;
          }

          if (baseProvider) viewer.current!.imageryLayers.addImageryProvider(baseProvider);
          if (labelProvider) viewer.current!.imageryLayers.addImageryProvider(labelProvider);

          // Re-add weather layers on top
          for (const layerId of activeWeatherLayers) {
            const tileUrl = getWeatherTileUrl(layerId);
            if (tileUrl) {
              const provider = new (Cesium.UrlTemplateImageryProvider as any)({
                url: tileUrl,
                maximumLevel: 18,
              });
              const imageryLayer = viewer.current!.imageryLayers.addImageryProvider(provider);
              imageryLayer.alpha = 0.7;
              weatherImageryLayers.current.set(layerId, imageryLayer);
            }
          }
        } catch (error) {
          console.error('Error switching basemaps in 3D:', error);
        }
      };

      addBasemap();
    }, [activeBasemap, activeWeatherLayers, currentDate]);

    // Handle Airports Layer in 3D
    useEffect(() => {
      if (!viewer.current) return;

      // Remove existing airport entities
      airportEntities.current.forEach(entity => viewer.current?.entities.remove(entity));
      airportEntities.current = [];

      if (showAirports) {
        const loadAirports = async () => {
          const airports = await airportService.getAirports();
          if (!viewer.current) return;

          // Define SVG icons as base64 or URL
          // For Cesium, it's easier to use a canvas or a pre-defined image URL.
          // We'll use a simple circle/point with a label for now, or a custom canvas icon.

          airports.forEach(airport => {
            const entity = viewer.current!.entities.add({
              position: Cesium.Cartesian3.fromDegrees(airport.lon, airport.lat, airport.elev || 0),
              billboard: {
                // Use a default airport icon or a colored point
                image: airport.type === 'large_airport'
                  ? 'https://raw.githubusercontent.com/google/material-design-icons/master/src/maps/flight/materialicons/24px.svg'
                  : 'https://raw.githubusercontent.com/google/material-design-icons/master/src/maps/local_airport/materialicons/18px.svg',
                width: airport.type === 'large_airport' ? 16 : 12,
                height: airport.type === 'large_airport' ? 16 : 12,
                color: airport.type === 'large_airport' ? Cesium.Color.DODGERBLUE : Cesium.Color.SLATEGRAY,
                heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
                verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                disableDepthTestDistance: Number.POSITIVE_INFINITY,
                distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 5000000), // Hide if further than 5000km
              },
              label: {
                text: airport.name,
                font: '9px sans-serif',
                fillColor: Cesium.Color.WHITE,
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 2,
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                verticalOrigin: Cesium.VerticalOrigin.TOP,
                pixelOffset: new Cesium.Cartesian2(0, 5),
                distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 1000000), // Only show labels when close (1000km)
              },
              properties: {
                airportData: airport
              }
            });
            airportEntities.current.push(entity);
          });
        };

        loadAirports();
      }
    }, [showAirports]);

    // Handle Airport Clicks in 3D
    useEffect(() => {
      if (!viewer.current) return;

      const handler = new Cesium.ScreenSpaceEventHandler(viewer.current.scene.canvas);
      handler.setInputAction((click: any) => {
        const pickedObject = viewer.current!.scene.pick(click.position);
        if (Cesium.defined(pickedObject) && pickedObject.id && pickedObject.id.properties?.airportData) {
          const airport = pickedObject.id.properties.airportData.getValue();
          onAirportClick(airport);
        }
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

      return () => {
        handler.destroy();
      };
    }, [onAirportClick]);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      flyTo: (lat: number, lng: number, zoom = 10) => {
        if (viewer.current) {
          // Calculate appropriate height based on zoom level
          let height;
          if (zoom <= 3) {
            height = 20000000; // 20M meters for world view
          } else if (zoom <= 5) {
            height = 10000000; // Continental view
          } else {
            height = (15 - zoom) * 1000000;
          }

          viewer.current.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(lng, lat, height),
            duration: 2,
          });
        }
      },
      searchAndShowWeather: async (lat: number, lng: number) => {
        if (!viewer.current) return;

        // Fly to searched location
        viewer.current.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(lng, lat, 1000000),
          duration: 2,
        });

        // Add marker at searched location
        const cartesian = Cesium.Cartesian3.fromDegrees(lng, lat);
        if (locationMarker.current) {
          viewer.current.entities.remove(locationMarker.current);
        }
        locationMarker.current = viewer.current.entities.add({
          position: cartesian,
          point: {
            pixelSize: 10,
            color: Cesium.Color.YELLOW,
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 2,
          },
        });

        // Fetch and display weather
        setWeatherPayload(null);
        setWeatherError(null);
        setWeatherSummary(null);
        setWeatherLoading(true);
        setWeatherPanelOpen(true);
        onWeatherPanelOpen?.();

        const payload = await fetchWeather(lat, lng);
        setWeatherLoading(false);

        if (payload) {
          setWeatherPayload(payload);
          setWeatherError(null);

          // Update marker with location label
          if (locationMarker.current && payload.current?.name) {
            locationMarker.current.label = new Cesium.LabelGraphics({
              text: payload.current.name,
              font: '14px sans-serif',
              fillColor: Cesium.Color.WHITE,
              outlineColor: Cesium.Color.BLACK,
              outlineWidth: 2,
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
              pixelOffset: new Cesium.Cartesian2(0, -15),
            });
          }

          // Generate AI summary in the background
          setSummaryLoading(true);
          try {
            const summary = await generateWeatherSummary(payload);
            setWeatherSummary(summary);
          } catch (error) {
            console.error('AI summary generation failed:', error);
            setWeatherSummary("AI summary temporarily unavailable.");
          } finally {
            setSummaryLoading(false);
          }
        }
      },
      zoomIn: () => {
        if (viewer.current) {
          viewer.current.camera.zoomIn(viewer.current.camera.positionCartographic.height * 0.5);
        }
      },
      zoomOut: () => {
        if (viewer.current) {
          viewer.current.camera.zoomOut(viewer.current.camera.positionCartographic.height * 0.5);
        }
      },
      async zoomToUserLocation() {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(async (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            if (viewer.current) {
              // Fly to user location
              viewer.current.camera.flyTo({
                destination: Cesium.Cartesian3.fromDegrees(lng, lat, 1000000),
                duration: 2,
              });

              // Add marker at user location
              const cartesian = Cesium.Cartesian3.fromDegrees(lng, lat);
              if (locationMarker.current) {
                viewer.current.entities.remove(locationMarker.current);
              }
              locationMarker.current = viewer.current.entities.add({
                position: cartesian,
                point: {
                  pixelSize: 10,
                  color: Cesium.Color.YELLOW,
                  outlineColor: Cesium.Color.WHITE,
                  outlineWidth: 2,
                },
              });

              // Fetch and display weather
              setWeatherPayload(null);
              setWeatherError(null);
              setWeatherSummary(null);
              setWeatherLoading(true);
              setWeatherPanelOpen(true);
              onWeatherPanelOpen?.();

              const payload = await fetchWeather(lat, lng);
              setWeatherLoading(false);

              if (payload) {
                setWeatherPayload(payload);
                setWeatherError(null);

                // Update marker with location label
                if (locationMarker.current && payload.current?.name) {
                  locationMarker.current.label = new Cesium.LabelGraphics({
                    text: payload.current.name,
                    font: '14px sans-serif',
                    fillColor: Cesium.Color.WHITE,
                    outlineColor: Cesium.Color.BLACK,
                    outlineWidth: 2,
                    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                    pixelOffset: new Cesium.Cartesian2(0, -15),
                  });
                }

                // Generate AI summary in the background
                setSummaryLoading(true);
                try {
                  const summary = await generateWeatherSummary(payload);
                  setWeatherSummary(summary);
                } catch (error) {
                  console.error('AI summary generation failed:', error);
                  setWeatherSummary("AI summary temporarily unavailable.");
                } finally {
                  setSummaryLoading(false);
                }
              }
            }
          });
        }
      },
      closeWeatherPanel: () => {
        setWeatherPanelOpen(false);
        if (locationMarker.current && viewer.current) {
          viewer.current.entities.remove(locationMarker.current);
          locationMarker.current = null;
        }
      }
    }), [onWeatherPanelOpen]);

    return (
      <div className="relative w-full h-full">
        <div
          ref={cesiumContainer}
          className="absolute inset-0 w-full h-full"
          style={{ background: 'hsl(var(--background))' }}
        />

        {/* Weather Panel */}
        <div
          aria-hidden={!weatherPanelOpen}
          style={{
            transition: "transform 200ms ease, opacity 200ms ease",
            transform: weatherPanelOpen ? "translateX(0)" : "translateX(8px)",
            opacity: weatherPanelOpen ? 1 : 0,
            pointerEvents: weatherPanelOpen ? "auto" : "none",
          }}
          className='pointer-events-auto fixed right-4 top-4 h-[calc(100vh-3rem)] w-[360px] z-2 mt-8'
        >
          <div className="h-67 flex flex-col rounded-lg overflow-hidden shadow-2xl" style={{ pointerEvents: weatherPanelOpen ? "auto" : "none" }}>
            <div className="p-2 bg-transparent flex items-center justify-end">
              <button onClick={closeWeatherPanel} aria-label="Close weather panel" className="p-2 rounded hover:bg-white/10 text-white" title="Close"
                style={{ marginTop: '16px' }}>
                <X size={18} className="bg-red-500 absolute" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-3" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.45), rgba(0,0,0,0.3))", backdropFilter: "blur(8px) saturate(120%)" }}>
              {renderWeatherPanelContent()}
            </div>
          </div>
        </div>
      </div>
    );
  }
);

export default Globe3D;