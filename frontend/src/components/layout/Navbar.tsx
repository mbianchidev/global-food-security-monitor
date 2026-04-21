import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/alerts', label: 'Alerts', icon: '⚠️' },
  { to: '/countries', label: 'Countries', icon: '🏳️' },
  { to: '/country-stats', label: 'Country Stats', icon: '🔍' },
  { to: '/prices', label: 'Prices', icon: '📈' },
  { to: '/about', label: 'About', icon: 'ℹ️' },
];

export default function Navbar() {
  return (
    <nav className="bg-[var(--bg-card)] border-b-2 border-[var(--accent)] px-6 py-3">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[var(--accent)] text-xl">🌍</span>
          <span className="text-white font-bold text-lg">Global Food Security Monitor</span>
          <span className="bg-[var(--bg-surface)] text-[var(--text-secondary)] text-xs px-2 py-0.5 rounded-full ml-2">
            v2.0.0
          </span>
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded text-sm transition-colors ${
                  isActive
                    ? 'text-[var(--accent)] bg-[var(--bg-surface)]'
                    : 'text-[var(--text-secondary)] hover:text-white'
                }`
              }
            >
              <span className="mr-1">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}
