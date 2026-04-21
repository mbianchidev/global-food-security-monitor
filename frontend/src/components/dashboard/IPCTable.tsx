import IPCBadge from '../common/IPCBadge';
import { formatPopulation } from '../../utils/formatters';
import type { IPCClassification } from '../../types';

interface Props {
  data: IPCClassification[];
  onCountryClick: (iso3: string) => void;
}

export default function IPCTable({ data, onCountryClick }: Props) {
  return (
    <div className="bg-[var(--bg-card)] rounded-lg p-5 mb-5">
      <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-3">
        <h3 className="text-white font-semibold">
          <span className="text-[var(--accent)] mr-2">📋</span>
          IPC Classifications — Latest Period
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[var(--text-secondary)] border-b border-white/15">
              <th className="text-left py-2 px-3">Country</th>
              <th className="text-center py-2 px-3">Phase</th>
              <th className="text-left py-2 px-3 min-w-[200px]">Phase Distribution</th>
              <th className="text-right py-2 px-3">Crisis+ Pop</th>
              <th className="text-left py-2 px-3">Period</th>
            </tr>
          </thead>
          <tbody>
            {data.map(row => {
              const total = Math.max(row.total_analyzed, 1);
              const p1w = (row.phase1_population / total) * 100;
              const p2w = (row.phase2_population / total) * 100;
              const p3w = (row.phase3_population / total) * 100;
              const p4w = (row.phase4_population / total) * 100;
              const p5w = (row.phase5_population / total) * 100;
              const crisisPop =
                row.phase3_population + row.phase4_population + row.phase5_population;

              return (
                <tr
                  key={row.id}
                  className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--accent)]"
                  onClick={() => onCountryClick(row.iso3)}
                  onKeyDown={event => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onCountryClick(row.iso3);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <td className="py-2 px-3">
                    <span className="font-semibold text-white">{row.country_name}</span>
                    <span className="text-[var(--text-secondary)] ml-1 text-xs">
                      ({row.iso3})
                    </span>
                  </td>
                  <td className="py-2 px-3 text-center">
                    <IPCBadge phase={row.overall_phase} />
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex h-6 rounded overflow-hidden">
                      <div
                        className="bg-[var(--phase1-color)]"
                        style={{ width: `${p1w}%` }}
                        title={`Phase 1: ${formatPopulation(row.phase1_population)}`}
                      />
                      <div
                        className="bg-[var(--phase2-color)]"
                        style={{ width: `${p2w}%` }}
                        title={`Phase 2: ${formatPopulation(row.phase2_population)}`}
                      />
                      <div
                        className="bg-[var(--phase3-color)]"
                        style={{ width: `${p3w}%` }}
                        title={`Phase 3: ${formatPopulation(row.phase3_population)}`}
                      />
                      <div
                        className="bg-[var(--phase4-color)]"
                        style={{ width: `${p4w}%` }}
                        title={`Phase 4: ${formatPopulation(row.phase4_population)}`}
                      />
                      <div
                        className="bg-[var(--phase5-color)]"
                        style={{ width: `${p5w}%` }}
                        title={`Phase 5: ${formatPopulation(row.phase5_population)}`}
                      />
                    </div>
                  </td>
                  <td className="py-2 px-3 text-right text-white">
                    {formatPopulation(crisisPop)}
                  </td>
                  <td className="py-2 px-3 text-xs text-[var(--text-secondary)]">
                    {row.period_start} to {row.period_end}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
