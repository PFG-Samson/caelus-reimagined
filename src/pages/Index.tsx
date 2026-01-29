import React, { useState, useCallback, useRef, useEffect } from 'react';
import WeatherMap, { WeatherMapRef } from '@/components/WeatherMap';
import Globe3D, { Globe3DRef } from '@/components/Globe3D';
import Header from '@/components/Header';
import LayerSelector from '@/components/LayerSelector';
import CoordinateDisplay from '@/components/CoordinateDisplay';
import Timeline from '@/components/Timeline';
import MapControls from '@/components/MapControls';
import SearchModal from '@/components/SearchModal';
import SettingsModal from '@/components/SettingsModal';
import html2canvas from "html2canvas";

import { useToast } from '@/hooks/use-toast';
import { useSettings } from '@/context/SettingsContext';

const Index = () => {
  const { state } = useSettings();

  // Map state
  const [activeBasemap, setActiveBasemap] = useState('esri');
  const [activeWeatherLayers, setActiveWeatherLayers] = useState<string[]>(['temperature']);
  const [coordinates, setCoordinates] = useState({ lat: 20, lng: 0 });
  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [is3DView, setIs3DView] = useState(false);

  // ✅ Typed refs for both 2D and 3D views
  const mapRef = useRef<WeatherMapRef>(null);
  const globeRef = useRef<Globe3DRef>(null);

  // Timeline state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isTimelinePlaying, setIsTimelinePlaying] = useState(false);

  // Overlay state
  const [overlays, setOverlays] = useState({
    pressureIsolines: false,
    windAnimation: false,
    locationNames: true,
    forecastValues: false,
    nightBoundary: false
  });

  const { toast } = useToast();

  // Timeline playback with animation speed
  useEffect(() => {
    if (!isTimelinePlaying) return;

    // Map animation speed to interval (in milliseconds)
    const speedMap = {
      slow: 2000,    // 2 seconds per step
      medium: 1000,  // 1 second per step
      fast: 500      // 0.5 seconds per step
    };

    const interval = setInterval(() => {
      setCurrentDate(prevDate => {
        const newDate = new Date(prevDate);
        newDate.setHours(newDate.getHours() + 1); // Advance by 1 hour

        // Stop at current time
        if (newDate > new Date()) {
          setIsTimelinePlaying(false);
          return prevDate;
        }

        return newDate;
      });
    }, speedMap[state.animation.speed]);

    return () => clearInterval(interval);
  }, [isTimelinePlaying, state.animation.speed]);

  // Handlers
  const handleWeatherLayerToggle = useCallback((layer: string) => {
    setActiveWeatherLayers(prev =>
      prev.includes(layer)
        ? prev.filter(l => l !== layer)
        : [...prev, layer]
    );
  }, []);

  const handleOverlayToggle = useCallback((overlay: keyof typeof overlays) => {
    setOverlays(prev => ({
      ...prev,
      [overlay]: !prev[overlay]
    }));
  }, []);

  const handleCoordinatesChange = useCallback((lat: number, lng: number) => {
    setCoordinates({ lat, lng });
  }, []);

  // Header action handlers
  const handleSearchClick = () => setSearchOpen(true);

  const handleSearchSubmit = (query: string) => {
    setSearchQuery(query);
    setSearchOpen(true);
  };

  const handleResultSelect = (lat: number, lon: number) => {
    if (is3DView && globeRef.current) {
      globeRef.current.searchAndShowWeather(lat, lon);
    } else if (mapRef.current) {
      mapRef.current.searchAndShowWeather(lat, lon);
    }
  };

  const handleSettingsClick = () => setSettingsOpen(true);

  const handleAboutClick = () => {
    toast({ title: "About CAELUS", description: "Weather intelligence platform by Proforce Galaxies." });
  };

  const handleShareSnapshot = async () => {
    try {
      const appRoot = document.querySelector(".relative.w-full.h-screen") as HTMLElement;
      if (!appRoot) return;

      // Hide header buttons and basemap selector
      const headerButtons = appRoot.querySelectorAll("header .map-control");
      const layerSelector = document.querySelector(".layer-selector-class"); // change to your selector
      headerButtons.forEach(btn => (btn as HTMLElement).style.display = "none");
      if (layerSelector) (layerSelector as HTMLElement).style.display = "none";

      // Add product name overlay
      const overlay = document.createElement("div");
      overlay.textContent = "PF-CAELUS – Weather Intelligence";
      overlay.style.position = "absolute";
      overlay.style.top = "20px";
      overlay.style.left = "50%";
      overlay.style.transform = "translateX(-50%)";
      overlay.style.fontSize = "26px";
      overlay.style.fontWeight = "bold";
      overlay.style.color = "#fff";
      overlay.style.textShadow = "0 0 6px rgba(0,0,0,0.7)";
      overlay.style.zIndex = "9999";
      appRoot.appendChild(overlay);

      const canvas = await html2canvas(appRoot, {
        useCORS: true,
        backgroundColor: "#0a0a0a",
        scale: 2,
      });

      // Clean up
      appRoot.removeChild(overlay);
      headerButtons.forEach(btn => (btn as HTMLElement).style.display = "");
      if (layerSelector) (layerSelector as HTMLElement).style.display = "";

      // Download image
      const link = document.createElement("a");
      link.download = `PF-CAELUS_Snapshot_${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("Snapshot failed", err);
      toast({
        title: "Snapshot Error",
        description: "Unable to capture snapshot.",
      });
    }
  };

  const handleLocationClick = () => {
    if (is3DView && globeRef.current) {
      globeRef.current.zoomToUserLocation();
    } else if (mapRef.current) {
      mapRef.current.zoomToUserLocation();
    } else {
      toast({
        title: "Map Not Ready",
        description: "Unable to locate user right now."
      });
    }
  };


  const handleMeasureClick = () => {
    if (mapRef.current) {
      mapRef.current.startMeasurement();
    } else {
      toast({ title: "Map Not Ready", description: "Unable to start measurement tool right now." });
    }
  };

  const handleZoomIn = () => {
    if (is3DView && globeRef.current) {
      globeRef.current.zoomIn();
    } else if (mapRef.current) {
      mapRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (is3DView && globeRef.current) {
      globeRef.current.zoomOut();
    } else if (mapRef.current) {
      mapRef.current.zoomOut();
    }
  };

  const handleToggle3D = () => {
    setIs3DView(!is3DView);
    toast({
      title: is3DView ? "Switching to 2D Map" : "Switching to 3D Globe",
      description: is3DView ? "Loading 2D map view..." : "Loading 3D globe view..."
    });
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-background">
      {/* Conditionally render 2D Map or 3D Globe */}
      {is3DView ? (
        <Globe3D
          ref={globeRef}
          activeBasemap={activeBasemap}
          activeWeatherLayers={activeWeatherLayers}
          currentDate={currentDate}
          onCoordinatesChange={handleCoordinatesChange}
        />
      ) : (
        <WeatherMap
          ref={mapRef}
          activeBasemap={activeBasemap}
          activeWeatherLayers={activeWeatherLayers}
          currentDate={currentDate}
          onCoordinatesChange={handleCoordinatesChange}
        />
      )}

      <Header
        onSearchClick={handleSearchClick}
        onSearchSubmit={handleSearchSubmit}
        onSettingsClick={handleSettingsClick}
        onAboutClick={handleAboutClick}
        onShareClick={handleShareSnapshot}  // ✅ linked to snapshot
        onLocationClick={handleLocationClick}
        onMeasureClick={handleMeasureClick}
        onWorldViewClick={() => {
          if (is3DView && globeRef.current) {
            globeRef.current.flyTo(20, 0, 3);
          } else if (mapRef.current) {
            mapRef.current.flyTo(20, 0, 3);
          }
        }}
      />

      <LayerSelector
        activeBasemap={activeBasemap}
        onBasemapChange={setActiveBasemap}
        activeWeatherLayers={activeWeatherLayers}
        onWeatherLayerToggle={handleWeatherLayerToggle}
      />

      <CoordinateDisplay latitude={coordinates.lat} longitude={coordinates.lng} />

      <Timeline
        currentDate={currentDate}
        onDateChange={setCurrentDate}
        isPlaying={isTimelinePlaying}
        onPlayToggle={() => setIsTimelinePlaying(!isTimelinePlaying)}
      />

      <MapControls
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        overlays={overlays}
        onOverlayToggle={handleOverlayToggle}
        is3DView={is3DView}
        onToggle3D={handleToggle3D}
      />

      <SearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onResultSelect={handleResultSelect}
      />

      <SettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />
    </div>
  );
};

export default Index;
