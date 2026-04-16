interface Props {
  severity: string;
}

export default function SeverityBadge({ severity }: Props) {
  const styles: Record<string, string> = {
    emergency: 'bg-[var(--phase5-color)] text-white',
    critical: 'bg-[var(--phase4-color)] text-white',
    warning: 'bg-[var(--phase3-color)] text-white',
    info: 'bg-[var(--phase2-color)] text-gray-800',
  };

  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-[0.7rem] font-bold uppercase tracking-wider ${styles[severity] ?? 'bg-gray-500 text-white'}`}
    >
      {severity}
    </span>
  );
}
