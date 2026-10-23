import { BrandMark } from '../ui/BrandMark';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-surface/90 px-4 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="rounded-md border border-border px-2.5 py-1.5 text-sm text-ink-muted hover:bg-surface-overlay hover:text-ink lg:hidden"
          onClick={onMenuClick}
          aria-label="Open navigation"
        >
          Menu
        </button>
        <div className="lg:hidden">
          <BrandMark compact />
        </div>
        <p className="hidden text-sm text-ink-muted sm:block lg:inline">
          Self-hosted API monitoring
        </p>
      </div>
      <span className="rounded-md border border-border bg-surface-raised px-2.5 py-1 font-mono text-xs text-ink-subtle">
        local
      </span>
    </header>
  );
}
