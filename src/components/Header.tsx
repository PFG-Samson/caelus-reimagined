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
    <header className="absolute top-4 left-0 right-0 z-50 flex items-center justify-center pointer-events-none px-4">
      {/* Logo Section */}
      <div className="flex items-center gap-3 px-6 py-2 pointer-events-auto">
        <img src={caelusLogo} alt="CAELUS" className="h-10 w-auto" />
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">CAELUS</h1>
          <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] leading-none">Weather Intelligence</p>
        </div>
      </div>

      {/* Right Side Controls */}
      <div className="absolute right-4 flex items-center gap-2 pointer-events-auto">
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
