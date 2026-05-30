# CAELUS Reimagined

Welcome to **CAELUS Reimagined** - a next-generation interactive meteorological and geospatial intelligence platform. CAELUS provides real-time situational awareness by aggregating global weather signals, evaluating localized risk rules via a sophisticated rule-engine, and presenting insights through both 2D mapping and high-fidelity 3D Globe visualization.

![CAELUS Intelligence](/assets/preview.png) *(Note: Placeholder for actual screenshot)*

## 🌟 Key Features

### 📡 Intelligence Layer Backend (Node.js & Express)
*   **Unified Insights API**: Aggregates current weather, 5-day forecasts, and air pollution metrics in parallel using an optimized caching system (5-min TTL).
*   **Geospatial Rule Engine**: Uses PostGIS and Prisma to match locations to defined geographic zones (e.g., airports, industrial sectors).
*   **Dynamic Risk Evaluation**: Evaluates incoming weather signals against both global and zone-specific thresholds (e.g., generating a "Critical" alert if temperature > 35°C in an airport zone).
*   **Robust Input Validation**: Strict payload validation and sanitization using Zod.

### 🗺️ Interactive Frontend (React, Vite, Tailwind CSS)
*   **3D Globe (CesiumJS)**: Fully interactive 3D representation of the Earth with real-time weather overlays and zone highlighting.
*   **2D Map (Leaflet)**: Smooth, tactical 2D mapping interface for focused operations.
*   **Intelligence Summary Panel**: Glassmorphic, highly responsive UI element displaying dynamic status alerts, micro-progress bars for current weather signals (AQI, Temperature, Wind), and an intuitive hourly/daily forecast timeline.

---

## 🛠️ Technology Stack

**Frontend:**
*   React 18 & Vite
*   TypeScript
*   Tailwind CSS & shadcn/ui (Glassmorphism aesthetics)
*   CesiumJS (3D Globe) & React-Leaflet (2D Maps)
*   React Query & Zustand (State Management)

**Backend:**
*   Node.js & Express
*   TypeScript
*   Prisma ORM & PostgreSQL (with PostGIS extension)
*   Zod (Schema Validation)
*   Axios & OpenWeatherMap API

---

## 🚀 Getting Started

### Prerequisites
*   Node.js (v18+ recommended)
*   PostgreSQL with the PostGIS extension installed and running.

### 1. Environment Configuration

Create a `.env` file in the root of the project with the following keys:

```bash
# ----- BACKEND CONFIG -----
# OpenWeather API Key (Used by backend proxy)
OPENWEATHER_KEY=your_openweather_api_key

# Database connection string (Must support PostGIS)
DATABASE_URL="postgresql://user:password@localhost:5432/caelus?schema=public"

# Backend Port
PORT=3001

# ----- FRONTEND CONFIG -----
# API Base URL (Point to live Render server in production/local development)
VITE_API_URL=https://caelus-intelligence-layer.onrender.com

# Cesium Ion Token for 3D globe tiles
VITE_CESIUM_TOKEN=your_cesium_ion_token

# (Optional) NASA satellite imagery
VITE_GIBS_API_KEY=your_nasa_gibs_key
```

### 2. Database Setup

Navigate to the `server` directory and initialize the database schema:

```bash
cd server
npm install
npx prisma generate
npx prisma db push
```

*Note: The backend will automatically seed default rules and geographic zones on its first startup.*

### 3. Running the Application

You can start both the backend and frontend development servers concurrently:

```bash
# In the server directory:
npm run dev

# In a new terminal, from the project root:
npm install
npm run dev
```

The frontend will be available at `http://localhost:8080` (or `8081`), and the backend API will be available at `http://localhost:3001`.

---

## 🏗️ Architecture Overview

The application follows a decoupled client-server architecture:

1.  **Client:** The React frontend makes requests to the backend for insights and zones. It handles the heavy lifting of rendering 3D/2D maps and the responsive UI panels.
2.  **API Gateway:** The `server/src/index.ts` acts as an Express gateway.
3.  **Data Fetching & Caching:** The `/api/insights` endpoint orchestrates requests to the OpenWeatherMap API and caches the results to minimize latency and API costs.
4.  **Spatial Engine:** The backend queries the PostGIS database to find intersections between the requested coordinates and defined operational zones.
5.  **Evaluator:** The `evaluate()` function processes the raw weather signals against the database rules to generate actionable alerts.

---

## 🌐 Production Deployment

The project is deployed in a fully decoupled multi-cloud configuration:

### 1. Frontend: Vercel SPA (`https://pfcaelus.vercel.app`)
*   **Hosting:** Hosted as a high-performance static React Single Page Application on Vercel's Edge Network.
*   **Reverse Proxy (`vercel.json`):** Any relative query starting with `/api` is reverse-proxied by Vercel server-side to the Render backend, preventing CORS preflight issues and keeping all traffic secure and uniform.
*   **SPA Routing Fallback:** Non-API routes are rewritten to `/index.html` to avoid `404` errors when refreshing routes in the browser.

### 2. Backend: Render Intelligence Layer (`https://caelus-intelligence-layer.onrender.com`)
*   **Hosting:** Express & PostGIS server deployed as a Render Web Service.
*   **Database:** A Neon Serverless PostgreSQL instance running PostGIS v3.5, managed via Prisma ORM.

---

## 📄 License

This project is licensed under the MIT License.
