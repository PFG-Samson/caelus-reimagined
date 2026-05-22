import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  AlertCircle, Shield, Activity, RefreshCw, ChevronRight, ChevronDown,
  Thermometer, Wind, Droplets, Cloud, Eye, Sun, CloudRain, AlertTriangle, CheckCircle2
} from 'lucide-react';
import { Insight, WeatherSignal, ZoneSummary, Severity } from '@/types/intelligence';
import { cn } from '@/lib/utils';
import { useSettings } from '@/context/SettingsContext';
import {
  convertTemperature,
  getTemperatureUnit,
  convertWindSpeed,
  getWindSpeedUnit,
  convertWindDirection,
  convertPressure,
  getPressureUnit,
  formatTime
} from '@/lib/utils';

interface IntelligencePanelProps {
  insights: Insight[];
  signals: WeatherSignal[];
  zones: ZoneSummary[];
  forecast?: any;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  renderWeather: () => React.ReactNode;
  selectedZoneId?: string | null;
  onZoneSelect?: (zoneId: string) => void;
}

const severityConfig: Record<Severity, { color: string; icon: any }> = {
  critical: { color: 'bg-red-500/20 text-red-400 border-red-500/50', icon: AlertCircle },
  danger: { color: 'bg-orange-500/20 text-orange-400 border-orange-500/50', icon: AlertCircle },
  warning: { color: 'bg-amber-500/20 text-amber-400 border-amber-500/50', icon: AlertCircle },
  info: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/50', icon: Activity },
};

const signalConfig: Record<string, { icon: any; color: string; getPercent: (v: number) => number }> = {
  temperature: {
    icon: Thermometer,
    color: 'from-blue-500 via-emerald-500 to-red-500',
    getPercent: (v) => Math.min(100, Math.max(0, ((v - (-15)) / (45 - (-15))) * 100))
  },
  feels_like: {
    icon: Thermometer,
    color: 'from-blue-500 via-emerald-500 to-red-500',
    getPercent: (v) => Math.min(100, Math.max(0, ((v - (-15)) / (45 - (-15))) * 100))
  },
  wind_speed: {
    icon: Wind,
    color: 'from-sky-400 to-blue-600',
    getPercent: (v) => Math.min(100, Math.max(0, (v / 25) * 100))
  },
  wind_gust: {
    icon: Wind,
    color: 'from-blue-600 to-indigo-700',
    getPercent: (v) => Math.min(100, Math.max(0, (v / 30) * 100))
  },
  humidity: {
    icon: Droplets,
    color: 'from-sky-300 to-blue-500',
    getPercent: (v) => Math.min(100, Math.max(0, v))
  },
  pressure: {
    icon: Activity,
    color: 'from-violet-400 to-purple-600',
    getPercent: (v) => Math.min(100, Math.max(0, ((v - 950) / 100) * 100))
  },
  visibility: {
    icon: Eye,
    color: 'from-zinc-500 to-zinc-200',
    getPercent: (v) => Math.min(100, Math.max(0, (v / 10000) * 100))
  },
  cloudiness: {
    icon: Cloud,
    color: 'from-slate-500 to-slate-300',
    getPercent: (v) => Math.min(100, Math.max(0, v))
  },
  rainfall_1h: {
    icon: CloudRain,
    color: 'from-blue-400 to-blue-600',
    getPercent: (v) => Math.min(100, Math.max(0, (v / 15) * 100))
  },
  rainfall_3h: {
    icon: CloudRain,
    color: 'from-blue-500 to-blue-700',
    getPercent: (v) => Math.min(100, Math.max(0, (v / 25) * 100))
  },
  air_quality_index: {
    icon: Activity,
    color: 'from-emerald-500 via-yellow-500 to-red-500',
    getPercent: (v) => Math.min(100, Math.max(0, (v / 5) * 100))
  },
  uv_index: {
    icon: Sun,
    color: 'from-amber-400 to-red-600',
    getPercent: (v) => Math.min(100, Math.max(0, (v / 11) * 100))
  }
};

