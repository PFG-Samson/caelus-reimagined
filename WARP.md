# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Commands

### Development Commands
- `npm run dev` - Start development server on port 8080
- `npm run build` - Build for production
- `npm run build:dev` - Build in development mode
- `npm run lint` - Run ESLint for code quality
- `npm run preview` - Preview production build

### Common Single Commands
- Test a specific component: Focus on the component file and use `npm run dev` to see changes
- Add shadcn/ui components: `npx shadcn@latest add [component-name]`
- Environment setup: Copy required API keys to `.env` file (see Environment Variables section)

## Architecture Overview

PF-Caelus is a weather intelligence platform built as a React SPA with dual-view capabilities (2D maps and 3D globe). The application integrates multiple weather data sources and provides interactive visualization tools.

### Core Technologies
- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS with custom weather theme extensions
- **UI Components**: shadcn/ui (Radix-based) with extensive component library
- **3D Visualization**: Cesium for globe view with realistic lighting
- **2D Maps**: Leaflet for traditional map views
- **State Management**: React Context (SettingsContext) + React Query for server state
- **Routing**: React Router DOM

### Key Architecture Components

#### Dual View System
The application centers around a sophisticated dual-view system managed in `src/pages/Index.tsx`:
- **2D View**: `WeatherMap.tsx` using Leaflet with weather overlays
- **3D View**: `Globe3D.tsx` using Cesium with globe visualization
- Both views share the same weather data sources and coordinate system
- Seamless switching between views with preserved state

#### Weather Data Integration
- **Primary API**: OpenWeatherMap for current weather, forecasts, and air quality
- **Satellite Data**: NASA GIBS for satellite imagery overlays
- **Tile Services**: Multiple weather layer providers with caching
- **AI Enhancement**: OpenAI integration for weather summaries (optional)

#### Component Architecture
- **Main Layout**: Single-page application with overlay-based UI
- **Weather Components**: Specialized components for different weather data types
- **Interactive Tools**: Measurement tools, search functionality, timeline controls
- **Settings System**: Comprehensive unit conversion and preference management

### Environment Variables
Required API keys (create `.env` file):
```
VITE_OPENWEATHER_KEY=your_openweather_api_key
VITE_CESIUM_TOKEN=your_cesium_ion_token
VITE_GIBS_API_KEY=your_nasa_gibs_key (optional)
VITE_OPENAI_KEY=your_openai_key (optional)
VITE_OPENAI_MODEL=gpt-3.5-turbo (optional)
```

### Code Organization

#### `/src/components/`
- **Weather Components**: `WeatherMap.tsx`, `Globe3D.tsx`, `WeatherPopup.tsx`
- **UI Controls**: `Header.tsx`, `LayerSelector.tsx`, `Timeline.tsx`, `MapControls.tsx`
- **Modals**: `SearchModal.tsx`, `SettingsModal.tsx`, `LocationModal.tsx`
- **Utility Components**: `CoordinateDisplay.tsx`
- **`/ui/`**: Complete shadcn/ui component library

#### `/src/context/`
- `SettingsContext.tsx`: Global settings management with reducer pattern
- Handles units, time formats, animation speeds, and user preferences

#### `/src/lib/`
- `utils.ts`: Comprehensive utility functions for unit conversions and formatting
- Handles temperature, wind speed, pressure, distance, and time conversions

#### `/src/hooks/`
- Custom hooks including `use-mobile.tsx` for responsive behavior
- Toast notifications system

#### `/src/types/`
- TypeScript definitions for external libraries (e.g., leaflet-velocity)

### Development Patterns

#### State Management Pattern
- Context providers for global state (settings, theme)
- React Query for server state and caching
- Local state for component-specific UI state
- Refs for imperative API access (map controls)

#### Component Communication
- Parent-child props for direct relationships
- Context for global state access
- Ref forwarding for imperative map operations
- Event callbacks for user interactions

#### Data Flow
1. User interaction triggers event handler
2. Event handler updates relevant state
3. State changes propagate to child components
4. Weather data fetched via React Query with caching
5. UI updates reflect new state/data

### Map Integration Specifics

#### Leaflet (2D Maps)
- Custom tile layers for different basemaps
- Weather overlay system with multiple simultaneous layers
- Interactive measurement tools with distance calculation
- Marker system for location pinning
- Custom popup system for weather data display

#### Cesium (3D Globe)
- Ion-based terrain and imagery
- Dynamic weather layer overlay system
- Realistic lighting and globe rotation
- Entity system for location markers
- Camera controls for smooth navigation

### Styling System

#### Tailwind Configuration
- Custom color system with weather-specific colors
- CSS variables for theme switching
- Extended spacing and sizing for map interfaces
- Custom gradients for weather visualization

#### Component Styling
- shadcn/ui base components with weather theme extensions
- Responsive design patterns for different screen sizes
- Dark/light theme support through CSS variables
- Custom animations for weather data transitions

## Development Notes

### Adding Weather Layers
- Update layer definitions in both `WeatherMap.tsx` and `Globe3D.tsx`
- Add corresponding UI controls in `LayerSelector.tsx`
- Ensure consistent naming across 2D and 3D implementations

### API Integration
- All weather APIs use caching with 5-minute TTL
- Error handling includes fallback mechanisms
- Rate limiting considerations for tile services

### Performance Considerations
- Weather data caching prevents redundant API calls
- Lazy loading of heavy components (Cesium)
- Optimized tile loading for smooth map interactions
- Memory management for long-running sessions

### Testing Approach
- Focus on component integration rather than unit tests
- Test with real API keys in development
- Verify weather data accuracy across different locations
- Test responsive behavior across device sizes