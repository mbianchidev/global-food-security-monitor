interface Props {
  phase: number;
}

export default function IPCBadge({ phase }: Props) {
  const colors: Record<number, string> = {
    1: 'bg-[var(--phase1-color)] text-gray-800',
    2: 'bg-[var(--phase2-color)] text-gray-800',
    3: 'bg-[var(--phase3-color)] text-white',
    4: 'bg-[var(--phase4-color)] text-white',
    5: 'bg-[var(--phase5-color)] text-white',
  };

  return (
    <span
      className={`inline-flex items-center justify-center w-7 h-7 rounded-full font-bold text-sm ${colors[phase] ?? 'bg-gray-500 text-white'}`}
    >
      {phase}
    </span>
  );
}
