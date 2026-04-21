import { countries, ipcClassifications, alerts, commodityPrices, nutritionData } from '../data';
import type { CountryDetail } from '../types';

export function getCountryDetail(iso3: string): CountryDetail | null {
  const country = countries.find(c => c.iso3 === iso3.toUpperCase());
  if (!country) return null;

  return {
    country,
    ipc: ipcClassifications.filter(i => i.country_id === country.id),
    alerts: alerts.filter(a => a.country_id === country.id && a.is_active),
    prices: commodityPrices.filter(p => p.country_id === country.id),
    nutrition: nutritionData.filter(n => n.country_id === country.id),
  };
}

export function countriesWithData(): string[] {
  const ids = new Set<number>();
  for (const i of ipcClassifications) ids.add(i.country_id);
  for (const a of alerts) if (a.is_active) ids.add(a.country_id);
  for (const p of commodityPrices) ids.add(p.country_id);
  for (const n of nutritionData) ids.add(n.country_id);

  return countries
    .filter(c => ids.has(c.id))
    .map(c => c.iso3);
}
