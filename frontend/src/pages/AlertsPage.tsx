import { useState, useMemo } from 'react';
import SeverityBadge from '../components/common/SeverityBadge';
import { alerts as allAlerts } from '../data';

export default function AlertsPage() {
  const [severityFilter, setSeverityFilter] = useState('');

  const filtered = useMemo(() => {
    if (!severityFilter) return allAlerts;
    return allAlerts.filter(a => a.severity === severityFilter);
  }, [severityFilter]);

  const borderColor: Record<string, string> = {
    emergency: 'border-l-[var(--phase5-color)]',
    critical: 'border-l-[var(--phase4-color)]',
    warning: 'border-l-[var(--phase3-color)]',
    info: 'border-l-[var(--phase2-color)]',
  };

  return (
    <div className="bg-[var(--bg-card)] rounded-lg p-5">
      <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-3 flex-wrap gap-2">
        <h3 className="text-white font-semibold">
          <span className="text-[var(--accent)] mr-2">⚠️</span>
          All Active Alerts
        </h3>
        <select
          value={severityFilter}
          onChange={e => setSeverityFilter(e.target.value)}
          className="bg-[var(--bg-surface)] text-[var(--text-primary)] border border-white/20 rounded px-3 py-1 text-sm"
        >
          <option value="">All Severities</option>
          <option value="emergency">Emergency</option>
          <option value="critical">Critical</option>
          <option value="warning">Warning</option>
          <option value="info">Info</option>
        </select>
      </div>
      <div className="space-y-2.5">
        {filtered.map(alert => (
          <div
            key={alert.id}
            className={`bg-white/[0.03] rounded-md p-4 border-l-[3px] ${borderColor[alert.severity] ?? 'border-l-gray-500'} hover:bg-white/[0.06] transition-colors`}
          >
            <div className="flex items-center gap-2 flex-wrap">
              <SeverityBadge severity={alert.severity} />
              <span className="text-sm text-[var(--text-secondary)]">
                {alert.country_name} ({alert.iso3})
              </span>
            </div>
            <div className="font-semibold text-white mt-1.5">{alert.title}</div>
            <div className="text-sm text-[var(--text-secondary)] mt-1">
              {alert.description}
            </div>
            <div className="text-xs text-[var(--text-secondary)] mt-2">
              📅 {alert.alert_date} &bull; 🏷️ {alert.source}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-8 text-[var(--text-secondary)]">
            No alerts match the selected filter.
          </div>
        )}
      </div>
    </div>
  );
}
