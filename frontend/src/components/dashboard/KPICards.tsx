import { formatNumber } from '../../utils/formatters';

interface KPICardProps {
  value: number | string;
  label: string;
  icon: string;
  variant: 'emergency' | 'critical' | 'warning' | 'info';
}

const borderColors: Record<string, string> = {
  emergency: 'border-l-[var(--phase5-color)]',
  critical: 'border-l-[var(--phase4-color)]',
  warning: 'border-l-[var(--phase3-color)]',
  info: 'border-l-[var(--phase2-color)]',
};

function KPICard({ value, label, icon, variant }: KPICardProps) {
  const displayValue = typeof value === 'number' ? formatNumber(value) : value;

  return (
    <div
      className={`bg-[var(--bg-card)] rounded-lg p-5 border-l-4 ${borderColors[variant]} hover:-translate-y-0.5 transition-transform`}
    >
      <div className="text-3xl font-bold text-white leading-tight">{displayValue}</div>
      <div className="text-sm text-[var(--text-secondary)] mt-1">
        <span className="mr-1">{icon}</span> {label}
      </div>
    </div>
  );
}

interface KPICardsProps {
  crisisPopulation: number;
  faminePopulation: number;
  emergencyAlerts: number;
  countriesMonitored: number;
}

export default function KPICards({
  crisisPopulation,
  faminePopulation,
  emergencyAlerts,
  countriesMonitored,
}: KPICardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <KPICard
        value={crisisPopulation}
        label="People in Crisis (IPC 3+)"
        icon="👥"
        variant="emergency"
      />
      <KPICard
        value={faminePopulation}
        label="People Facing Famine (IPC 5)"
        icon="💀"
        variant="critical"
      />
      <KPICard
        value={emergencyAlerts}
        label="Emergency & Critical Alerts"
        icon="🔔"
        variant="warning"
      />
      <KPICard
        value={countriesMonitored}
        label="Countries Monitored"
        icon="🌍"
        variant="info"
      />
    </div>
  );
}
