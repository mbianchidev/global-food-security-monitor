import { useState } from 'react';
import KPICards from '../components/dashboard/KPICards';
import IPCChart from '../components/dashboard/IPCChart';
import AlertsFeed from '../components/dashboard/AlertsFeed';
import NutritionChart from '../components/dashboard/NutritionChart';
import IPCTable from '../components/dashboard/IPCTable';
import CountryDetailModal from '../components/countries/CountryDetailModal';
import { countries, ipcClassifications, alerts, nutritionData } from '../data';

export default function DashboardPage() {
  const [selectedIso3, setSelectedIso3] = useState<string | null>(null);

  const ipcSorted = [...ipcClassifications].sort(
    (a, b) => b.overall_phase - a.overall_phase || a.country_name.localeCompare(b.country_name)
  );

  let crisisPopulation = 0;
  let faminePopulation = 0;
  for (const row of ipcClassifications) {
    crisisPopulation += row.phase3_population + row.phase4_population + row.phase5_population;
    faminePopulation += row.phase5_population;
  }

  let emergencyCount = 0;
  let criticalCount = 0;
  for (const a of alerts) {
    if (a.severity === 'emergency') emergencyCount++;
    if (a.severity === 'critical') criticalCount++;
  }

  const sortedAlerts = [...alerts].sort((a, b) => {
    const order = { emergency: 0, critical: 1, warning: 2, info: 3 };
    return (order[a.severity] ?? 4) - (order[b.severity] ?? 4);
  });

  return (
    <>
      {/* Demo Banner */}
      <div className="bg-[var(--bg-surface)]/60 border border-sky-400/40 rounded-md px-5 py-3 mb-5 flex items-center gap-3">
        <span className="text-[var(--accent)] text-xl">⚗️</span>
        <div>
          <strong className="text-white">Demo Mode — Mock Data</strong>
          <span className="text-[var(--text-secondary)] text-sm ml-2">
            All data shown is sample/seed data for demonstration purposes.
          </span>
        </div>
      </div>

      <KPICards
        crisisPopulation={crisisPopulation}
        faminePopulation={faminePopulation}
        emergencyAlerts={emergencyCount + criticalCount}
        countriesMonitored={countries.length}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        <div className="lg:col-span-2">
          <IPCChart data={ipcSorted} />
        </div>
        <div>
          <AlertsFeed alerts={sortedAlerts} maxItems={5} />
        </div>
      </div>

      <IPCTable data={ipcSorted} onCountryClick={setSelectedIso3} />

      <NutritionChart data={nutritionData} />

      {selectedIso3 && (
        <CountryDetailModal
          iso3={selectedIso3}
          onClose={() => setSelectedIso3(null)}
        />
      )}
    </>
  );
}
