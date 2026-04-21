export default function Footer() {
  return (
    <footer className="text-center py-5 text-[var(--text-secondary)] text-sm border-t border-white/5 mt-8">
      Global Food Security Monitor v2.0.0 &copy; {new Date().getFullYear()} |{' '}
      <span className="text-[var(--accent)]">⚗ DEMO — MOCK DATA</span> |{' '}
      Data sources: IPC, FAO, WFP, FEWS NET, UNICEF |{' '}
      React + TypeScript + Vite
    </footer>
  );
}
