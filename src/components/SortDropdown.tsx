"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check } from "lucide-react";
import { SortOption } from "@/types/article";
import { cn } from "@/lib/utils";

interface SortDropdownProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
}

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "date-desc", label: "Newest first" },
  { value: "date-asc", label: "Oldest first" },
  { value: "title-asc", label: "Title A–Z" },
  { value: "title-desc", label: "Title Z–A" },
];

export function SortDropdown({ value, onChange }: SortDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = sortOptions.find((opt) => opt.value === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
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
          "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors",
          "text-muted-foreground hover:text-foreground",
          "border border-transparent hover:border-border",
          isOpen && "border-border text-foreground"
        )}
      >
        <span>{selectedOption?.label}</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 transition-transform duration-150",
            isOpen && "rotate-180"
          )}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
            className="absolute right-0 top-full mt-1 z-50 min-w-[140px] py-1 bg-card border border-border rounded-lg shadow-lg origin-top-right"
          >
            {sortOptions.map((option, index) => (
              <motion.button
                key={option.value}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.15, delay: index * 0.03 }}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left transition-colors",
                  option.value === value
                    ? "text-foreground bg-accent/50"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/30"
                )}
              >
                <motion.div
                  initial={false}
                  animate={{ scale: option.value === value ? 1 : 0 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                >
                  <Check className="h-3.5 w-3.5" />
                </motion.div>
                {option.label}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
