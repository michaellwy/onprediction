"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { AuthButton } from "@/components/AuthButton";
import { SubmitArticleModal } from "@/components/SubmitArticleModal";

export function Header() {
  const pathname = usePathname();
  const [submitOpen, setSubmitOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <header className="shrink-0 z-30 bg-gradient-to-b from-accent/40 to-background border-b border-border/50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 sm:gap-3 group min-w-0">
            <svg
              viewBox="0 0 32 32"
              className="w-7 h-7 sm:w-10 sm:h-10 text-primary shrink-0 group-hover:rotate-180 transition-transform duration-500"
              aria-hidden="true"
            >
              <rect
                x="7.5" y="7.5"
                width="17" height="17"
                rx="4"
                transform="rotate(45 16 16)"
                fill="currentColor"
              />
            </svg>
            <div className="min-w-0">
              <h1 className="font-display text-lg sm:text-xl font-semibold text-foreground leading-none tracking-tight">
                On Prediction
              </h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground tracking-wide mt-0.5 truncate">
                Curated content for builders, investors & researchers
              </p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden sm:flex items-center gap-2">
            <Link
              href="/forum"
              className={cn(
                "relative px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                pathname?.startsWith("/forum")
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
              )}
            >
              Forum
              {pathname?.startsWith("/forum") && (
                <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-primary/70" />
              )}
            </Link>
            <Link
              href="/"
              className={cn(
                "relative px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                pathname === "/"
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
              )}
            >
              Articles
              {pathname === "/" && (
                <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-primary/70" />
              )}
            </Link>
            <Link
              href="/concepts"
              className={cn(
                "relative px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                pathname === "/concepts"
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
              )}
            >
              Concepts
              {pathname === "/concepts" && (
                <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-primary/70" />
              )}
            </Link>

            <div className="h-4 w-px bg-border mx-2" />

            <button
              onClick={() => setSubmitOpen(true)}
              className="px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-md transition-colors"
            >
              Submit
            </button>
            <AuthButton />
          </nav>

          {/* Mobile Navigation */}
          <div className="flex sm:hidden">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center justify-center w-11 h-11 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

          {/* Mobile Menu Overlay */}
          {menuOpen && (
            <div
              className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 sm:hidden"
              onClick={() => setMenuOpen(false)}
            />
          )}

          {/* Mobile Menu Sheet */}
          <div
            className={cn(
              "fixed inset-y-0 right-0 w-64 bg-background border-l border-border z-50 sm:hidden",
              "transform transition-transform duration-200 ease-out",
              menuOpen ? "translate-x-0" : "translate-x-full"
            )}
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <span className="font-serif text-base font-semibold text-foreground">Menu</span>
              <button
                onClick={() => setMenuOpen(false)}
                className="flex items-center justify-center w-11 h-11 -mr-2 rounded-md text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="p-2">
              <Link
                href="/forum"
                className={cn(
                  "flex items-center h-11 px-3 rounded-md text-sm font-medium transition-colors",
                  pathname?.startsWith("/forum")
                    ? "text-primary bg-primary/5"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                )}
              >
                Forum
              </Link>
              <Link
                href="/"
                className={cn(
                  "flex items-center h-11 px-3 rounded-md text-sm font-medium transition-colors",
                  pathname === "/"
                    ? "text-primary bg-primary/5"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                )}
              >
                Articles
              </Link>
              <Link
                href="/concepts"
                className={cn(
                  "flex items-center h-11 px-3 rounded-md text-sm font-medium transition-colors",
                  pathname === "/concepts"
                    ? "text-primary bg-primary/5"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                )}
              >
                Concepts
              </Link>
              <button
                onClick={() => {
                  setSubmitOpen(true);
                  setMenuOpen(false);
                }}
                className="flex items-center h-11 px-3 rounded-md text-sm font-medium text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors w-full text-left"
              >
                Submit
              </button>
              <div className="px-3 pt-2">
                <AuthButton />
              </div>
            </nav>
          </div>

          <SubmitArticleModal open={submitOpen} onOpenChange={setSubmitOpen} />
        </div>
      </div>
    </header>
  );
}
