"use client";

import { Search, X } from "lucide-react";
import { NEWS_CATEGORIES, NEWS_BEAT_HSL } from "@/types/news";
import type { NewsCategory } from "@/types/news";
import { NT_RANGES, type NtRange, type NtTheme } from "./terminalData";
import { ThemeToggle } from "./ThemeToggle";
import { cn } from "@/lib/utils";

interface Props {
  commandText: string;
  onCommandText: (v: string) => void;
  activeLens: NewsCategory | null;
  onLens: (c: NewsCategory | null) => void;
  activeRange: NtRange;
  onRange: (r: NtRange) => void;
  theme: NtTheme;
  onToggleTheme: () => void;
}

function Chip({
  active, onClick, children,
}: {
  active: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-medium transition-colors",
        active
          ? "bg-[hsl(var(--nt-ember)/0.12)] text-[hsl(var(--nt-ember))] ring-1 ring-[hsl(var(--nt-ember)/0.35)]"
          : "text-[hsl(var(--nt-ink-dim))] hover:bg-[hsl(var(--nt-ink)/0.05)] hover:text-[hsl(var(--nt-ink))]"
      )}
    >
      {children}
    </button>
  );
}

export function CommandBar({
  commandText, onCommandText, activeLens, onLens, activeRange, onRange, theme, onToggleTheme,
}: Props) {
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-[hsl(var(--nt-hairline))] bg-[hsl(var(--nt-surface-0))] px-4 py-2.5 sm:px-6">
      {/* command input */}
      <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[hsl(var(--nt-ink-faint))]" />
        <input
          value={commandText}
          onChange={(e) => onCommandText(e.target.value)}
          placeholder="Filter…  try :regulation"
          spellCheck={false}
          className="w-full rounded-md bg-[hsl(var(--nt-ink)/0.05)] py-1.5 pl-8 pr-7 text-[13px] text-[hsl(var(--nt-ink))] placeholder:text-[hsl(var(--nt-ink-faint))] focus:bg-[hsl(var(--nt-ink)/0.07)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--nt-ember)/0.18)]"
        />
        {commandText && (
          <button
            onClick={() => onCommandText("")}
            aria-label="Clear"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[hsl(var(--nt-ink-faint))] hover:text-[hsl(var(--nt-ink))]"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* lens chips */}
      <div className="flex items-center gap-1.5">
        <span className="hidden text-[10px] font-semibold uppercase tracking-[0.16em] text-[hsl(var(--nt-ink-faint))] sm:inline">
          Lens
        </span>
        <div className="flex flex-wrap items-center gap-1">
          <Chip active={activeLens === null} onClick={() => onLens(null)}>All</Chip>
          {NEWS_CATEGORIES.map((c) => (
            <Chip key={c} active={activeLens === c} onClick={() => onLens(activeLens === c ? null : c)}>
              <span
                className="h-[6px] w-[6px] rounded-full"
                style={{ background: `hsl(${NEWS_BEAT_HSL[c]})` }}
                aria-hidden
              />
              {c}
            </Chip>
          ))}
        </div>
      </div>

      {/* range chips + theme toggle, pushed right */}
      <div className="ml-auto flex items-center gap-1.5">
        <div className="flex items-center gap-1">
          {NT_RANGES.map((r) => (
            <Chip key={r.value} active={activeRange === r.value} onClick={() => onRange(r.value)}>
              <span className="nt-num">{r.label}</span>
            </Chip>
          ))}
        </div>
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>
    </div>
  );
}
