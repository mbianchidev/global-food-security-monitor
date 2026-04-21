export default function AboutPage() {
  return (
    <div className="bg-[var(--bg-card)] rounded-lg p-5">
      <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-3">
        <h3 className="text-white font-semibold">
          <span className="text-[var(--accent)] mr-2">ℹ️</span>
          About This Application
        </h3>
      </div>
      <div className="max-w-3xl space-y-6">
        <div>
          <h4 className="text-white text-lg font-semibold mb-2">Global Food Security Monitor</h4>
          <p className="text-[var(--text-primary)]">
            This application aggregates and visualizes food security data from multiple
            international sources to provide a unified view of global hunger and food crisis
            situations.
          </p>
        </div>

        <div>
          <h5 className="text-white font-semibold mb-2">Data Sources</h5>
          <ul className="list-disc list-inside space-y-1">
            <li>
              <strong className="text-white">IPC (Integrated Food Security Phase Classification)</strong>{' '}
              — Acute food insecurity classifications
            </li>
            <li>
              <strong className="text-white">FAO (Food and Agriculture Organization)</strong>{' '}
              — Agricultural production and food price data
            </li>
            <li>
              <strong className="text-white">WFP (World Food Programme)</strong>{' '}
              — Market prices, food security assessments
            </li>
            <li>
              <strong className="text-white">FEWS NET (Famine Early Warning Systems Network)</strong>{' '}
              — Food security alerts and forecasts
            </li>
            <li>
              <strong className="text-white">UNICEF</strong> — Child nutrition indicators
            </li>
          </ul>
        </div>

        <div>
          <h5 className="text-white font-semibold mb-2">IPC Phase Classification</h5>
          <table className="text-sm max-w-xl">
            <tbody>
              {[
                { phase: 1, label: 'Minimal/None', desc: 'Households able to meet food and non-food needs' },
                { phase: 2, label: 'Stressed', desc: 'Minimally adequate food consumption, unable to afford non-food expenses' },
                { phase: 3, label: 'Crisis', desc: 'Food gaps with high acute malnutrition' },
                { phase: 4, label: 'Emergency', desc: 'Large food gaps, very high acute malnutrition and excess mortality' },
                { phase: 5, label: 'Famine', desc: 'Mass starvation, death, and destitution' },
              ].map(row => {
                const colors: Record<number, string> = {
                  1: 'bg-[var(--phase1-color)] text-gray-800',
                  2: 'bg-[var(--phase2-color)] text-gray-800',
                  3: 'bg-[var(--phase3-color)] text-white',
                  4: 'bg-[var(--phase4-color)] text-white',
                  5: 'bg-[var(--phase5-color)] text-white',
                };
                return (
                  <tr key={row.phase} className="border-b border-white/5">
                    <td className="py-2 px-2">
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full font-bold text-sm ${colors[row.phase]}`}>
                        {row.phase}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-white font-semibold">{row.label}</td>
                    <td className="py-2 px-2 text-[var(--text-secondary)]">{row.desc}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div>
          <h5 className="text-white font-semibold mb-2">Technical Details</h5>
          <p>
            <strong className="text-white">Version:</strong> 2.0.0<br />
            <strong className="text-white">Stack:</strong> React 19, TypeScript, Vite, Tailwind CSS, Chart.js<br />
            <strong className="text-white">Deployment:</strong> GitHub Pages via GitHub Actions
          </p>
        </div>

        <div className="bg-[var(--phase3-color)]/15 border border-[var(--phase3-color)] rounded-lg p-4">
          <p>
            <span className="mr-1">⚠️</span>
            <strong className="text-white">Disclaimer:</strong>{' '}
            This is a monitoring tool for informational purposes only. Food security
            assessments should be verified against official IPC/CH analyses and humanitarian
            situation reports before being used for operational decision-making.
          </p>
        </div>
      </div>
    </div>
  );
}
