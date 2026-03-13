"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X, Loader2 } from "lucide-react";

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isDeleting: boolean;
  title: string;
  description: string;
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  isDeleting,
  title,
  description,
}: DeleteConfirmDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm rounded-xl bg-card border border-border p-6 shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="font-serif text-lg font-semibold text-foreground">
              {title}
            </Dialog.Title>
            <Dialog.Close className="flex items-center justify-center w-9 h-9 -mr-2 -mt-2 rounded-md text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>
          <Dialog.Description className="text-sm text-muted-foreground mb-6">
            {description}
          </Dialog.Description>
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => onOpenChange(false)}
              disabled={isDeleting}
              className="h-9 px-4 rounded-lg border border-border bg-background hover:bg-accent/50 text-sm font-medium transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isDeleting}
              className="h-9 px-4 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
