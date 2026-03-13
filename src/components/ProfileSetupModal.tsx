"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface ProfileSetupModalProps {
  open: boolean;
  onSave: (displayName: string) => Promise<boolean>;
}

export function ProfileSetupModal({ open, onSave }: ProfileSetupModalProps) {
  const { user } = useAuth();

  const defaultName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "";

  const [name, setName] = useState(defaultName);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid = name.trim().length >= 1 && name.trim().length <= 50;

  async function handleSave() {
    if (!isValid) return;
    setIsSaving(true);
    setError(null);

    const success = await onSave(name);
    if (!success) {
      setError("Failed to save. Please try again.");
    }
    setIsSaving(false);
  }

  return (
    <Dialog.Root open={open}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm rounded-xl bg-card border border-border p-6 shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          <Dialog.Title className="font-sans text-lg font-semibold text-foreground mb-1">
            Welcome to On Prediction
          </Dialog.Title>
          <Dialog.Description className="text-sm text-muted-foreground mb-5">
            Choose a display name for the forum. You can change this later.
          </Dialog.Description>

          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-400 mb-4">
              {error}
            </div>
          )}

          <div className="mb-5">
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Display name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              placeholder="Your display name"
              className={cn(
                "w-full h-10 px-3 rounded-lg border bg-background text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors",
                "border-border focus:border-primary/50"
              )}
              onKeyDown={(e) => {
                if (e.key === "Enter" && isValid) handleSave();
              }}
              autoFocus
            />
            <p className="text-xs text-muted-foreground/60 mt-1.5">
              This is how others will see you in the forum.
            </p>
          </div>

          <button
            onClick={handleSave}
            disabled={!isValid || isSaving}
            className="w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Continue"
            )}
          </button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
