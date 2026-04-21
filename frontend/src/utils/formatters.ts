export function formatNumber(num: number): string {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
  return num.toLocaleString();
}

export function formatPopulation(num: number): string {
  return num.toLocaleString();
}

export function getPhaseColor(phase: number): string {
  const colors: Record<number, string> = {
    1: '#c6e5b3',
    2: '#f9e065',
    3: '#e67800',
    4: '#c80000',
    5: '#640000',
  };
  return colors[phase] ?? '#666';
}

export function getSeverityColor(severity: string): string {
  const colors: Record<string, string> = {
    emergency: '#640000',
    critical: '#c80000',
    warning: '#e67800',
    info: '#f9e065',
  };
  return colors[severity] ?? '#666';
}
