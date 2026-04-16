import { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
} from 'chart.js';
import { commodityPrices } from '../data';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

export default function PricesPage() {
  const prices = commodityPrices;

  const { chartData, chartColors } = useMemo(() => {
    const commodities: Record<string, number[]> = {};
    for (const p of prices) {
      if (!commodities[p.commodity]) commodities[p.commodity] = [];
      commodities[p.commodity].push(p.price);
    }

    const names = Object.keys(commodities);
    const avgPrices = names.map(name => {
      const vals = commodities[name];
      return +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2);
    });

    const colors = ['#e94560', '#0f3460', '#f9e065', '#c6e5b3', '#e67800', '#c80000', '#16213e', '#640000'];
    const chartColors = names.map((_, i) => colors[i % colors.length]);

    return {
      chartData: {
        labels: names,
        datasets: [
          {
            label: 'Avg Price (USD)',
            data: avgPrices,
            backgroundColor: chartColors.map(c => c + 'bb'),
            borderColor: chartColors,
            borderWidth: 1,
          },
        ],
      },
      chartColors,
    };
  }, [prices]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        ticks: { color: '#a0a0a0' },
        grid: { display: false },
      },
      y: {
        ticks: {
          color: '#a0a0a0',
          callback: (v: number | string) => '$' + v,
        },
        grid: { color: 'rgba(255,255,255,0.05)' },
      },
    },
    plugins: {
      legend: { display: false },
    },
  };

  void chartColors;

  return (
    <div className="space-y-5">
      <div className="bg-[var(--bg-card)] rounded-lg p-5">
        <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-3">
          <h3 className="text-white font-semibold">
            <span className="text-[var(--accent)] mr-2">📈</span>
            Average Commodity Prices
          </h3>
        </div>
        <div className="chart-container" style={{ height: '350px' }}>
          <Bar data={chartData} options={options} />
        </div>
      </div>

      <div className="bg-[var(--bg-card)] rounded-lg p-5">
        <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-3">
          <h3 className="text-white font-semibold">
            <span className="text-[var(--accent)] mr-2">📋</span>
            Price Data
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[var(--text-secondary)] border-b border-white/15">
                <th className="text-left py-2 px-3">Country</th>
                <th className="text-left py-2 px-3">Commodity</th>
                <th className="text-left py-2 px-3">Market</th>
                <th className="text-right py-2 px-3">Price (USD)</th>
                <th className="text-left py-2 px-3">Unit</th>
                <th className="text-left py-2 px-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {prices.map(p => (
                <tr key={p.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="py-2 px-3 text-white">{p.country_name}</td>
                  <td className="py-2 px-3">{p.commodity}</td>
                  <td className="py-2 px-3">{p.market || 'N/A'}</td>
                  <td className="py-2 px-3 text-right text-white">${p.price.toFixed(2)}</td>
                  <td className="py-2 px-3">{p.unit}</td>
                  <td className="py-2 px-3">{p.price_date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
