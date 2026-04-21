import SeverityBadge from '../common/SeverityBadge';
import type { Alert } from '../../types';

interface Props {
  alerts: Alert[];
  maxItems?: number;
}

export default function AlertsFeed({ alerts, maxItems = 5 }: Props) {
  const shown = alerts.slice(0, maxItems);

  const borderColor: Record<string, string> = {
    emergency: 'border-l-[var(--phase5-color)]',
    critical: 'border-l-[var(--phase4-color)]',
    warning: 'border-l-[var(--phase3-color)]',
    info: 'border-l-[var(--phase2-color)]',
  };

  return (
    <div className="bg-[var(--bg-card)] rounded-lg p-5">
      <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-3">
        <h3 className="text-white font-semibold">
          <span className="text-[var(--accent)] mr-2">⚠️</span>
          Latest Alerts
        </h3>
      </div>
      <div className="max-h-[400px] overflow-y-auto space-y-2.5">
        {shown.map(alert => (
          <div
            key={alert.id}
            className={`bg-white/[0.03] rounded-md p-3.5 border-l-[3px] ${borderColor[alert.severity] ?? 'border-l-gray-500'} hover:bg-white/[0.06] transition-colors`}
          >
            <SeverityBadge severity={alert.severity} />
            <div className="font-semibold text-white mt-1.5">{alert.title}</div>
            <div className="text-sm text-[var(--text-secondary)] mt-1">
              {alert.description.substring(0, 120)}...
            </div>
            <div className="text-xs text-[var(--text-secondary)] mt-1.5">
              📍 {alert.country_name} &bull; 📅 {alert.alert_date} &bull; 🏷️ {alert.source}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
