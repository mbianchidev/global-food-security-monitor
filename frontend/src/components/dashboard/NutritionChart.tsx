import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import type { NutritionData } from '../../types';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

interface Props {
  data: NutritionData[];
}

export default function NutritionChart({ data }: Props) {
  const grouped: Record<string, { stunting?: number; wasting?: number }> = {};
  for (const n of data) {
    if (n.indicator === 'stunting' || n.indicator === 'wasting') {
      if (!grouped[n.country_name]) grouped[n.country_name] = {};
      grouped[n.country_name][n.indicator] = n.value;
    }
  }

  const labels = Object.keys(grouped);
  const stuntingData = labels.map(l => grouped[l].stunting ?? 0);
  const wastingData = labels.map(l => grouped[l].wasting ?? 0);

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Stunting (%)',
        data: stuntingData,
        backgroundColor: 'rgba(233,69,96,0.7)',
        borderColor: 'rgba(233,69,96,1)',
        borderWidth: 1,
      },
      {
        label: 'Wasting (%)',
        data: wastingData,
        backgroundColor: 'rgba(15,52,96,0.7)',
        borderColor: 'rgba(15,52,96,1)',
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        ticks: { color: '#a0a0a0', maxRotation: 45 },
        grid: { display: false },
      },
      y: {
        ticks: {
          color: '#a0a0a0',
          callback: (v: number | string) => v + '%',
        },
        grid: { color: 'rgba(255,255,255,0.05)' },
        suggestedMax: 50,
      },
    },
    plugins: {
      legend: { labels: { color: '#a0a0a0' } },
    },
  };

  return (
    <div className="bg-[var(--bg-card)] rounded-lg p-5">
      <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-3">
        <h3 className="text-white font-semibold">
          <span className="text-[var(--accent)] mr-2">❤️</span>
          Child Malnutrition Indicators (Under 5)
        </h3>
      </div>
      <div className="chart-container">
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
}
