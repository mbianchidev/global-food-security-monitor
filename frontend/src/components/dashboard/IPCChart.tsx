import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
} from 'chart.js';
import type { IPCClassification } from '../../types';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

interface Props {
  data: IPCClassification[];
}

export default function IPCChart({ data }: Props) {
  const labels = data.map(d => d.country_name);

  const toPercent = (val: number, total: number) =>
    Math.round((val / Math.max(total, 1)) * 100);

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Phase 1: Minimal',
        data: data.map(d => toPercent(d.phase1_population, d.total_analyzed)),
        backgroundColor: '#c6e5b3',
      },
      {
        label: 'Phase 2: Stressed',
        data: data.map(d => toPercent(d.phase2_population, d.total_analyzed)),
        backgroundColor: '#f9e065',
      },
      {
        label: 'Phase 3: Crisis',
        data: data.map(d => toPercent(d.phase3_population, d.total_analyzed)),
        backgroundColor: '#e67800',
      },
      {
        label: 'Phase 4: Emergency',
        data: data.map(d => toPercent(d.phase4_population, d.total_analyzed)),
        backgroundColor: '#c80000',
      },
      {
        label: 'Phase 5: Famine',
        data: data.map(d => toPercent(d.phase5_population, d.total_analyzed)),
        backgroundColor: '#640000',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        stacked: true,
        ticks: { color: '#a0a0a0', maxRotation: 45 },
        grid: { display: false },
      },
      y: {
        stacked: true,
        max: 100,
        ticks: {
          color: '#a0a0a0',
          callback: (v: number | string) => v + '%',
        },
        grid: { color: 'rgba(255,255,255,0.05)' },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: { dataset: { label?: string }; raw: unknown }) =>
            `${ctx.dataset.label}: ${ctx.raw}%`,
        },
      },
    },
  };

  return (
    <div className="bg-[var(--bg-card)] rounded-lg p-5 mb-5">
      <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-3">
        <h3 className="text-white font-semibold">
          <span className="text-[var(--accent)] mr-2">📊</span>
          IPC Phase Distribution by Country
        </h3>
      </div>
      <div className="chart-container">
        <Bar data={chartData} options={options} />
      </div>
      <div className="flex gap-3 flex-wrap mt-3 text-xs text-[var(--text-secondary)]">
        {[
          { color: '#c6e5b3', label: 'Phase 1: Minimal' },
          { color: '#f9e065', label: 'Phase 2: Stressed' },
          { color: '#e67800', label: 'Phase 3: Crisis' },
          { color: '#c80000', label: 'Phase 4: Emergency' },
          { color: '#640000', label: 'Phase 5: Famine' },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-1">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: item.color }}
            />
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}
