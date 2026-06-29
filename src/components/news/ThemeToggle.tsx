"use client";

import { Sun, Moon } from "lucide-react";
import type { NtTheme } from "./terminalData";

export function ThemeToggle({ theme, onToggle }: { theme: NtTheme; onToggle: () => void }) {
  const isDark = theme === "dark";
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Light" : "Dark"}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[hsl(var(--nt-ink-dim))] transition-colors hover:bg-[hsl(var(--nt-ink)/0.06)] hover:text-[hsl(var(--nt-ink))]"
    >
      {isDark ? <Sun className="h-[15px] w-[15px]" /> : <Moon className="h-[15px] w-[15px]" />}
    </button>
  );
}
