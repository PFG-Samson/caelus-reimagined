// src/components/Header.tsx
import React from "react";
import { Search, Settings, Info, Share, MapPin, Ruler, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import caelusLogo from "@/assets/app-logo.png";

interface HeaderProps {
  onSearchClick?: () => void;
  onWorldViewClick?: () => void; // new optional prop
  onSettingsClick?: () => void;
  onAboutClick?: () => void;
  onShareClick?: () => void;
  onLocationClick?: () => void;
  onMeasureClick?: () => void;
  onSearchSubmit?: (query: string) => void;
}

const Header: React.FC<HeaderProps> = ({
  onSearchClick = () => { },
  onSettingsClick = () => { },
  onAboutClick = () => { },
  onShareClick = () => { },
  onLocationClick = () => { },
  onMeasureClick = () => { },
  onWorldViewClick = () => { },
  onSearchSubmit = () => { },
}) => {
  return (
    <header className="absolute top-6 left-0 right-0 z-50 flex items-center justify-center pointer-events-none px-4 select-none">
      {/* Centered Branding Section */}
      <div className="flex items-center gap-5 px-8 py-3 pointer-events-auto group">
        <div className="relative">
          <img
            src={caelusLogo}
            alt="CAELUS"
            className="h-16 w-auto drop-shadow-[0_0_15px_rgba(56,189,248,0.4)] group-hover:drop-shadow-[0_0_20px_rgba(56,189,248,0.6)] transition-all duration-300"
          />
        </div>

        <div className="flex flex-col items-start justify-center">
          <h1
            className="text-4xl font-extrabold text-white tracking-tight leading-none"
            style={{
              fontFamily: "'Outfit', sans-serif",
              textShadow: '0 2px 10px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.4)'
            }}
          >
            CAELUS
          </h1>
          <p
            className="text-[14px] font-bold text-white uppercase tracking-[0.3em] leading-none mt-2"
            style={{
              fontFamily: "'Outfit', sans-serif",
              textShadow: '0 2px 8px rgba(0,0,0,1)'
            }}
          >
            Weather Intelligence
          </p>
        </div>
      </div>

      {/* Right Side Navigation Controls */}
      <div className="absolute right-6 flex items-center gap-3 pointer-events-auto">
        <Button
          variant="secondary"
          size="sm"
          className="map-control"
          onClick={onLocationClick}
          title="My Location"
          aria-label="My location"
        >
          <MapPin className="h-4 w-4" />
        </Button>

        <Button
          variant="secondary"
          size="sm"
          className="map-control"
          onClick={onSearchClick}
          title="Search Location"
          aria-label="Search location"
        >
          <Search className="h-4 w-4" />
        </Button>

        {/* World view button */}
        <Button
          variant="secondary"
          size="sm"
          className="map-control"
          onClick={onWorldViewClick}
          title="Zoom to world view"
          aria-label="Zoom to world view"
        >
          <Globe className="h-4 w-4" />
        </Button>

        <Button
          variant="secondary"
          size="sm"
          className="map-control"
          onClick={onSettingsClick}
          title="Settings"
          aria-label="Settings"
        >
          <Settings className="h-4 w-4" />
        </Button>

        <Button
          variant="secondary"
          size="sm"
          className="map-control"
          onClick={onAboutClick}
          title="About"
          aria-label="About"
        >
          <Info className="h-4 w-4" />
        </Button>

        <Button
          variant="secondary"
          size="sm"
          className="map-control"
          onClick={onShareClick}
          title="Share"
          aria-label="Share"
        >
          <Share className="h-4 w-4" />
        </Button>


        <Button
          variant="secondary"
          size="sm"
          className="map-control"
          onClick={onMeasureClick}
          title="Measure"
          aria-label="Measure"
        >
          <Ruler className="h-4 w-4" />
        </Button>


      </div>
    </header>
  );
};

export default Header;
