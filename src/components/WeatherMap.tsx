// src/components/WeatherMap.tsx
import React, {
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
  useState,
  useCallback,
} from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useToast } from "@/hooks/use-toast";
import { useGeolocation } from "@/hooks/use-geolocation";
import { X, Sparkles } from "lucide-react";
import html2canvas from "html2canvas";
import { useSettings } from "@/context/SettingsContext";
import { weatherAI, type WeatherSummaryInput } from "@/lib/aiService";
import {
  convertTemperature,
  getTemperatureUnit,
  convertWindSpeed,
  getWindSpeedUnit,
  convertWindDirection,
  convertPressure,
  getPressureUnit,
  formatTime
} from "@/lib/utils";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface WeatherMapProps {
  activeBasemap: string;
  activeWeatherLayers: string[];
  currentDate: Date;
  onCoordinatesChange: (lat: number, lng: number) => void;
}

export interface WeatherMapRef {
  startMeasurement: () => void;
  flyTo: (lat: number, lng: number, zoom?: number) => void;
  searchAndShowWeather: (lat: number, lng: number) => void;
  zoomToUserLocation: () => void;
  flyToWorld: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

const GIBS_API_KEY = import.meta.env.VITE_GIBS_API_KEY;
const OPENWEATHER_KEY = import.meta.env.VITE_OPENWEATHER_KEY;
const weatherCache = new Map<string, { timestamp: number; payload: any }>();
const CACHE_TTL_MS = 1000 * 60 * 5;

const WeatherMap = forwardRef<WeatherMapRef, WeatherMapProps>(
  ({ activeBasemap, activeWeatherLayers, currentDate, onCoordinatesChange }, ref) => {
    const { state } = useSettings();
    const mapContainer = useRef<HTMLDivElement | null>(null);
    const map = useRef<L.Map | null>(null);
    const mapReady = useRef<boolean>(false);

    // Continuous GPS location tracking
    const geolocation = useGeolocation();

    // holds created overlay tile layers, keyed by layer id
    const weatherLayers = useRef<{ [key: string]: L.TileLayer }>({});

    // track which overlay ids are currently added to map
    const activeOverlayIds = useRef<Set<string>>(new Set());

    const userMarker = useRef<L.Marker | null>(null);
    const locationMarker = useRef<L.Marker | null>(null);
    const { toast } = useToast();

    const measuringRef = useRef(false);
    const points = useRef<L.LatLng[]>([]);
    const tempMarkers = useRef<L.Marker[]>([]);
    const tempLine = useRef<L.Polyline | null>(null);

    const [weatherSummary, setWeatherSummary] = useState<string | null>(null);
    const [summaryLoading, setSummaryLoading] = useState(false);

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

    // Format date for GIBS API (YYYY-MM-DD)
    const dateStr = currentDate.toISOString().split("T")[0];

    const [weatherPanelOpen, setWeatherPanelOpen] = useState(false);
    const [weatherPayload, setWeatherPayload] = useState<any | null>(null);
    const [weatherLoading, setWeatherLoading] = useState(false);
    const [weatherError, setWeatherError] = useState<string | null>(null);

    const degToCompass = (deg: number) => {
      const val = Math.floor((deg / 22.5) + 0.5);
      const arr = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
      return arr[val % 16];
    };

    const gibUrl = (layerId: string, dateStr: string) =>
      `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${layerId}/default/${dateStr}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`;

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
        console.error("[WeatherMap] fetchWeather error:", err);
        setWeatherError(err?.message || "Failed to fetch weather");
        return null;
      } finally {
        setWeatherLoading(false);
      }
    }, []);

    const cancelMeasurement = useCallback(() => {
      measuringRef.current = false;
      points.current = [];
      tempMarkers.current.forEach(m => m.remove());
      tempMarkers.current = [];
      if (tempLine.current) {
        tempLine.current.remove();
        tempLine.current = null;
      }
      toast({ title: "Measurement Cancelled", description: "Measurement mode exited." });
    }, [toast]);

    useImperativeHandle(ref, () => ({
      startMeasurement: () => {
        if (!map.current) return;
        cancelMeasurement();
        measuringRef.current = true;
        toast({ title: "Measurement Started", description: "Click two points on the map." });
      },
      flyTo: (lat: number, lng: number, zoom = 10) => {
        map.current?.flyTo([lat, lng], zoom);
      },
      searchAndShowWeather: async (lat: number, lng: number) => {
        if (!map.current) return;

        // Fly to the searched location
        map.current.flyTo([lat, lng], 13, { animate: true, duration: 1.2 });

        // Add marker at searched location
        userMarker.current?.remove();
        userMarker.current = L.marker([lat, lng]).addTo(map.current);

        // Fetch and display weather
        setWeatherPayload(null);
        setWeatherError(null);
        setWeatherLoading(true);
        setWeatherPanelOpen(true);

        const payload = await fetchWeather(lat, lng);
        setWeatherLoading(false);

        if (payload) {
          setWeatherPayload(payload);
          const summary = await generateWeatherSummary(payload);
          setWeatherSummary(summary);
          const locationName = payload.current?.name || "Location";
          userMarker.current?.bindPopup(locationName).openPopup();
        }
      },
      zoomToUserLocation: async () => {
        if (!map.current) return;

        // Check if geolocation is supported
        if (!geolocation.supported) {
          console.warn("Geolocation not supported");
          return;
        }

        // Check if we have a location from the continuous tracking
        const coords = geolocation.getCoordinates();
        if (!coords) {
          // Location not yet available (still loading or permission denied)
          console.warn("Location not available:", geolocation.error);
          return;
        }

        const { lat, lng } = coords;

        // Fly to the location immediately - no waiting!
        map.current.flyTo([lat, lng], 13, { animate: true, duration: 1.2 });

        // Add user marker
        userMarker.current?.remove();
        userMarker.current = L.marker([lat, lng]).addTo(map.current);

        // Trigger weather fetch + panel UI
        setWeatherPayload(null);
        setWeatherError(null);
        setWeatherLoading(true);
        setWeatherPanelOpen(true);

        const payload = await fetchWeather(lat, lng);
        setWeatherLoading(false);

        if (!payload) {
          setWeatherError("Unable to load weather for your location.");
          setWeatherPayload(null);
          return;
        }

        setWeatherPayload(payload);
        setWeatherError(null);
      },
      //New: Zoom back to full world view
      flyToWorld: () => {
        console.log("Flying to world view");
        map.current?.flyTo([20, 0], 3, { animate: true, duration: 1.2 });
      },
      zoomIn: () => {
        if (map.current) {
          map.current.zoomIn();
        }
      },
      zoomOut: () => {
        if (map.current) {
          map.current.zoomOut();
        }
      }
    }), [cancelMeasurement, toast, fetchWeather, geolocation]);



    // Inject small CSS for tile fade transitions once
    useEffect(() => {
      if (typeof document === "undefined") return;
      if (document.getElementById("weathermap-tile-css")) return;
      const style = document.createElement("style");
      style.id = "weathermap-tile-css";
      style.innerHTML = `
        .leaflet-tile {
          transition: opacity 0.45s ease-in-out;
          border: none !important;
          outline: none !important;
          box-shadow: none !important;
        }
        .leaflet-tile-container {
          outline: none !important;
          border: none !important;
        }
        .leaflet-tile-container img {
          border: none !important;
          outline: none !important;
        }
        .leaflet-layer {
          border: none !important;
        }
      `;
      document.head.appendChild(style);
    }, []);

    // Helper: determines tile URL (OWM if supported, else GIBS fallback)
    const getTileUrl = (layerId: string, dateStr: string) => {
      // OWM-supported tile layers (known)
      const owmSupported = new Set([
        "temperature",
        "precipitation",
        "wind",
        "pressure",
        "clouds",
        "snow",
        "wind_gust",
      ]);

      // map of OWM key names -> url template
      const owmMap: Record<string, string> = {
        temperature: `https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=${OPENWEATHER_KEY}`,
        precipitation: `https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${OPENWEATHER_KEY}`,
        wind: `https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=${OPENWEATHER_KEY}`,
        pressure: `https://tile.openweathermap.org/map/pressure_new/{z}/{x}/{y}.png?appid=${OPENWEATHER_KEY}`,
        clouds: `https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${OPENWEATHER_KEY}`,
        snow: `https://tile.openweathermap.org/map/snow_new/{z}/{x}/{y}.png?appid=${OPENWEATHER_KEY}`,
        wind_gust: `https://tile.openweathermap.org/map/wind_gust/{z}/{x}/{y}.png?appid=${OPENWEATHER_KEY}`,
      };

      if (owmSupported.has(layerId) && owmMap[layerId]) {
        return { url: owmMap[layerId], source: "owm" } as any;
      }

      // GIBS fallbacks for layers OWM doesn't provide as tiles
      switch (layerId) {
        case "humidity":
          return { url: gibUrl("MERRA2_RelativeHumidity_2m", dateStr), source: "gibs" } as any;
        case "dewpoint":
          // closest approximation via AIRS surface air temperature (not exact dewpoint but visual)
          return { url: gibUrl("AIRS_L3_Surface_Temperature_Day", dateStr), source: "gibs" } as any;
        case "feels_like":
          // no direct feels_like layer — use surface temp visual as approximation
          return { url: gibUrl("AIRS_L3_Surface_Temperature_Day", dateStr), source: "gibs" } as any;
        case "visibility":
          // approximate via aerosol optical depth / aerosol product
          return { url: gibUrl("MODIS_Terra_Aerosol", dateStr), source: "gibs" } as any;
        case "uvi":
          return { url: gibUrl("OMI_L2_UV_Index", dateStr), source: "gibs" } as any;
        default:
          return null;
      }
    };

    // Add a single overlay layer (creates tile layer if not created yet)
    const addOverlay = useCallback((layerId: string) => {
      if (!map.current) return;
      // already added
      if (activeOverlayIds.current.has(layerId)) return;

      // create tile layer if not present
      if (!weatherLayers.current[layerId]) {
        const tileMeta: any = getTileUrl(layerId, dateStr);
        if (!tileMeta) return;
        const tileUrl: string = tileMeta.url;
        const attribution =
          tileMeta.source === "owm"
            ? "© OpenWeatherMap"
            : tileMeta.source === "gibs"
              ? "© NASA GIBS"
              : "© OpenWeatherMap / NASA GIBS";

        try {
          const tl = L.tileLayer(tileUrl, {
            opacity: 0.75,
            tileSize: 256,
            attribution,
            // use crossOrigin so some sources allow canvas export
            crossOrigin: true as any,
            // Add these:
            className: 'no-grid-tiles',
            noWrap: false,
            detectRetina: false
          });
          weatherLayers.current[layerId] = tl;
        } catch (err) {
          console.warn(`[WeatherMap] failed to create tile layer ${layerId}`, err);
          return;
        }
      }

      const layer = weatherLayers.current[layerId];
      if (layer && map.current && !map.current.hasLayer(layer)) {
        layer.addTo(map.current);
        activeOverlayIds.current.add(layerId);
      }
    }, [dateStr]);


    // Remove a single overlay by id
    const removeOverlay = useCallback((layerId: string) => {
      if (!map.current) return;
      const layer = weatherLayers.current[layerId];
      if (layer && map.current.hasLayer(layer)) {
        map.current.removeLayer(layer);
      }
      activeOverlayIds.current.delete(layerId);
    }, []);

    // Sync overlays when activeWeatherLayers change
    useEffect(() => {
      if (!map.current || !mapReady.current) return;

      // compute desired set
      const desired = new Set(activeWeatherLayers);

      // remove overlays that are currently active but not desired
      Array.from(activeOverlayIds.current).forEach((id) => {
        if (!desired.has(id)) {
          removeOverlay(id);
        }
      });

      // add overlays that are desired but not currently active
      desired.forEach((id) => {
        if (!activeOverlayIds.current.has(id)) {
          addOverlay(id);
        }
      });
    }, [activeWeatherLayers, addOverlay, removeOverlay]);

    // Initialize the map and events (runs once on mount)
    useEffect(() => {
      if (!mapContainer.current || map.current) return;

      map.current = L.map(mapContainer.current, {
        center: [20, 0],
        zoom: 3,
        minZoom: 2,
        maxZoom: 18,
        zoomControl: false,
        attributionControl: false,
      });

      // Basemap definitions (same as before)
      const basemaps: { [k: string]: L.Layer } = {
        openstreetmap: L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "© OpenStreetMap contributors",
          maxZoom: 19,
        }),
        esri: L.layerGroup([
          L.tileLayer(
            "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            { attribution: "© Esri" }
          ),
          L.tileLayer(
            "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
            { attribution: "© Esri (labels)", pane: "overlayPane" }
          ),
        ]),
        modis: L.tileLayer(gibUrl("MODIS_Terra_CorrectedReflectance_TrueColor", dateStr), {
          attribution: "NASA GIBS | MODIS",
          maxZoom: 9,
          tileSize: 256,
        }),
        viirs: L.tileLayer(gibUrl("VIIRS_SNPP_CorrectedReflectance_TrueColor", dateStr), {
          attribution: "NASA GIBS | VIIRS",
          maxZoom: 9,
          tileSize: 256,
        }),
      };

      // default basemap
      (basemaps[activeBasemap] || basemaps.openstreetmap).addTo(map.current);

      // Mark map as ready after a short delay to ensure tiles are loading
      setTimeout(() => {
        mapReady.current = true;
        // Trigger initial overlay load by forcing a re-check
        if (activeWeatherLayers.length > 0) {
          activeWeatherLayers.forEach(layerId => {
            if (!activeOverlayIds.current.has(layerId)) {
              addOverlay(layerId);
            }
          });
        }
      }, 100);

      // wire up coordinate change
      map.current.on("mousemove", (e: L.LeafletMouseEvent) => {
        onCoordinatesChange(e.latlng.lat, e.latlng.lng);
      });

      map.current.on("click", async (e: L.LeafletMouseEvent) => {
        if (measuringRef.current) {
          points.current.push(e.latlng);
          const marker = L.marker(e.latlng).addTo(map.current!);
          tempMarkers.current.push(marker);

          if (points.current.length === 2) {
            const dist = points.current[0].distanceTo(points.current[1]);
            tempLine.current = L.polyline(points.current, { color: "red", weight: 3 }).addTo(map.current!);
            L.popup({ autoClose: true, closeButton: false })
              .setLatLng(points.current[1])
              .setContent(`<div style="padding:6px;background:rgba(0,0,0,0.75);color:white;border-radius:6px">
                            <strong>Distance:</strong> ${(dist / 1000).toFixed(2)} km
                           </div>`)
              .openOn(map.current!);
            measuringRef.current = false;
            toast({ title: "Measurement Complete", description: `Distance: ${(dist / 1000).toFixed(2)} km` });
          }
          return;
        }

        const lat = e.latlng.lat;
        const lon = e.latlng.lng;

        if (locationMarker.current) locationMarker.current.remove();
        locationMarker.current = L.marker([lat, lon]).addTo(map.current!);

        setWeatherPayload(null);
        setWeatherError(null);
        setWeatherSummary(null);
        setWeatherLoading(true);
        setWeatherPanelOpen(true);

        const payload = await fetchWeather(lat, lon);
        setWeatherLoading(false);

        if (!payload) {
          setWeatherError("Unable to load weather. See console for details.");
          setWeatherPayload(null);
          return;
        }

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
      });

      map.current.on("contextmenu", () => {
        if (measuringRef.current || points.current.length > 0) cancelMeasurement();
      });

      const keyHandler = (ev: KeyboardEvent) => {
        if (ev.key === "Escape" && (measuringRef.current || points.current.length > 0)) {
          cancelMeasurement();
        }
      };
      window.addEventListener("keydown", keyHandler);

      return () => {
        window.removeEventListener("keydown", keyHandler);
        if (map.current) {
          map.current.remove();
          map.current = null;
          mapReady.current = false;
        }
      };
    }, [cancelMeasurement, fetchWeather, onCoordinatesChange, activeBasemap, dateStr, addOverlay, activeWeatherLayers]);

    // When activeBasemap or today change, re-add correct basemap and ensure overlays stay
    useEffect(() => {
      if (!map.current) return;

      // Remove all tile layers (we'll re-add basemap and overlays)
      map.current.eachLayer((layer) => {
        if (layer instanceof L.TileLayer) {
          map.current?.removeLayer(layer);
        }
      });

      // 🌍 BaseMap Definitions (Optimized for Performance & Readability)
      const basemaps: { [k: string]: L.Layer } = {
        // 🗺️ OpenStreetMap — fast & reliable base
        openstreetmap: L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "© OpenStreetMap contributors",
          maxZoom: 19,
          detectRetina: true,
        }),

        // 🛰️ Esri World Imagery — detailed satellite basemap
        esri: L.layerGroup([
          // Base Imagery Layer
          L.tileLayer(
            "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            {
              attribution: "Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics",
              maxZoom: 19,
              subdomains: ["server", "services"], // faster load balance
              updateWhenIdle: false,
              updateWhenZooming: false,
            }
          ),
          // Optional Label Overlay (country, city names)
          L.tileLayer(
            "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
            {
              attribution: "Labels © Esri",
              pane: "overlayPane",
              maxZoom: 19,
            }
          ),
        ]),
        modis: L.tileLayer(gibUrl("MODIS_Terra_CorrectedReflectance_TrueColor", dateStr), {
          attribution: "NASA GIBS | MODIS",
          maxZoom: 9,
          tileSize: 256,
        }),
        viirs: L.tileLayer(gibUrl("VIIRS_SNPP_CorrectedReflectance_TrueColor", dateStr), {
          attribution: "NASA GIBS | VIIRS",
          maxZoom: 9,
          tileSize: 256,
        }),
      };


      (basemaps[activeBasemap] || basemaps.openstreetmap).addTo(map.current);

      // Recreate or refresh overlay tile layers if any rely on `dateStr` (GIBS date)
      // For overlays that have GIBS urls we need to recreate them when `dateStr` changes
      Object.keys(weatherLayers.current).forEach((layerId) => {
        // detect if this layer is GIBS-based by checking current tile url
        const meta = getTileUrl(layerId, dateStr) as any;
        if (meta && meta.source === "gibs") {
          // remove old tile layer and recreate it so it points to the new date URL
          const old = weatherLayers.current[layerId];
          if (old) {
            if (map.current && map.current.hasLayer(old)) {
              map.current.removeLayer(old);
            }
            try {
              delete weatherLayers.current[layerId];
              activeOverlayIds.current.delete(layerId); // Mark as removed so addOverlay works
              addOverlay(layerId); // Re-add immediately with new date
            } catch { }
          }
        }
      });

      // re-add overlays that should be active (the overlay-sync effect will add them)
      // trigger overlay sync by invoking a no-op update (we rely on activeWeatherLayers useEffect)
      // (nothing else needed here, since overlay sync effect handles them)
    }, [activeBasemap, dateStr]);



    const closeWeatherPanel = () => {
      setWeatherPanelOpen(false);
      // Optionally remove the location marker when closing
      if (locationMarker.current) {
        locationMarker.current.remove();
        locationMarker.current = null;
      }
      // ✅ Remove user-location marker too
      if (userMarker.current) {
        userMarker.current.remove();
        userMarker.current = null;
      }
      setWeatherPayload(null);
      setWeatherError(null);
      setWeatherLoading(false);
    };

    const renderWeatherPanelContent = () => {
      if (weatherLoading) return <div className="flex-1 flex items-center justify-center">Loading weather…</div>;
      if (weatherError) return <div className="flex-1 p-4 text-sm">Error: {weatherError}</div>;
      if (!weatherPayload) return <div className="flex-1 p-4 text-sm">Click on the map to load weather for a location.</div>;

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

    return (
      <div className="relative w-full h-full">
        <div ref={mapContainer} className="absolute inset-0 z-0" style={{ background: "hsl(var(--background))" }} />
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

export default WeatherMap;
