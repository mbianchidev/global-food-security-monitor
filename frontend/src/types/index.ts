export interface Country {
  id: number;
  iso3: string;
  iso2: string;
  name: string;
  region: string;
  sub_region: string;
  population: number;
  gdp_per_capita: number | null;
  latitude: number;
  longitude: number;
}

export interface IPCClassification {
  id: number;
  country_id: number;
  country_name: string;
  iso3: string;
  period_start: string;
  period_end: string;
  phase1_population: number;
  phase2_population: number;
  phase3_population: number;
  phase4_population: number;
  phase5_population: number;
  total_analyzed: number;
  overall_phase: number;
  source: string;
}

export interface Alert {
  id: number;
  country_id: number;
  country_name: string;
  iso3: string;
  severity: 'info' | 'warning' | 'critical' | 'emergency';
  title: string;
  description: string;
  source: string;
  alert_date: string;
  is_active: number;
}

export interface CommodityPrice {
  id: number;
  country_id: number;
  country_name: string;
  iso3: string;
  commodity: string;
  market: string;
  price: number;
  currency: string;
  unit: string;
  price_date: string;
  price_type: string;
}

export interface NutritionData {
  id: number;
  country_id: number;
  country_name: string;
  indicator: string;
  value: number;
  age_group: string;
  year: number;
  source: string;
}

export interface CountryDetail {
  country: Country;
  ipc: IPCClassification[];
  alerts: Alert[];
  prices: CommodityPrice[];
  nutrition: NutritionData[];
}

export interface DashboardSummary {
  countries_monitored: number;
  active_alerts: number;
  emergency_alerts: number;
  critical_alerts: number;
  crisis_population: number;
  famine_population: number;
}
