import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { countries } from '../data';
import { getCountryDetail, countriesWithData } from '../utils/countryDetail';
import { formatNumber } from '../utils/formatters';
import IPCBadge from '../components/common/IPCBadge';
import SeverityBadge from '../components/common/SeverityBadge';

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Tooltip, Legend);

function EmptySection({ message }: { message: string }) {
  return (
    <div className="text-center py-6 text-[var(--text-secondary)] text-sm">
      {message}
    </div>
  );
}

export default function CountryDashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedIso3 = searchParams.get('country')?.toUpperCase() ?? '';

  const dataCountryIso3s = useMemo(() => countriesWithData(), []);

  const sortedCountries = useMemo(
    () => [...countries].sort((a, b) => {
      const aHasData = dataCountryIso3s.includes(a.iso3);
      const bHasData = dataCountryIso3s.includes(b.iso3);
      if (aHasData !== bHasData) return aHasData ? -1 : 1;
      return a.name.localeCompare(b.name);
    }),
    [dataCountryIso3s]
  );

  const detail = useMemo(
    () => (selectedIso3 ? getCountryDetail(selectedIso3) : null),
    [selectedIso3]
  );

  const handleCountryChange = (iso3: string) => {
    if (iso3) {
      setSearchParams({ country: iso3 });
    } else {
      setSearchParams({});
    }
  };

  const invalidSelection = selectedIso3 && !detail;

  const latestIpc = detail?.ipc[0] ?? null;
  const crisisPop = latestIpc
    ? latestIpc.phase3_population + latestIpc.phase4_population + latestIpc.phase5_population
    : null;

  // IPC Doughnut chart data
  const ipcDoughnutData = useMemo(() => {
    if (!latestIpc) return null;
    return {
      labels: ['Phase 1: Minimal', 'Phase 2: Stressed', 'Phase 3: Crisis', 'Phase 4: Emergency', 'Phase 5: Famine'],
      datasets: [{
        data: [
          latestIpc.phase1_population,
          latestIpc.phase2_population,
          latestIpc.phase3_population,
          latestIpc.phase4_population,
          latestIpc.phase5_population,
        ],
        backgroundColor: ['#c6e5b3', '#f9e065', '#e67800', '#c80000', '#640000'],
        borderColor: 'rgba(0,0,0,0.3)',
        borderWidth: 1,
      }],
    };
  }, [latestIpc]);

  const ipcDoughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { color: '#a0a0a0', padding: 12, usePointStyle: true },
      },
      tooltip: {
        callbacks: {
          label: (ctx: { label?: string; raw: unknown }) =>
            `${ctx.label}: ${Number(ctx.raw).toLocaleString()} people`,
        },
      },
    },
  };

  // Nutrition horizontal bar data
  const nutritionChartData = useMemo(() => {
    if (!detail || detail.nutrition.length === 0) return null;
    const indicators = [...new Set(detail.nutrition.map(n => n.indicator))];
    const values = indicators.map(ind => detail.nutrition.find(n => n.indicator === ind)?.value ?? 0);

    const colors: Record<string, string> = {
      stunting: 'rgba(233,69,96,0.7)',
      wasting: 'rgba(15,52,96,0.7)',
      underweight: 'rgba(249,224,101,0.7)',
    };

    return {
      labels: indicators.map(i => i.charAt(0).toUpperCase() + i.slice(1)),
      datasets: [{
        label: 'Prevalence (%)',
        data: values,
        backgroundColor: indicators.map(i => colors[i] ?? 'rgba(160,160,160,0.7)'),
        borderColor: indicators.map(i => (colors[i] ?? 'rgba(160,160,160,1)').replace('0.7', '1')),
        borderWidth: 1,
      }],
    };
  }, [detail]);

  const nutritionChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y' as const,
    scales: {
      x: {
        ticks: { color: '#a0a0a0', callback: (v: number | string) => v + '%' },
        grid: { color: 'rgba(255,255,255,0.05)' },
        suggestedMax: 50,
      },
      y: {
        ticks: { color: '#a0a0a0' },
        grid: { display: false },
      },
    },
    plugins: {
      legend: { display: false },
    },
  };

  return (
    <>
      {/* Country Selector */}
      <div className="bg-[var(--bg-card)] rounded-lg p-5 mb-5">
        <div className="flex items-center gap-4 flex-wrap">
          <h2 className="text-white font-bold text-lg">
            <span className="text-[var(--accent)] mr-2">🏳️</span>
            Country Stats Dashboard
          </h2>
          <select
            value={selectedIso3}
            onChange={e => handleCountryChange(e.target.value)}
            className="bg-[var(--bg-surface)] text-[var(--text-primary)] border border-white/20 rounded px-4 py-2 text-sm min-w-[240px]"
          >
            <option value="">Select a country...</option>
            {sortedCountries.map(c => (
              <option key={c.iso3} value={c.iso3} disabled={!dataCountryIso3s.includes(c.iso3)}>
                {c.name} ({c.iso3}){!dataCountryIso3s.includes(c.iso3) ? ' — no data' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Invalid selection */}
      {invalidSelection && (
        <div className="bg-[var(--bg-card)] rounded-lg p-8 text-center">
          <p className="text-red-400 text-lg mb-2">Country not found: {selectedIso3}</p>
          <p className="text-[var(--text-secondary)]">
            Please select a valid country from the dropdown above.
          </p>
        </div>
      )}

      {/* No selection */}
      {!selectedIso3 && (
        <div className="bg-[var(--bg-card)] rounded-lg p-12 text-center">
          <div className="text-5xl mb-4">🌍</div>
          <h3 className="text-white text-xl font-semibold mb-2">Select a Country</h3>
          <p className="text-[var(--text-secondary)] max-w-md mx-auto">
            Choose a country from the dropdown above to view detailed food security statistics, IPC classifications, commodity prices, alerts, and nutrition indicators.
          </p>
        </div>
      )}

      {/* Country Dashboard Content */}
      {detail && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
            <div className="bg-[var(--bg-card)] rounded-lg p-5 border-l-4 border-l-[var(--phase2-color)] hover:-translate-y-0.5 transition-transform">
              <div className="text-3xl font-bold text-white leading-tight">
                {detail.country.population ? formatNumber(detail.country.population) : 'N/A'}
              </div>
              <div className="text-sm text-[var(--text-secondary)] mt-1">
                <span className="mr-1">👥</span> Population
              </div>
            </div>
            <div className="bg-[var(--bg-card)] rounded-lg p-5 border-l-4 border-l-[var(--phase4-color)] hover:-translate-y-0.5 transition-transform">
              <div className="text-3xl font-bold text-white leading-tight flex items-center gap-2">
                {latestIpc ? <IPCBadge phase={latestIpc.overall_phase} /> : 'N/A'}
              </div>
              <div className="text-sm text-[var(--text-secondary)] mt-1">
                <span className="mr-1">📊</span> IPC Phase
              </div>
            </div>
            <div className="bg-[var(--bg-card)] rounded-lg p-5 border-l-4 border-l-[var(--phase5-color)] hover:-translate-y-0.5 transition-transform">
              <div className="text-3xl font-bold text-white leading-tight">
                {crisisPop !== null ? formatNumber(crisisPop) : 'N/A'}
              </div>
              <div className="text-sm text-[var(--text-secondary)] mt-1">
                <span className="mr-1">🚨</span> Crisis+ Population (IPC 3+)
              </div>
            </div>
            <div className="bg-[var(--bg-card)] rounded-lg p-5 border-l-4 border-l-[var(--phase3-color)] hover:-translate-y-0.5 transition-transform">
              <div className="text-3xl font-bold text-white leading-tight">
                {detail.alerts.length}
              </div>
              <div className="text-sm text-[var(--text-secondary)] mt-1">
                <span className="mr-1">⚠️</span> Active Alerts
              </div>
            </div>
          </div>

          {/* Country Info Bar */}
          <div className="bg-[var(--bg-card)] rounded-lg px-5 py-3 mb-5 flex items-center gap-6 flex-wrap text-sm">
            <span className="text-white font-semibold text-lg">{detail.country.name}</span>
            <span className="text-[var(--text-secondary)]">Region: <span className="text-white">{detail.country.region}</span></span>
            {detail.country.sub_region && (
              <span className="text-[var(--text-secondary)]">Sub-region: <span className="text-white">{detail.country.sub_region}</span></span>
            )}
            <span className="text-[var(--text-secondary)]">ISO: <span className="text-white">{detail.country.iso3} / {detail.country.iso2}</span></span>
          </div>

          {/* Charts Row: IPC Doughnut + Nutrition */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
            {/* IPC Doughnut */}
            <div className="bg-[var(--bg-card)] rounded-lg p-5">
              <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-3">
                <h3 className="text-white font-semibold">
                  <span className="text-[var(--accent)] mr-2">📊</span>
                  IPC Phase Distribution
                </h3>
              </div>
              {ipcDoughnutData ? (
                <div style={{ height: '300px' }} className="flex items-center justify-center">
                  <Doughnut data={ipcDoughnutData} options={ipcDoughnutOptions} />
                </div>
              ) : (
                <EmptySection message="No IPC classification data available for this country." />
              )}
              {latestIpc && (
                <div className="text-xs text-[var(--text-secondary)] mt-3 text-center">
                  Period: {latestIpc.period_start} to {latestIpc.period_end} &bull; Total analyzed: {latestIpc.total_analyzed.toLocaleString()}
                </div>
              )}
            </div>

            {/* Nutrition */}
            <div className="bg-[var(--bg-card)] rounded-lg p-5">
              <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-3">
                <h3 className="text-white font-semibold">
                  <span className="text-[var(--accent)] mr-2">❤️</span>
                  Nutrition Indicators (Under 5)
                </h3>
              </div>
              {nutritionChartData ? (
                <div style={{ height: '300px' }}>
                  <Bar data={nutritionChartData} options={nutritionChartOptions} />
                </div>
              ) : (
                <EmptySection message="No nutrition data available for this country." />
              )}
              {detail.nutrition.length > 0 && (
                <div className="text-xs text-[var(--text-secondary)] mt-3 text-center">
                  Source: {detail.nutrition[0].source} &bull; Year: {detail.nutrition[0].year}
                </div>
              )}
            </div>
          </div>

          {/* Alerts */}
          <div className="bg-[var(--bg-card)] rounded-lg p-5 mb-5">
            <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-3">
              <h3 className="text-white font-semibold">
                <span className="text-[var(--accent)] mr-2">⚠️</span>
                Active Alerts
              </h3>
            </div>
            {detail.alerts.length > 0 ? (
              <div className="space-y-2.5">
                {detail.alerts.map(alert => {
                  const borderColor: Record<string, string> = {
                    emergency: 'border-l-[var(--phase5-color)]',
                    critical: 'border-l-[var(--phase4-color)]',
                    warning: 'border-l-[var(--phase3-color)]',
                    info: 'border-l-[var(--phase2-color)]',
                  };
                  return (
                    <div
                      key={alert.id}
                      className={`bg-white/[0.03] rounded-md p-4 border-l-[3px] ${borderColor[alert.severity] ?? 'border-l-gray-500'}`}
                    >
                      <div className="flex items-center gap-2">
                        <SeverityBadge severity={alert.severity} />
                        <span className="text-xs text-[var(--text-secondary)]">
                          📅 {alert.alert_date} &bull; 🏷️ {alert.source}
                        </span>
                      </div>
                      <div className="font-semibold text-white mt-1.5">{alert.title}</div>
                      <div className="text-sm text-[var(--text-secondary)] mt-1">{alert.description}</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptySection message="No active alerts for this country." />
            )}
          </div>

          {/* Commodity Prices */}
          <div className="bg-[var(--bg-card)] rounded-lg p-5">
            <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-3">
              <h3 className="text-white font-semibold">
                <span className="text-[var(--accent)] mr-2">🛒</span>
                Commodity Prices
              </h3>
            </div>
            {detail.prices.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[var(--text-secondary)] border-b border-white/15">
                      <th className="text-left py-2 px-3">Commodity</th>
                      <th className="text-left py-2 px-3">Market</th>
                      <th className="text-right py-2 px-3">Price</th>
                      <th className="text-left py-2 px-3">Unit</th>
                      <th className="text-left py-2 px-3">Type</th>
                      <th className="text-left py-2 px-3">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.prices.map(p => (
                      <tr key={p.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="py-2 px-3 text-white font-medium">{p.commodity}</td>
                        <td className="py-2 px-3">{p.market || 'N/A'}</td>
                        <td className="py-2 px-3 text-right text-white">${p.price.toFixed(2)}</td>
                        <td className="py-2 px-3">{p.unit}</td>
                        <td className="py-2 px-3 capitalize">{p.price_type}</td>
                        <td className="py-2 px-3">{p.price_date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptySection message="No commodity price data available for this country." />
            )}
          </div>
        </>
      )}
    </>
  );
}
