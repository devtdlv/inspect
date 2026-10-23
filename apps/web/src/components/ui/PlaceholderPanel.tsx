import type { ReactNode } from 'react';

interface PlaceholderPanelProps {
  title: string;
  children: ReactNode;
}

export function PlaceholderPanel({ title, children }: PlaceholderPanelProps) {
  return (
    <section className="rounded-lg border border-dashed border-border-strong bg-surface-raised/60 p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="rounded border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-ink-subtle">
          Placeholder
        </span>
        <h2 className="text-sm font-medium text-ink">{title}</h2>
      </div>
      <div className="text-sm leading-relaxed text-ink-muted">{children}</div>
    </section>
  );
}
