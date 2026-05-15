import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Shield, Activity, RefreshCw, ChevronRight } from 'lucide-react';
import { Insight, WeatherSignal, ZoneSummary, Severity } from '@/types/intelligence';
import { cn } from '@/lib/utils';

interface IntelligencePanelProps {
  insights: Insight[];
  signals: WeatherSignal[];
  zones: ZoneSummary[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  renderWeather: () => React.ReactNode;
}

const severityConfig: Record<Severity, { color: string; icon: any }> = {
  critical: { color: 'bg-red-500/20 text-red-400 border-red-500/50', icon: AlertCircle },
  danger: { color: 'bg-orange-500/20 text-orange-400 border-orange-500/50', icon: AlertCircle },
  warning: { color: 'bg-amber-500/20 text-amber-400 border-amber-500/50', icon: AlertCircle },
  info: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/50', icon: Activity },
};

const IntelligenceSkeleton = () => (
  <div className="space-y-4 p-1">
    {[1, 2, 3].map((i) => (
      <Card key={i} className="bg-white/5 border-white/10 overflow-hidden">
        <CardHeader className="p-4 pb-2">
          <Skeleton className="h-4 w-3/4 mb-2" />
          <Skeleton className="h-3 w-1/2" />
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <Skeleton className="h-3 w-full mb-1" />
          <Skeleton className="h-3 w-2/3" />
        </CardContent>
      </Card>
    ))}
  </div>
);

const IntelligencePanel: React.FC<IntelligencePanelProps> = ({
  insights,
  signals,
  zones,
  loading,
  error,
  onRetry,
  renderWeather,
}) => {
  return (
    <Tabs defaultValue="intelligence" className="w-full flex flex-col h-full">
      <div className="px-4 py-2 border-b border-white/10 sticky top-0 bg-black/40 backdrop-blur-md z-10">
        <TabsList className="grid w-full grid-cols-3 bg-white/5 border border-white/10">
          <TabsTrigger value="intelligence" className="data-[state=active]:bg-white/10">Intelligence</TabsTrigger>
          <TabsTrigger value="weather" className="data-[state=active]:bg-white/10">Weather</TabsTrigger>
          <TabsTrigger value="forecast" className="data-[state=active]:bg-white/10">Forecast</TabsTrigger>
        </TabsList>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
        <TabsContent value="intelligence" className="p-4 m-0 space-y-6 focus-visible:ring-0">
          {loading ? (
            <IntelligenceSkeleton />
          ) : error ? (
            <Card className="bg-red-500/10 border-red-500/50 text-white">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertCircle className="text-red-400" />
                  Fetch Error
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm opacity-90">{error}</p>
                <button
                  onClick={onRetry}
                  className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-md transition-colors text-sm font-medium"
                >
                  <RefreshCw size={14} />
                  Retry
                </button>
              </CardContent>
            </Card>
          ) : (
            <>
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
                    return (
                      <Card 
                        key={idx} 
                        className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors duration-200 group"
                      >
                        <CardHeader className="p-4 pb-2 space-y-2">
                          <div className="flex items-center justify-between">
                            <Badge className={cn("text-[10px] uppercase font-bold", Config.color)}>
                              {insight.severity}
                            </Badge>
                            <span className="text-[10px] text-white/30">{insight.category}</span>
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
                    zones.map((zone, idx) => (
                      <div 
                        key={idx} 
                        className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5 hover:border-white/20 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                          <div>
                            <p className="text-sm font-semibold text-white">{zone.name}</p>
                            <p className="text-[10px] text-white/40 uppercase">{zone.type}</p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="bg-white/10 text-white/60 text-[10px]">
                          {zone.insightCount} alerts
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </section>

              {/* Signals */}
              <section className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-widest text-white/50 px-1">
                  Weather Signals
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {signals.map((signal, idx) => (
                    <div key={idx} className="p-3 bg-white/5 rounded-lg border border-white/5">
                      <p className="text-[9px] uppercase tracking-wider text-white/30 mb-1">
                        {signal.name.replace('_', ' ')}
                      </p>
                      <p className="text-lg font-mono font-bold text-white">
                        {signal.value.toFixed(1)}
                        <span className="text-xs font-normal text-white/40 ml-1">{signal.unit}</span>
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}
        </TabsContent>

        <TabsContent value="weather" className="m-0 focus-visible:ring-0">
          {renderWeather()}
        </TabsContent>

        <TabsContent value="forecast" className="p-4 m-0 space-y-4 focus-visible:ring-0">
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center border border-white/10">
              <ChevronRight className="text-white/20" size={32} />
            </div>
            <div className="space-y-2">
              <h3 className="text-white font-bold">Extended Forecast</h3>
              <p className="text-sm text-white/40 max-w-[200px]">
                High-resolution temporal intelligence coming soon.
              </p>
            </div>
          </div>
        </TabsContent>
      </div>
    </Tabs>
  );
};

export default IntelligencePanel;
