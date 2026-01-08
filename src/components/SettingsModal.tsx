import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useSettings } from "@/context/SettingsContext";

export default function SettingsModal({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { state, dispatch } = useSettings();

  const unitOptions: Record<string, string[]> = {
    temperature: ["C", "F"],
    windspeed: ["km/h", "m/s", "mph", "knots", "bft"],
    windDirection: ["compass", "degrees"],
    precipitation: ["mm/h", "in/hr", "dBZ"],
    pressure: ["hPa", "mb", "mmHg", "inHg"],
    distance: ["km", "miles", "nautical"],
    area: ["km²", "sq_mi", "acres", "hectares"],
    coordinates: ["decimal", "dms"],
  };

  const resetDefaults = () => {
    dispatch({ type: "SET_TIMEZONE", payload: "local" });
    dispatch({ type: "SET_TIME_FORMAT", payload: "24h" });
    dispatch({ type: "SET_FORECAST_VIEW", payload: "daily" });
    dispatch({ type: "SET_ANIMATION_SPEED", payload: "medium" });

    Object.entries(unitOptions).forEach(([key, options]) => {
      dispatch({ type: "SET_UNIT", payload: { key: key as keyof typeof state.units, value: options[0] } });
    });

    dispatch({ type: "SET_LANGUAGE", payload: "en" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="
          sm:max-w-lg max-h-[80vh] overflow-y-auto
          bg-white/20 dark:bg-gray-900/30
          backdrop-blur-lg
          border border-white/10
          shadow-2xl
          rounded-2xl
          text-gray-800 dark:text-gray-100
          space-y-6
          p-4
        "
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">⚙️ Global Settings</DialogTitle>
        </DialogHeader>

        {/* TIME SETTINGS */}
        <section className="space-y-3">
          <h3 className="font-semibold text-lg">🕒 Time</h3>

          {/* Timezone */}
          <div>
            <Label className="text-sm">Timezone</Label>
            <div className="flex gap-2 mt-2">
              {["local", "utc"].map((tz) => (
                <Button
                  key={tz}
                  variant={state.time.timezone === tz ? "default" : "outline"}
                  size="sm"
                  className="rounded-full"
                  onClick={() => dispatch({ type: "SET_TIMEZONE", payload: tz as "local" | "utc" })}
                >
                  {tz.toUpperCase()}
                </Button>
              ))}
            </div>
          </div>

          {/* Time Format */}
          <div className="flex items-center justify-between">
            <Label className="text-sm">24h Time</Label>
            <Switch
              checked={state.time.format === "24h"}
              onCheckedChange={(checked) =>
                dispatch({ type: "SET_TIME_FORMAT", payload: checked ? "24h" : "12h" })
              }
              className="data-[state=checked]:bg-sky-400 data-[state=unchecked]:bg-gray-400"
            />
          </div>

          {/* Forecast View */}
          <div>
            <Label className="text-sm">Forecast View</Label>
            <div className="flex gap-2 mt-2">
              {["daily", "hourly"].map((view) => (
                <Button
                  key={view}
                  variant={state.time.forecastView === view ? "default" : "outline"}
                  size="sm"
                  className="rounded-full"
                  onClick={() => dispatch({ type: "SET_FORECAST_VIEW", payload: view as "daily" | "hourly" })}
                >
                  {view}
                </Button>
              ))}
            </div>
          </div>
        </section>

        {/* ANIMATION SETTINGS */}
        <section className="space-y-3">
          <h3 className="font-semibold text-lg">🎞 Animation</h3>
          <Label className="text-sm">Speed</Label>
          <Slider
            value={[
              state.animation.speed === "slow" ? 1 :
              state.animation.speed === "medium" ? 2 : 3
            ]}
            min={1}
            max={3}
            step={1}
            onValueChange={(value) =>
              dispatch({
                type: "SET_ANIMATION_SPEED",
                payload: value[0] === 1 ? "slow" : value[0] === 2 ? "medium" : "fast"
              })
            }
            className="mt-1 accent-sky-400"
          />
        </section>

        {/* UNITS SETTINGS */}
        <section className="space-y-3">
          <h3 className="font-semibold text-lg">📏 Units</h3>
          {Object.entries(state.units).map(([key, value]) => (
            <div key={key}>
              <Label className="capitalize text-sm">{key}</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {unitOptions[key]?.map((opt) => (
                  <Button
                    key={opt}
                    size="sm"
                    variant={value === opt ? "default" : "outline"}
                    className="rounded-full"
                    onClick={() =>
                      dispatch({ type: "SET_UNIT", payload: { key: key as keyof typeof state.units, value: opt } })
                    }
                  >
                    {opt}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* LANGUAGE SETTINGS */}
        <section className="space-y-3">
          <h3 className="font-semibold text-lg">🌐 Language</h3>
          <div className="flex gap-2 flex-wrap">
            {["en", "fr", "es", "de"].map((lang) => (
              <Button
                key={lang}
                size="sm"
                variant={state.language === lang ? "default" : "outline"}
                className="rounded-full"
                onClick={() => dispatch({ type: "SET_LANGUAGE", payload: lang })}
              >
                {lang.toUpperCase()}
              </Button>
            ))}
          </div>
        </section>

        <DialogFooter className="flex justify-between mt-4">
          <Button
            variant="outline"
            size="sm"
            className="rounded-lg"
            onClick={resetDefaults}
          >
            Reset to Defaults
          </Button>
          <Button
            variant="default"
            size="sm"
            className="rounded-lg bg-sky-500 hover:bg-sky-600"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
