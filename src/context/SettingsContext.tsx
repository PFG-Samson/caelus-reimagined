import React, { createContext, useContext, useReducer, ReactNode } from "react";

type TimeState = {
  timezone: "local" | "utc";
  format: "12h" | "24h";
  forecastView: "daily" | "hourly";
};

type AnimationState = {
  speed: "slow" | "medium" | "fast";
};

type UnitsState = {
  temperature: "C" | "F";
  windspeed: "km/h" | "m/s" | "mph" | "knots" | "bft";
  windDirection: "compass" | "degrees";
  precipitation: "mm/h" | "in/hr" | "dBZ";
  pressure: "hPa" | "mb" | "mmHg" | "inHg";
  distance: "km" | "miles" | "nautical";
  area: "km²" | "sq_mi" | "acres" | "hectares";
  coordinates: "dms" | "decimal";
};

type SettingsState = {
  time: TimeState;
  animation: AnimationState;
  units: UnitsState;
  language: string;
};

type SettingsAction =
  | { type: "SET_TIMEZONE"; payload: TimeState["timezone"] }
  | { type: "SET_TIME_FORMAT"; payload: TimeState["format"] }
  | { type: "SET_FORECAST_VIEW"; payload: TimeState["forecastView"] }
  | { type: "SET_ANIMATION_SPEED"; payload: AnimationState["speed"] }
  | { type: "SET_UNIT"; payload: { key: keyof UnitsState; value: string } }
  | { type: "SET_LANGUAGE"; payload: string };

const initialState: SettingsState = {
  time: {
    timezone: "local",
    format: "24h",
    forecastView: "daily",
  },
  animation: {
    speed: "medium",
  },
  units: {
    temperature: "C",
    windspeed: "km/h",
    windDirection: "compass",
    precipitation: "mm/h",
    pressure: "hPa",
    distance: "km",
    area: "km²",
    coordinates: "decimal",
  },
  language: "en",
};

function settingsReducer(state: SettingsState, action: SettingsAction): SettingsState {
  switch (action.type) {
    case "SET_TIMEZONE":
      return { ...state, time: { ...state.time, timezone: action.payload } };
    case "SET_TIME_FORMAT":
      return { ...state, time: { ...state.time, format: action.payload } };
    case "SET_FORECAST_VIEW":
      return { ...state, time: { ...state.time, forecastView: action.payload } };
    case "SET_ANIMATION_SPEED":
      return { ...state, animation: { speed: action.payload } };
    case "SET_UNIT":
      return {
        ...state,
        units: { ...state.units, [action.payload.key]: action.payload.value },
      };
    case "SET_LANGUAGE":
      return { ...state, language: action.payload };
    default:
      return state;
  }
}

const SettingsContext = createContext<
  { state: SettingsState; dispatch: React.Dispatch<SettingsAction> } | undefined
>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(settingsReducer, initialState);
  return (
    <SettingsContext.Provider value={{ state, dispatch }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) throw new Error("useSettings must be used within a SettingsProvider");
  return context;
}
