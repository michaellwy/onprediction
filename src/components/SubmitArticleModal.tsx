"use client";

import { useState, FormEvent } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Check, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";


interface SubmitArticleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type FormState = "form" | "submitting" | "success" | "error";

export function SubmitArticleModal({
  open,
  onOpenChange,
}: SubmitArticleModalProps) {
  const [url, setUrl] = useState("");
  const [reason, setReason] = useState("");
  const [formState, setFormState] = useState<FormState>("form");
  const [errorMessage, setErrorMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    url?: string;
    reason?: string;
  }>({});

  function resetForm() {
    setUrl("");
    setReason("");
    setFormState("form");
    setErrorMessage("");
    setFieldErrors({});
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      // Reset when closing, but delay so the close animation plays
      setTimeout(resetForm, 200);
    }
    onOpenChange(nextOpen);
  }

  function validate(): boolean {
    const errors: { url?: string; reason?: string } = {};

    let normalizedUrl = url.trim();
    if (normalizedUrl && !/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = "https://" + normalizedUrl;
      setUrl(normalizedUrl);
    }

    if (!normalizedUrl) {
      errors.url = "URL is required";
    } else {
      try {
        new URL(normalizedUrl);
      } catch {
        errors.url = "Please enter a valid URL";
      }
    }

    if (reason.trim().length > 500) {
      errors.reason = "Maximum 500 characters";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!validate()) return;

    setFormState("submitting");

    try {
      const trimmedReason = reason.trim();
      const { error } = await supabase.from("submissions").insert({
        url: url.trim(),
        reason: trimmedReason || null,
      });

      if (error) {
        setErrorMessage(error.message);
        setFormState("error");
        return;
      }

      setFormState("success");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
      setFormState("error");
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md rounded-xl bg-card border border-border p-6 shadow-xl max-h-[90dvh] overflow-y-auto data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
          <div className="flex items-center justify-between mb-6">
            <Dialog.Title className="font-serif text-lg font-semibold text-foreground">
              {formState === "success" ? "Submitted!" : "Suggest an article"}
            </Dialog.Title>
            <Dialog.Close className="flex items-center justify-center w-11 h-11 -mr-2 -mt-2 rounded-md text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          {formState === "success" ? (
            <div className="flex flex-col items-center py-6 gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <Check className="h-6 w-6 text-emerald-500" />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Thanks for your submission! We&apos;ll review it soon.
              </p>
              <button
                onClick={() => handleOpenChange(false)}
                className="mt-2 h-9 px-4 rounded-lg border border-border bg-background hover:bg-accent/50 text-sm font-medium transition-colors"
              >
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Dialog.Description className="text-sm text-muted-foreground -mt-2 mb-4">
                Know a great article about prediction markets? Share it with us.
              </Dialog.Description>

              {formState === "error" && errorMessage && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-400">
                  {errorMessage}
                </div>
              )}

              <div>
                <label
                  htmlFor="article-url"
                  className="block text-sm font-medium text-foreground mb-1.5"
                >
                  Article URL
                </label>
                <input
                  id="article-url"
                  type="url"
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    if (fieldErrors.url) setFieldErrors((prev) => ({ ...prev, url: undefined }));
                  }}
                  placeholder="https://..."
                  className="w-full h-10 rounded-lg border border-border bg-background px-3 text-base text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-colors"
                />
                {fieldErrors.url && (
                  <p className="mt-1 text-xs text-red-400">{fieldErrors.url}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="article-reason"
                  className="block text-sm font-medium text-foreground mb-1.5"
                >
                  What did you enjoy about this article?
                </label>
                <textarea
                  id="article-reason"
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    if (fieldErrors.reason) setFieldErrors((prev) => ({ ...prev, reason: undefined }));
                  }}
                  placeholder="Tell us what you found interesting or useful..."
                  rows={4}
                  maxLength={500}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-base text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-colors resize-none"
                />
                <div className="flex items-center justify-between mt-1">
                  {fieldErrors.reason ? (
                    <p className="text-xs text-red-400">{fieldErrors.reason}</p>
                  ) : (
                    <span />
                  )}
                  <span
                    className={`text-xs ${
                      reason.length > 500
                        ? "text-red-400"
                        : reason.length >= 40
                          ? "text-muted-foreground"
                          : "text-muted-foreground/50"
                    }`}
                  >
                    {reason.length}/500
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={formState === "submitting"}
                className="w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {formState === "submitting" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit"
                )}
              </button>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
