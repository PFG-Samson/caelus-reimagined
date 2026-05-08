export type SignalName =
  | 'wind_speed'
  | 'wind_gust'
  | 'temperature'
  | 'feels_like'
  | 'humidity'
  | 'pressure'
  | 'visibility'
  | 'cloudiness'
  | 'rainfall_1h'
  | 'rainfall_3h'
  | 'snowfall_1h'
  | 'air_quality_index'
  | 'uv_index';

export interface WeatherSignal {
  name: SignalName;
  value: number;
  unit: string;
}

export type Operator = '>' | '<' | '>=' | '<=' | '==';
export type Severity = 'info' | 'warning' | 'danger' | 'critical';
export type Category = 'aviation' | 'outdoor' | 'health' | 'travel' | 'general';

export interface RiskRule {
  id: string;
  name: string;
  signal: SignalName;
  operator: Operator;
  threshold: number;
  severity: Severity;
  message: string;
  category: Category;
}

export interface Insight {
  ruleId: string;
  ruleName: string;
  severity: Severity;
  message: string;
  category: Category;
  signal: WeatherSignal;
  triggeredAt: string;
  zoneName?: string;
  zoneId?: string;
}

export type ZoneType = 'circle' | 'polygon';

export interface ZoneData {
  id: string;
  name: string;
  description: string;
  type: ZoneType;
  centerLat: number | null;
  centerLon: number | null;
  radiusKm: number | null;
  polygon: string | null;
  isActive: boolean;
}

export interface ZoneSummary {
  id: string;
  name: string;
  type: ZoneType;
  insightCount: number;
}
