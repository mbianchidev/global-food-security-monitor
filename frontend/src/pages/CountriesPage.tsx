import { useState, useMemo } from 'react';
import { countries } from '../data';
import CountryDetailModal from '../components/countries/CountryDetailModal';

export default function CountriesPage() {
  const [regionFilter, setRegionFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selectedIso3, setSelectedIso3] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let result = countries;
    if (regionFilter) result = result.filter(c => c.region === regionFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        c =>
          c.name.toLowerCase().includes(q) ||
          c.iso3.toLowerCase().includes(q)
      );
    }
    return result;
  }, [regionFilter, search]);

  const regions = [...new Set(countries.map(c => c.region))].sort();

  return (
    <>
      <div className="bg-[var(--bg-card)] rounded-lg p-5">
        <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-3 flex-wrap gap-2">
          <h3 className="text-white font-semibold">
            <span className="text-[var(--accent)] mr-2">🏳️</span>
            Monitored Countries
          </h3>
          <div className="flex gap-2 flex-wrap">
            <input
              type="text"
              placeholder="Search countries..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-[var(--bg-surface)] text-[var(--text-primary)] border border-white/20 rounded px-3 py-1 text-sm"
            />
            <select
              value={regionFilter}
              onChange={e => setRegionFilter(e.target.value)}
              className="bg-[var(--bg-surface)] text-[var(--text-primary)] border border-white/20 rounded px-3 py-1 text-sm"
            >
              <option value="">All Regions</option>
              {regions.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[var(--text-secondary)] border-b border-white/15">
                <th className="text-left py-2 px-3">Country</th>
                <th className="text-left py-2 px-3">ISO3</th>
                <th className="text-left py-2 px-3">Region</th>
                <th className="text-left py-2 px-3">Sub-Region</th>
                <th className="text-right py-2 px-3">Population</th>
                <th className="text-center py-2 px-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr
                  key={c.id}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <td className="py-2 px-3 font-semibold text-white">{c.name}</td>
                  <td className="py-2 px-3">{c.iso3}</td>
                  <td className="py-2 px-3">{c.region}</td>
                  <td className="py-2 px-3">{c.sub_region}</td>
                  <td className="py-2 px-3 text-right">
                    {c.population ? c.population.toLocaleString() : 'N/A'}
                  </td>
                  <td className="py-2 px-3 text-center">
                    <button
                      onClick={() => setSelectedIso3(c.iso3)}
                      className="text-[var(--accent)] hover:text-white text-xs border border-[var(--accent)] hover:bg-[var(--accent)] rounded px-2 py-1 transition-colors"
                    >
                      👁️ View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-8 text-[var(--text-secondary)]">
            No countries match the current filters.
          </div>
        )}
      </div>
      {selectedIso3 && (
        <CountryDetailModal
          iso3={selectedIso3}
          onClose={() => setSelectedIso3(null)}
        />
      )}
    </>
  );
}
