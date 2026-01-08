import React from 'react';
import { MapPin } from 'lucide-react';

interface CoordinateDisplayProps {
  latitude: number;
  longitude: number;
}

const CoordinateDisplay: React.FC<CoordinateDisplayProps> = ({ latitude, longitude }) => {
  const formatCoordinate = (value: number, type: 'lat' | 'lng'): string => {
    const abs = Math.abs(value);
    const degrees = Math.floor(abs);
    const minutes = Math.floor((abs - degrees) * 60);
    const seconds = ((abs - degrees) * 60 - minutes) * 60;
    
    const direction = type === 'lat' 
      ? (value >= 0 ? 'N' : 'S')
      : (value >= 0 ? 'E' : 'W');
    
    return `${degrees}°${minutes}'${seconds.toFixed(1)}"${direction}`;
  };

  return (
    <div className="absolute bottom-2 left-2 z-40 pointer-events-none">
      <div className="bg-black/20 backdrop-blur-sm rounded-md px-2 py-1 flex items-center gap-1">
        <MapPin className="h-2 w-2 text-white/70" />
        <div className="text-[9px] text-white/80 leading-tight">
          <div>{latitude.toFixed(3)}, {longitude.toFixed(3)}</div>
          <div className="text-[8px] text-white/60">
            {formatCoordinate(latitude, 'lat')} {formatCoordinate(longitude, 'lng')}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoordinateDisplay;