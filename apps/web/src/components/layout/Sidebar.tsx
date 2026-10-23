import { NavLink } from 'react-router-dom';
import { BrandMark } from '../ui/BrandMark';

const links = [
  { to: '/', label: 'Overview', end: true },
  { to: '/monitors', label: 'Monitors', end: false },
  { to: '/incidents', label: 'Incidents', end: false },
  { to: '/settings', label: 'Settings', end: false },
] as const;

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity lg:hidden ${
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
        aria-hidden={!mobileOpen}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-surface-raised transition-transform lg:static lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Primary"
      >
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          <BrandMark />
          <button
            type="button"
            className="rounded-md px-2 py-1 text-sm text-ink-muted hover:bg-surface-overlay hover:text-ink lg:hidden"
            onClick={onClose}
            aria-label="Close navigation"
          >
            Close
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-3" aria-label="Main">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              onClick={onClose}
              className={({ isActive }) =>
                [
                  'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-accent-soft text-accent'
                    : 'text-ink-muted hover:bg-surface-overlay hover:text-ink',
                ].join(' ')
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-border p-4 text-xs text-ink-subtle">
          Milestone 1 foundation
        </div>
      </aside>
    </>
  );
}
