

````markdown
# **PF-CAELUS**

### Modern Weather Intelligence Platform — 2D + 3D, AI-Enhanced, Client-Side

---

## 1. Introduction & Overview

**Product:**  
PF-CAELUS is a modern, client-side weather intelligence platform that merges **2D mapping (Leaflet)** and a **3D globe (Cesium)** into a single **React + TypeScript SPA**.  
It integrates **OpenWeatherMap** for current/forecast/AQI data, **NASA GIBS** for satellite layers, and optional **AI-generated weather summaries** via OpenAI or Hugging Face.

**Audience:**  
Analysts, emergency/disaster response teams, aviation/maritime operations, energy/utilities, agriculture, outdoor logistics, and weather enthusiasts.

**Value:**  
Fast, interactive visualization; dual 2D/3D perspectives; unified overlays; configurable units/time; AI-assisted context; quick snapshot sharing.

**High-level Architecture:**
- **Presentation:** React 18 + Vite + Tailwind + shadcn/ui  
- **Map Engines:** Leaflet (2D), Cesium (3D)  
- **Data Sources:** OpenWeatherMap (REST + tiles), NASA GIBS (WMTS), optional AI providers  
- **State:** SettingsContext (preferences) + local component state  
- **Caching:** In-memory caching of weather requests (5 min TTL)

**Repository Structure (key paths):**
- `src/pages/Index.tsx` — main orchestrator  
- `src/components/WeatherMap.tsx`, `Globe3D.tsx` — mapping engines  
- `src/components/LayerSelector.tsx`, `MapControls.tsx`, `Timeline.tsx` — controls  
- `src/context/SettingsContext.tsx` — user settings  
- `src/lib/utils.ts`, `aiService.ts` — utilities and AI logic  
- `src/types/leaflet-velocity.d.ts` — velocity type definitions  

---

## 2. Business & Strategy

**Problem:**  
Weather data is fragmented across APIs, tools, and modalities (tiles, vectors, satellite). Teams need a single, intuitive operational picture to explore conditions quickly, with context.

**Solution Strategy:**
- Unify data sources with a dual-view interface  
- Provide AI-assisted summaries to improve comprehension and speed  
- Maintain a lightweight client-first footprint for easy deployment  

**Target Segments:**  
Public safety/emergency, aviation/maritime ops, field services, energy/utilities, agri-tech, education.

**Differentiators:**
- Seamless 2D/3D switching with shared state  
- Configurable units, time formats, and preferences  
- Optional AI summaries for interpretability  
- Modern UI (shadcn/ui, Tailwind) focused on clarity and speed  

**KPIs:**
- Time-to-insight for an AOI (Area of Interest)  
- User engagement with layers  
- Tile/API error rates; cache hit rate  
- Performance metrics (TTI, memory footprint)  

**Dependencies/Costs (indicative):**
- OpenWeatherMap: free/paid tiers  
- Cesium Ion: free token tier; higher usage may require plan  
- Optional AI: OpenAI/Hugging Face cost per call if enabled  

---

## 3. Technical Documentation

**Core Technologies:**
- React 18 + TypeScript + Vite  
- Tailwind CSS + shadcn/ui  
- Leaflet (2D) and Cesium (3D)  
- React Router DOM (SPA), in-memory caching, server-state patterns  

**Key Modules:**
- `Index.tsx` — orchestrates app, view toggle, overlays, modals  
- `WeatherMap.tsx` — Leaflet map, weather layers, measurement, AI summaries  
- `Globe3D.tsx` — Cesium viewer, imagery, weather integration  
- `LayerSelector.tsx` — smooth basemap and overlay selection  
- `MapControls.tsx` — zoom, toggles, 2D/3D switch  
- `Timeline.tsx` — time slider and animation controls  
- `SettingsContext.tsx` — preferences (units, time, animation speed, language)  
- `utils.ts` — conversions and formatting  
- `aiService.ts` — AI provider abstraction with caching  

