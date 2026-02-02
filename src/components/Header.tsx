"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function Header() {
  const pathname = usePathname();

  return (
    <header className="shrink-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border/50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <span className="font-serif text-primary font-semibold text-sm">
                OP
              </span>
            </div>
            <div>
              <h1 className="font-serif text-base font-semibold text-foreground leading-none">
                On Prediction
              </h1>
              <p className="text-[10px] text-muted-foreground tracking-wide uppercase">
                For builders & researchers
              </p>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-6">
            <Link
              href="/"
              className={cn(
                "text-sm font-medium transition-colors",
                pathname === "/"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Readings
            </Link>
            <Link
              href="/concepts"
              className={cn(
                "text-sm font-medium transition-colors",
                pathname === "/concepts"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Concepts
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
