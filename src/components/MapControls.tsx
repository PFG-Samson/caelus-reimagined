import React from 'react';
import { ZoomIn, ZoomOut, Eye, EyeOff, Wind, Gauge, MapPin as LocationIcon, Moon, Globe2, Map } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MapControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  overlays: {
    pressureIsolines: boolean;
    windAnimation: boolean;
    locationNames: boolean;
    forecastValues: boolean;
    nightBoundary: boolean;
  };
  onOverlayToggle: (overlay: keyof MapControlsProps['overlays']) => void;
  is3DView: boolean;
  onToggle3D: () => void;
}

const MapControls: React.FC<MapControlsProps> = ({
  onZoomIn,
  onZoomOut,
  overlays,
  onOverlayToggle,
  is3DView,
  onToggle3D
}) => {
  const overlayConfigs = [
    // { key: 'pressureIsolines' as const, icon: Gauge, label: 'Pressure Lines', color: 'text-weather-pressure' },
    // { key: 'windAnimation' as const, icon: Wind, label: 'Wind Animation', color: 'text-weather-wind' },
    // { key: 'locationNames' as const, icon: LocationIcon, label: 'Location Names', color: 'text-muted-foreground' },
    // { key: 'forecastValues' as const, icon: Eye, label: 'Forecast Values', color: 'text-muted-foreground' },
    // { key: 'nightBoundary' as const, icon: Moon, label: 'Night Boundary', color: 'text-muted-foreground' }
  ];

  return (
    <div className="absolute bottom-4 right-4 z-40 flex flex-col gap-2 pointer-events-none">
      {/* Overlay Toggles */}
      <div className="flex flex-col gap-1 pointer-events-auto">
        {overlayConfigs.map((config) => {
          const Icon = config.icon;
          const isActive = overlays[config.key];
          
          return (
            <Button
              key={config.key}
              variant="secondary"
              size="sm"
              className={`map-control ${isActive ? 'map-control-active' : ''}`}
              onClick={() => onOverlayToggle(config.key)}
              title={config.label}
            >
              <Icon className={`h-4 w-4 ${config.color}`} />
            </Button>
          );
        })}
      </div>

      {/* 2D/3D Toggle */}
      <div className="flex flex-col gap-1 pointer-events-auto mt-2">
        <Button
          variant="secondary"
          size="sm"
          className={`map-control ${is3DView ? 'map-control-active' : ''}`}
          onClick={onToggle3D}
          title={is3DView ? "Switch to 2D Map" : "Switch to 3D Globe"}
        >
          {is3DView ? <Map className="h-4 w-4" /> : <Globe2 className="h-4 w-4" />}
        </Button>
      </div>

      {/* Zoom Controls */}
      <div className="flex flex-col gap-1 pointer-events-auto">
        <Button
          variant="secondary"
          size="sm"
          className="map-control"
          onClick={onZoomIn}
          title="Zoom In"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        
        <Button
          variant="secondary"
          size="sm"
          className="map-control"
          onClick={onZoomOut}
          title="Zoom Out"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default MapControls;