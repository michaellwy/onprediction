"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check } from "lucide-react";
import { NEWS_CATEGORIES, NEWS_BEAT_HSL } from "@/types/news";
import type { NewsCategory } from "@/types/news";
import { cn } from "@/lib/utils";

interface Props {
  activeLens: NewsCategory | null;
  onLens: (c: NewsCategory | null) => void;
}

const OPTIONS: (NewsCategory | null)[] = [null, ...NEWS_CATEGORIES];

function Dot({ category }: { category: NewsCategory }) {
  return (
    <span
      className="h-[7px] w-[7px] shrink-0 rounded-full"
      style={{ background: `hsl(${NEWS_BEAT_HSL[category]})` }}
      aria-hidden
    />
  );
}

export function CategoryDropdown({ activeLens, onLens }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-3 h-9 rounded-md text-sm transition-colors",
          "text-muted-foreground hover:text-foreground",
          "border border-transparent hover:border-border",
          isOpen && "border-border text-foreground"
        )}
      >
        {activeLens && <Dot category={activeLens} />}
        <span>{activeLens ?? "All categories"}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-150", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
            className="absolute left-0 top-full mt-1 z-50 min-w-[180px] py-1 bg-card border border-border rounded-lg shadow-lg origin-top-left"
          >
            {OPTIONS.map((option, index) => {
              const active = activeLens === option;
              return (
                <motion.button
                  key={option ?? "all"}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.15, delay: index * 0.03 }}
                  onClick={() => {
                    onLens(option);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2.5 sm:py-1.5 text-sm text-left transition-colors",
                    active ? "text-foreground bg-accent/50" : "text-muted-foreground hover:text-foreground hover:bg-accent/30"
                  )}
                >
                  <motion.div
                    initial={false}
                    animate={{ scale: active ? 1 : 0 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </motion.div>
                  {option && <Dot category={option} />}
                  {option ?? "All categories"}
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
