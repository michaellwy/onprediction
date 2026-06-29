"use client";

export function Masthead({ events, signals }: { events: number; signals: number }) {
  return (
    <header className="flex shrink-0 items-center justify-between gap-4 border-b border-[hsl(var(--nt-hairline))] bg-[hsl(var(--nt-surface-1))] px-4 py-3 sm:px-6">
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-1.5">
          <span className="nt-live-dot h-2 w-2 rounded-full bg-[hsl(var(--nt-ember))]" aria-hidden />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[hsl(var(--nt-ember))]">Live</span>
        </span>
        <span className="h-4 w-px bg-[hsl(var(--nt-hairline))]" aria-hidden />
        <h1 className="text-[15px] font-semibold tracking-[-0.01em] text-[hsl(var(--nt-ink))] sm:text-[16px]">
          Prediction-Market Newswire
        </h1>
      </div>

      <div className="nt-num flex items-center gap-2 text-[12px] tracking-[0.02em] text-[hsl(var(--nt-ink-dim))]">
        <span className="font-semibold text-[hsl(var(--nt-ink))]">{events}</span>
        <span className="text-[hsl(var(--nt-ink-faint))]">events</span>
        <span className="text-[hsl(var(--nt-ink-faint))]">·</span>
        <span className="font-semibold text-[hsl(var(--nt-ink))]">{signals}</span>
        <span className="text-[hsl(var(--nt-ink-faint))]">signals</span>
      </div>
    </header>
  );
}
