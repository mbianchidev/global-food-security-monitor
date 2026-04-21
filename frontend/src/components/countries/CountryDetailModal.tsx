import { useEffect } from 'react';
import { countries, ipcClassifications, alerts, commodityPrices, nutritionData } from '../../data';
import IPCBadge from '../common/IPCBadge';
import SeverityBadge from '../common/SeverityBadge';
import type { CountryDetail } from '../../types';

interface Props {
  iso3: string;
  onClose: () => void;
}

function getCountryDetail(iso3: string): CountryDetail | null {
  const country = countries.find(c => c.iso3 === iso3);
  if (!country) return null;

  return {
    country,
    ipc: ipcClassifications.filter(i => i.country_id === country.id),
    alerts: alerts.filter(a => a.country_id === country.id && a.is_active),
    prices: commodityPrices.filter(p => p.country_id === country.id),
    nutrition: nutritionData.filter(n => n.country_id === country.id),
  };
}

export default function CountryDetailModal({ iso3, onClose }: Props) {
  const detail = getCountryDetail(iso3);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!detail) {
    return (
      <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Country not found"
          className="bg-[var(--bg-card)] rounded-lg p-6 max-w-2xl w-full"
          onClick={e => e.stopPropagation()}
        >
          <p className="text-center text-red-400">Country not found.</p>
          <button onClick={onClose} aria-label="Close" className="mt-4 bg-[var(--bg-surface)] text-white px-4 py-2 rounded">
            Close
          </button>
        </div>
      </div>
    );
  }

  const { country: c, ipc, alerts: countryAlerts, prices, nutrition } = detail;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="bg-[var(--bg-card)] rounded-lg max-w-3xl w-full max-h-[85vh] overflow-y-auto border border-white/10"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-5 border-b border-white/10">
          <h2 id="modal-title" className="text-white text-lg font-bold">
            {c.name} ({c.iso3})
          </h2>
          <button onClick={onClose} aria-label="Close" className="text-white text-2xl hover:text-[var(--accent)]">
            &times;
          </button>
        </div>
        <div className="p-5 space-y-5">
          {/* Country Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p><span className="text-[var(--text-secondary)]">Region:</span> <span className="text-white">{c.region}{c.sub_region ? ` / ${c.sub_region}` : ''}</span></p>
              <p><span className="text-[var(--text-secondary)]">Population:</span> <span className="text-white">{c.population ? c.population.toLocaleString() : 'N/A'}</span></p>
            </div>
            <div>
              <p><span className="text-[var(--text-secondary)]">ISO Codes:</span> <span className="text-white">{c.iso3} / {c.iso2}</span></p>
              <p><span className="text-[var(--text-secondary)]">Coordinates:</span> <span className="text-white">{c.latitude}, {c.longitude}</span></p>
            </div>
          </div>

          {/* IPC */}
          {ipc.length > 0 && (
            <div>
              <h3 className="text-white font-semibold mb-2">
                <span className="text-[var(--accent)] mr-1">📊</span> IPC Classifications
              </h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[var(--text-secondary)] border-b border-white/15">
                    <th className="text-left py-1 px-2">Period</th>
                    <th className="text-center py-1 px-2">Phase</th>
                    <th className="text-right py-1 px-2">Crisis+ Pop</th>
                  </tr>
                </thead>
                <tbody>
                  {ipc.map(row => (
                    <tr key={row.id} className="border-b border-white/5">
                      <td className="py-1 px-2">{row.period_start} to {row.period_end}</td>
                      <td className="py-1 px-2 text-center"><IPCBadge phase={row.overall_phase} /></td>
                      <td className="py-1 px-2 text-right text-white">
                        {(row.phase3_population + row.phase4_population + row.phase5_population).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Alerts */}
          {countryAlerts.length > 0 && (
            <div>
              <h3 className="text-white font-semibold mb-2">
                <span className="text-[var(--accent)] mr-1">⚠️</span> Active Alerts
              </h3>
              <div className="space-y-2">
                {countryAlerts.map(alert => (
                  <div key={alert.id} className="bg-white/[0.03] rounded p-3 border-l-[3px] border-l-[var(--phase4-color)]">
                    <SeverityBadge severity={alert.severity} />
                    <span className="text-white font-semibold ml-2">{alert.title}</span>
                    <div className="text-sm text-[var(--text-secondary)] mt-1">{alert.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Prices */}
          {prices.length > 0 && (
            <div>
              <h3 className="text-white font-semibold mb-2">
                <span className="text-[var(--accent)] mr-1">🛒</span> Commodity Prices
              </h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[var(--text-secondary)] border-b border-white/15">
                    <th className="text-left py-1 px-2">Commodity</th>
                    <th className="text-left py-1 px-2">Market</th>
                    <th className="text-right py-1 px-2">Price</th>
                    <th className="text-left py-1 px-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {prices.map(p => (
                    <tr key={p.id} className="border-b border-white/5">
                      <td className="py-1 px-2">{p.commodity}</td>
                      <td className="py-1 px-2">{p.market || 'N/A'}</td>
                      <td className="py-1 px-2 text-right text-white">${p.price.toFixed(2)}/{p.unit}</td>
                      <td className="py-1 px-2">{p.price_date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Nutrition */}
          {nutrition.length > 0 && (
            <div>
              <h3 className="text-white font-semibold mb-2">
                <span className="text-[var(--accent)] mr-1">❤️</span> Nutrition Indicators
              </h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[var(--text-secondary)] border-b border-white/15">
                    <th className="text-left py-1 px-2">Indicator</th>
                    <th className="text-right py-1 px-2">Value</th>
                    <th className="text-right py-1 px-2">Year</th>
                    <th className="text-left py-1 px-2">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {nutrition.map(n => (
                    <tr key={n.id} className="border-b border-white/5">
                      <td className="py-1 px-2 capitalize">{n.indicator}</td>
                      <td className="py-1 px-2 text-right text-white">{n.value}%</td>
                      <td className="py-1 px-2 text-right">{n.year}</td>
                      <td className="py-1 px-2">{n.source || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="p-5 border-t border-white/10 text-right">
          <button
            onClick={onClose}
            className="bg-[var(--bg-surface)] text-white px-4 py-2 rounded hover:bg-[var(--accent)] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
