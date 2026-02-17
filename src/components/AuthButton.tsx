"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

export function AuthButton() {
  const { user, isLoading, openSignInModal, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  if (isLoading) {
    return (
      <div className="w-8 h-8 rounded-full bg-muted animate-pulse shrink-0" />
    );
  }

  if (!user) {
    return (
      <button
        onClick={openSignInModal}
        className="h-8 px-3 rounded-lg border border-border bg-background hover:bg-accent/50 text-sm font-medium text-foreground transition-colors"
      >
        Sign in
      </button>
    );
  }

  const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture;
  const displayName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email ||
    "User";

  return (
    <div className="relative flex items-center" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="shrink-0 rounded-full ring-2 ring-transparent hover:ring-border transition-all"
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className="w-8 h-8 rounded-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
            className="absolute right-0 top-full mt-2 z-50 w-56 py-1 bg-background border border-border rounded-lg shadow-lg origin-top-right"
          >
            <div className="px-3 py-2 border-b border-border/50">
              <p className="text-sm font-medium text-foreground truncate">
                {displayName}
              </p>
              {user.email && (
                <p className="text-xs text-muted-foreground truncate">
                  {user.email}
                </p>
              )}
            </div>

            <div className="border-t border-border/50">
              <button
                onClick={() => {
                  setIsOpen(false);
                  signOut();
                }}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors",
                  "text-muted-foreground hover:text-foreground hover:bg-accent/30"
                )}
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