const IntelligenceSkeleton = () => (
  <div className="space-y-4 p-1">
    <Skeleton className="h-24 w-full rounded-xl bg-white/5 mb-4" />
    {[1, 2, 3].map((i) => (
      <Card key={i} className="bg-white/5 border-white/10 overflow-hidden">
        <CardHeader className="p-4 pb-2">
          <Skeleton className="h-4 w-3/4 mb-2 bg-white/5" />
          <Skeleton className="h-3 w-1/2 bg-white/5" />
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <Skeleton className="h-3 w-full mb-1 bg-white/5" />
          <Skeleton className="h-3 w-2/3 bg-white/5" />
        </CardContent>
      </Card>
    ))}
  </div>
);

const IntelligencePanel: React.FC<IntelligencePanelProps> = ({
  insights,
  signals,
  zones,
  forecast,
  loading,
  error,
  onRetry,
  renderWeather,
  selectedZoneId,
  onZoneSelect,
}) => {
  const { state } = useSettings();
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  // Unified Service Connection Failure Render
  if (error) {
    return (
      <div className="p-4 h-full flex flex-col justify-center select-none">
        <Card className="bg-red-500/10 border-red-500/50 text-white shadow-[0_0_20px_rgba(239,68,68,0.15)] rounded-xl">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-red-400">
              <AlertCircle size={18} />
              Service Connection Failed
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-4">
            <p className="text-xs text-white/70 leading-relaxed">
              We encountered an issue retrieving weather intelligence for this location. The server might be unreachable or returned an internal error.
            </p>
            {error && (
              <div className="p-2.5 bg-black/35 rounded-lg border border-white/5 font-mono text-[10px] text-red-300 break-all max-h-24 overflow-y-auto">
                Details: {error}
              </div>
            )}
            <button
              onClick={onRetry}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 active:bg-white/5 border border-white/10 rounded-lg transition-all text-xs font-semibold text-white"
            >
              <RefreshCw size={12} className="animate-spin-once" />
              Retry Connection
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Group forecast by day (calendar date in local context)
  const groupForecastByDay = () => {
    if (!forecast || !forecast.list) return [];
    
    const dailyMap: Record<string, any[]> = {};
    forecast.list.forEach((item: any) => {
      const dateKey = item.dt_txt.split(' ')[0];
      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = [];
      }
      dailyMap[dateKey].push(item);
    });

    return Object.entries(dailyMap).map(([dateStr, items]) => {
      const temps = items.map(it => it.main.temp);
      const tempMin = Math.min(...temps);
      const tempMax = Math.max(...temps);

      const midItem = items[Math.floor(items.length / 2)] || items[0];
      const icon = midItem.weather[0]?.icon || '01d';
      const description = midItem.weather[0]?.description || 'clear sky';
      const maxPop = Math.max(...items.map(it => it.pop ?? 0));
      const avgHumidity = Math.round(items.reduce((sum, it) => sum + it.main.humidity, 0) / items.length);
      const avgWind = items.reduce((sum, it) => sum + it.wind.speed, 0) / items.length;

      return {
        dateStr,
        date: new Date(dateStr + 'T12:00:00'),
        tempMin,
        tempMax,
        icon,
        description,
        maxPop,
        avgHumidity,
        avgWind,
        items
      };
    });
  };

  const getOverallStatus = () => {
    if (insights.length === 0) {
      return {
        label: 'Nominal Conditions',
        description: 'All weather parameters are within safe operational limits.',
        color: 'border-emerald-500/20 bg-emerald-950/10 text-emerald-400',
        glow: 'shadow-[0_0_15px_rgba(16,185,129,0.1)]',
        badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        icon: CheckCircle2,
      };
    }

    const severities = insights.map((i) => i.severity);
    if (severities.includes('critical')) {
      return {
        label: 'Critical Hazard Warning',
        description: `${insights.filter(i => i.severity === 'critical').length} severe hazard(s) active. Immediate attention required.`,
        color: 'border-red-500/30 bg-red-950/15 text-red-400',
        glow: 'shadow-[0_0_20px_rgba(239,68,68,0.2)] animate-pulse',
        badge: 'bg-red-500/20 text-red-300 border-red-500/30',
        icon: AlertTriangle,
      };
    }
    if (severities.includes('danger')) {
      return {
        label: 'Elevated Danger Level',
        description: `${insights.filter(i => i.severity === 'danger').length} hazardous rule(s) triggered. Monitor closely.`,
        color: 'border-orange-500/20 bg-orange-950/10 text-orange-400',
        glow: 'shadow-[0_0_15px_rgba(249,115,22,0.1)]',
        badge: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
        icon: AlertCircle,
      };
    }
    if (severities.includes('warning')) {
      return {
        label: 'Advisory Advisory Alert',
        description: `${insights.filter(i => i.severity === 'warning').length} active caution alert(s) on monitored limits.`,
        color: 'border-amber-500/20 bg-amber-950/10 text-amber-400',
        glow: 'shadow-[0_0_15px_rgba(245,158,11,0.1)]',
        badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        icon: AlertCircle,
      };
    }
    return {
      label: 'Operational Info Active',
      description: `${insights.length} general notice(s) active.`,
      color: 'border-blue-500/20 bg-blue-950/10 text-blue-400',
      glow: 'shadow-[0_0_15px_rgba(59,130,246,0.1)]',
      badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      icon: Activity,
    };
  };

  const status = getOverallStatus();
  const StatusIcon = status.icon;

  const dailyForecasts = groupForecastByDay();
  const hourlyForecast = forecast?.list?.slice(0, 8) || [];

  return (
    <Tabs defaultValue="intelligence" className="w-full flex flex-col h-full">
      <div className="px-4 py-2 border-b border-white/10 sticky top-0 bg-black/40 backdrop-blur-md z-10">
        <TabsList className="grid w-full grid-cols-3 bg-white/5 border border-white/10">
          <TabsTrigger value="intelligence" className="data-[state=active]:bg-white/10 text-xs font-semibold">Intelligence</TabsTrigger>
          <TabsTrigger value="weather" className="data-[state=active]:bg-white/10 text-xs font-semibold">Weather</TabsTrigger>
          <TabsTrigger value="forecast" className="data-[state=active]:bg-white/10 text-xs font-semibold">Forecast</TabsTrigger>
        </TabsList>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
        <TabsContent value="intelligence" className="p-4 m-0 space-y-6 focus-visible:ring-0">
          {loading ? (
            <IntelligenceSkeleton />
          ) : (
            <>
              {/* Overall Status Card */}
              <div className={cn(
                "p-4 rounded-xl border flex gap-3 transition-all duration-300",
                status.color,
                status.glow
              )}>
                <div className="mt-0.5 shrink-0">
                  <StatusIcon size={20} />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold tracking-tight">{status.label}</h4>
                    <Badge variant="outline" className={cn("text-[9px] font-semibold py-0 px-1.5 uppercase", status.badge)}>
                      {insights.length} Alerts
                    </Badge>
                  </div>
                  <p className="text-xs text-white/70 leading-normal">{status.description}</p>
                </div>
              </div>

              {/* Risk Alerts */}
              <section className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-widest text-white/50 flex items-center gap-2 px-1">
                  <Shield size={14} />
                  Risk Assessments
                </h3>
                {insights.length === 0 ? (
                  <div className="p-8 text-center bg-white/5 rounded-xl border border-dashed border-white/10">
                    <p className="text-sm text-white/40">No active risk alerts for this location.</p>
                  </div>
                ) : (
                  insights.map((insight, idx) => {
                    const Config = severityConfig[insight.severity];
                    const isHighlighted = selectedZoneId && insight.zoneId === selectedZoneId;
                    return (
                      <Card 
                        key={idx} 
                        className={cn(
                          "bg-white/5 border-white/10 hover:bg-white/10 transition-colors duration-200 group",
                          isHighlighted && "border-amber-500/50 bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.2)] ring-1 ring-amber-500/30 scale-[1.01] hover:bg-amber-500/15"
                        )}
                      >
                        <CardHeader className="p-4 pb-2 space-y-2">
                          <div className="flex items-center justify-between">
                            <Badge className={cn("text-[10px] uppercase font-bold", Config.color)}>
                              {insight.severity}
                            </Badge>
                            <span className="text-[10px] text-white/30 capitalize">{insight.category}</span>
                          </div>
                          <CardTitle className="text-base font-bold text-white group-hover:text-blue-400 transition-colors">
                            {insight.ruleName}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0 space-y-3">
                          <p className="text-sm text-white/70 leading-relaxed">
                            {insight.message}
                          </p>
                          <div className="pt-2 flex items-center justify-between border-t border-white/5">
                            <span className="text-[10px] text-white/40">
                              Trigger: {insight.signal.name.replace('_', ' ')} ({insight.signal.value}{insight.signal.unit})
                            </span>
                            {insight.zoneName && (
                              <Badge variant="outline" className="text-[9px] border-white/20 text-white/60">
                                {insight.zoneName}
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </section>

              {/* Zones */}
              <section className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-widest text-white/50 px-1">
                  Active Zones
                </h3>
                <div className="space-y-2">
                  {zones.length === 0 ? (
                    <p className="text-xs text-white/30 px-1 italic">Outside defined zones</p>
                  ) : (
                    zones.map((zone, idx) => {
                      const isHighlighted = selectedZoneId && zone.id === selectedZoneId;
                      return (
                        <div 
                          key={idx} 
                          onClick={() => onZoneSelect?.(zone.id)}
                          className={cn(
                            "flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5 hover:border-white/20 transition-all cursor-pointer hover:bg-white/10 active:scale-[0.99]",
                            isHighlighted && "border-amber-500/50 bg-amber-500/10 shadow-[0_0_10px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/30 hover:bg-amber-500/15"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)] transition-all duration-300",
                              isHighlighted && "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.7)]"
                            )} />
                            <div>
                              <p className="text-sm font-semibold text-white">{zone.name}</p>
                              <p className="text-[10px] text-white/40 uppercase tracking-wider">{zone.type}</p>
                            </div>
                          </div>
                          <Badge variant="secondary" className="bg-white/10 text-white/80 text-[10px] font-semibold border border-white/5">
                            {zone.insightCount} Alerts
                          </Badge>
                        </div>
                      );
                    })
                  )}
                </div>
              </section>

              {/* Signals with Enhanced Trends */}
              <section className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-widest text-white/50 px-1">
                  Weather Signals
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {signals.map((signal, idx) => {
                    const cfg = signalConfig[signal.name];
                    const SignalIcon = cfg?.icon || Activity;
                    const percent = cfg ? cfg.getPercent(signal.value) : 50;
                    
                    // Format display value
                    let displayVal = signal.value;
                    let displayUnit = signal.unit;

                    if (signal.name === 'temperature' || signal.name === 'feels_like') {
                      displayVal = convertTemperature(signal.value, state.units.temperature);
                      displayUnit = getTemperatureUnit(state.units.temperature);
                    } else if (signal.name === 'wind_speed' || signal.name === 'wind_gust') {
                      displayVal = convertWindSpeed(signal.value, state.units.windspeed);
                      displayUnit = getWindSpeedUnit(state.units.windspeed);
                    } else if (signal.name === 'pressure') {
                      displayVal = convertPressure(signal.value, state.units.pressure);
                      displayUnit = getPressureUnit(state.units.pressure);
                    }

                    return (
                      <div key={idx} className="p-3 bg-white/5 rounded-lg border border-white/5 flex flex-col justify-between h-24 hover:bg-white/10 transition-colors duration-200 group">
                        <div>
                          <div className="flex items-center justify-between text-[9px] uppercase tracking-wider text-white/30 mb-1">
                            <span className="truncate pr-1">{signal.name.replace(/_/, ' ')}</span>
                            <SignalIcon size={12} className="text-white/40 group-hover:text-white/70 transition-colors" />
                          </div>
                          <p className="text-base font-mono font-bold text-white leading-tight">
                            {displayVal.toFixed(1)}
                            <span className="text-[10px] font-normal text-white/40 ml-0.5">{displayUnit}</span>
                          </p>
                        </div>
                        {/* Micro Progress Bar */}
                        <div className="space-y-1">
                          <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                            <div 
                              className={cn("h-full rounded-full bg-gradient-to-r", cfg?.color || "from-blue-400 to-sky-400")}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          {signal.name === 'air_quality_index' && (
                            <span className="text-[8px] text-white/40">
                              AQI: {Math.round(signal.value)}/5
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </>
          )}
        </TabsContent>

        <TabsContent value="weather" className="m-0 focus-visible:ring-0">
          {renderWeather()}
        </TabsContent>

        <TabsContent value="forecast" className="p-4 m-0 space-y-4 focus-visible:ring-0">
          {loading ? (
            <IntelligenceSkeleton />
          ) : !forecast || !forecast.list ? (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center border border-white/10 animate-pulse">
                <ChevronRight className="text-white/20" size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-white font-bold">Extended Forecast</h3>
                <p className="text-sm text-white/40 max-w-[200px]">
                  No forecast data loaded. Click a location to view temporal weather intelligence.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Hourly Forecast Timeline */}
              <section className="space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-widest text-white/50 px-1">
                  Hourly Timeline (Next 24h)
                </h4>
                <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-thin scrollbar-thumb-white/15 scrollbar-track-transparent">
                  {hourlyForecast.map((it: any, idx: number) => {
                    const t = new Date(it.dt * 1000);
                    const timeStr = formatTime(t, state.time.format, state.time.timezone);
                    const itIcon = it.weather?.[0]?.icon || "01d";
                    const tempConverted = Math.round(convertTemperature(it.main.temp, state.units.temperature));
                    const rainProb = it.pop ? Math.round(it.pop * 100) : 0;
                    
                    return (
                      <div key={idx} className="flex flex-col items-center justify-between min-w-[72px] p-2 bg-white/5 border border-white/5 hover:border-white/10 transition-colors rounded-lg text-white">
                        <div className="text-[10px] text-white/50 font-medium">{timeStr}</div>
                        <img src={`https://openweathermap.org/img/wn/${itIcon}.png`} alt="" className="w-8 h-8 my-1" />
                        <div className="text-sm font-bold">{tempConverted}{getTemperatureUnit(state.units.temperature)}</div>
                        {rainProb > 0 ? (
                          <div className="text-[9px] text-blue-400 font-semibold mt-1 flex items-center gap-0.5">
                            <span className="animate-pulse">💧</span>{rainProb}%
                          </div>
                        ) : (
                          <div className="text-[9px] text-white/20 mt-1">-</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* 5-Day Outlook Accordion */}
              <section className="space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-widest text-white/50 px-1">
                  5-Day Outlook
                </h4>
                <div className="space-y-2">
                  {dailyForecasts.map((df) => {
                    const isExpanded = expandedDay === df.dateStr;
                    const dateFormatted = df.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                    const minTempConverted = Math.round(convertTemperature(df.tempMin, state.units.temperature));
                    const maxTempConverted = Math.round(convertTemperature(df.tempMax, state.units.temperature));
                    const popPct = Math.round(df.maxPop * 100);

                    return (
                      <div 
                        key={df.dateStr} 
                        className="bg-white/5 border border-white/5 rounded-lg overflow-hidden transition-all duration-200"
                      >
                        {/* Day Row Trigger */}
                        <button
                          onClick={() => setExpandedDay(isExpanded ? null : df.dateStr)}
                          className="w-full flex items-center justify-between p-3 hover:bg-white/10 active:bg-white/10 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <img 
                              src={`https://openweathermap.org/img/wn/${df.icon}.png`} 
                              alt={df.description} 
                              className="w-8 h-8"
                            />
                            <div className="text-left">
                              <p className="text-sm font-semibold text-white">{dateFormatted}</p>
                              <p className="text-[10px] text-white/40 capitalize leading-normal">{df.description}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            {popPct > 0 && (
                              <span className="text-[10px] text-blue-400 font-semibold">💧 {popPct}%</span>
                            )}
                            <div className="text-right">
                              <span className="text-sm font-bold text-white">{maxTempConverted}°</span>
                              <span className="text-xs text-white/40 ml-1.5">{minTempConverted}°</span>
                            </div>
                            <ChevronDown 
                              size={14} 
                              className={cn("text-white/40 transition-transform duration-200", isExpanded && "rotate-180")}
                            />
                          </div>
                        </button>

                        {/* Collapsible Details */}
                        {isExpanded && (
                          <div className="p-3 border-t border-white/5 bg-black/20 space-y-3">
                            <div className="grid grid-cols-3 gap-2 text-center text-[10px] text-white/40">
                              <div className="bg-white/5 p-1.5 rounded border border-white/5">
                                <p className="uppercase tracking-wider">Avg Humidity</p>
                                <p className="text-xs font-semibold text-white mt-1">{df.avgHumidity}%</p>
                              </div>
                              <div className="bg-white/5 p-1.5 rounded border border-white/5">
                                <p className="uppercase tracking-wider">Avg Wind</p>
                                <p className="text-xs font-semibold text-white mt-1">
                                  {convertWindSpeed(df.avgWind, state.units.windspeed).toFixed(1)} {getWindSpeedUnit(state.units.windspeed)}
                                </p>
                              </div>
                              <div className="bg-white/5 p-1.5 rounded border border-white/5">
                                <p className="uppercase tracking-wider">Max Precip %</p>
                                <p className="text-xs font-semibold text-white mt-1">{popPct}%</p>
                              </div>
                            </div>

                            {/* 3-Hourly detail timeline for this day */}
                            <div className="space-y-1.5 pt-1.5 border-t border-white/5">
                              {df.items.map((item: any, idx: number) => {
                                const itemTime = new Date(item.dt * 1000);
                                const timeStr = formatTime(itemTime, state.time.format, state.time.timezone);
                                const tempC = Math.round(convertTemperature(item.main.temp, state.units.temperature));
                                const windSpd = convertWindSpeed(item.wind.speed, state.units.windspeed).toFixed(1);
                                const itPop = item.pop ? Math.round(item.pop * 100) : 0;
                                const itIcon = item.weather[0]?.icon || '01d';

                                return (
                                  <div key={idx} className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-white/5 text-[11px] text-white/80">
                                    <span className="font-mono text-white/50 w-12 shrink-0">{timeStr}</span>
                                    <div className="flex items-center gap-1.5 flex-1 min-w-0 px-2">
                                      <img src={`https://openweathermap.org/img/wn/${itIcon}.png`} alt="" className="w-5 h-5 shrink-0" />
                                      <span className="capitalize truncate text-white/70">{item.weather[0]?.description}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-right shrink-0">
                                      {itPop > 0 && <span className="text-blue-400 font-medium">💧 {itPop}%</span>}
                                      <span className="font-semibold text-white w-6">{tempC}°</span>
                                      <span className="font-mono text-white/50 text-[10px] min-w-[50px]">{windSpd} {getWindSpeedUnit(state.units.windspeed)}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          )}
        </TabsContent>
      </div>
    </Tabs>
  );
};

export default IntelligencePanel;