**Environment Variables:**
```env
VITE_OPENWEATHER_KEY=your_openweather_api_key
VITE_CESIUM_TOKEN=your_cesium_ion_token
VITE_GIBS_API_KEY=optional
VITE_OPENAI_KEY=optional
VITE_OPENAI_MODEL=optional
VITE_HUGGINGFACE_KEY=optional
VITE_HUGGINGFACE_MODEL=optional
````

**Data Flow Example:**
User click → get lat/lon → fetch weather from OpenWeather → cache → display weather panel → request AI summary asynchronously.

**Caching & Rate Limiting:**

* In-memory cache by coordinates (rounded)
* 5 min TTL for weather; 10 min TTL for AI summaries
* Tile requests limited by providers

**Error Handling:**

* Robust text parsing of API responses
* Graceful fallbacks for missing keys

**Performance:**

* Lazy-load Cesium
* Optimized tile requests and controlled opacity
* Targeted effects minimize re-renders

**Build Scripts:**

```bash
npm run dev       # start dev server
npm run build     # production build
npm run build:dev # development build
npm run preview   # preview production build
npm run lint      # lint project
```

---

## 4. Core Features

* **Dual 2D/3D Views:** Toggle between Leaflet and Cesium, preserving layers
* **Weather Overlays:** Temperature, precipitation, wind, pressure, clouds, snow, GIBS fallbacks
* **Weather Panel:** Current weather, short-range forecast, AQI, unit/time conversions
* **AI Weather Summaries:** Optional contextual AI explanations
* **Search & Geolocation:** Find places or locate current position
* **Measurement Tool (2D):** Click two points to measure distances
* **Timeline Controls:** Time slider and playback animation
* **Snapshots:** Capture branded image of current map view
* **Preferences:** Units, time format, animation speed, etc.

---

## 5. User Guide & Training

**Prerequisites:**

* Node.js + npm
* API keys (OpenWeather & Cesium required)

**Setup:**

```bash
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>
npm install
cp .env.example .env   # fill in keys
npm run dev
```

**Typical Workflows:**

* Explore AOI → toggle layers → click for weather
* Switch to 3D → confirm matching layers
* Measure distance → ESC to exit
* Geolocate → fetch weather for current position
* Take snapshot → download branded image

**Tips:**

* If tiles load slowly, reduce overlays
* Check geolocation permissions
* AI summaries need valid keys

---

## 6. Deployment & Maintenance

**Hosting:**

* Built with Vite — deploy to Netlify, Vercel, S3+CloudFront, etc.
* Cesium assets handled via `vite-plugin-cesium`

**Environment Management:**

* Use `VITE_` vars for public keys only
* For AI keys, use a backend proxy

**Observability:**

* Monitor rate limits and errors via provider dashboards
* Use browser DevTools for troubleshooting

**Quality & Scaling:**

* Regular linting
* Add CI/CD smoke tests
* Consider backend aggregation for scaling

---

## 7. Security & Compliance

* **Secrets:** Never hardcode keys; use `.env`
* **Client Constraints:** Assume public exposure of client-side keys
* **Data Handling:** No PII; geolocation opt-in; privacy-compliant extensions
* **Provider Terms:** Respect OpenWeatherMap, Cesium Ion, NASA GIBS, OpenAI/HF usage rules
* **App Security:** CSP headers, avoid `eval`, keep dependencies updated

---

## 8. Future Roadmap

* Wind/current animations (leaflet-velocity)
* Additional sources (Meteo, ECMWF, radar, lightning)
* Alerts and AOI subscriptions (backend + auth)
* Offline/PWA caching
* Collaboration (shared states, annotations)
* Virtualized panels, tile optimizations
* Component and E2E testing

---

## 9. Appendices

**Environment Variables (Summary):**

* **Required:** `VITE_OPENWEATHER_KEY`, `VITE_CESIUM_TOKEN`
* **Optional:** GIBS, OpenAI, Hugging Face

**NPM Scripts:** `dev`, `build`, `build:dev`, `preview`, `lint`

**Key Dependencies:**

* Maps: `leaflet`, `cesium`, `resium`, `vite-plugin-cesium`
* UI: `react`, `react-router-dom`, `shadcn/ui`, `tailwind`, `lucide-react`
* Data: `@tanstack/react-query`, `date-fns`, `zod`
* AI: `openai`, Hugging Face inference API

**File Index (selected):**

```
src/pages/Index.tsx
src/components/{WeatherMap.tsx, Globe3D.tsx, LayerSelector.tsx, MapControls.tsx, Timeline.tsx}
src/context/SettingsContext.tsx
src/lib/{utils.ts, aiService.ts}
src/types/leaflet-velocity.d.ts
```

**Glossary:**

* **AOI:** Area of Interest
* **AQI:** Air Quality Index
* **GIBS:** NASA Global Imagery Browse Services
* **TTL:** Time To Live (cache lifetime)
* **PWA:** Progressive Web App

---

© 2025 PF-CAELUS — *Open, Intelligent, Visual Weather Insight.*
