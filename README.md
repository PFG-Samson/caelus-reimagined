# Welcome PF-CAELUS

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Create a .env file with required API keys (see below)

# Step 5: Start the development server with auto-reloading and an instant preview.
npm run dev
```

## Environment Variables

Create a `.env` file in the project root with the following API keys:

```bash
# Required for weather data
VITE_OPENWEATHER_KEY=your_openweather_api_key

# Required for 3D globe functionality
VITE_CESIUM_TOKEN=your_cesium_ion_token

# Optional: For NASA satellite imagery
VITE_GIBS_API_KEY=your_nasa_gibs_key

# AI Weather Summaries (choose one or both)
VITE_OPENAI_KEY=your_openai_api_key
VITE_OPENAI_MODEL=gpt-3.5-turbo
# OR
VITE_HUGGINGFACE_KEY=your_huggingface_api_key
VITE_HUGGINGFACE_MODEL=microsoft/DialoGPT-medium
```

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
