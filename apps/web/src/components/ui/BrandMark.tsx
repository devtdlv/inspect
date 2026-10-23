interface BrandMarkProps {
  compact?: boolean;
}

export function BrandMark({ compact = false }: BrandMarkProps) {
  return (
    <div className="flex items-center gap-2" aria-label="Inspect">
      <span
        className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-accent-soft font-mono text-xs font-semibold text-accent"
        aria-hidden
      >
        In
      </span>
      {!compact && <span className="text-base font-semibold tracking-tight text-ink">Inspect</span>}
    </div>
  );
}
