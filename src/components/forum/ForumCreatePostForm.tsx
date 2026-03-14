"use client";

import { useState, useRef, useCallback } from "react";
import { Loader2, ImagePlus } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { useImageUpload } from "@/hooks/useImageUpload";

interface ForumCreatePostFormProps {
  onSubmit: (title: string, body: string) => Promise<boolean>;
}

export function ForumCreatePostForm({ onSubmit }: ForumCreatePostFormProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadImage, isUploading, uploadError, clearError } = useImageUpload();

  const titleValid = title.trim().length >= 5;
  const bodyValid = body.trim().length > 0;
  const canSubmit = titleValid && bodyValid && !isSubmitting && !isUploading;

  // Insert text at cursor position in textarea
  const insertAtCursor = useCallback(
    (text: string) => {
      const textarea = textareaRef.current;
      if (!textarea) {
        setBody((prev) => prev + text);
        return;
      }

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const before = body.slice(0, start);
      const after = body.slice(end);

      // Add newlines around image if needed
      const needsNewlineBefore = before.length > 0 && !before.endsWith("\n");
      const needsNewlineAfter = after.length > 0 && !after.startsWith("\n");
      const insert = `${needsNewlineBefore ? "\n" : ""}${text}${needsNewlineAfter ? "\n" : ""}`;

      const newBody = before + insert + after;
      setBody(newBody);

      // Restore cursor position after the inserted text
      requestAnimationFrame(() => {
        const newPos = start + insert.length;
        textarea.selectionStart = newPos;
        textarea.selectionEnd = newPos;
        textarea.focus();
      });
    },
    [body]
  );

  const handleImageFile = useCallback(
    async (file: File) => {
      clearError();
      const url = await uploadImage(file);
      if (url) {
        insertAtCursor(`![image](${url})`);
      }
    },
    [uploadImage, insertAtCursor, clearError]
  );

  // Handle paste events — detect images
  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData.items;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) handleImageFile(file);
          return;
        }
      }
    },
    [handleImageFile]
  );

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const files = e.dataTransfer.files;
      for (const file of files) {
        if (file.type.startsWith("image/")) {
          handleImageFile(file);
          return; // One image at a time
        }
      }
    },
    [handleImageFile]
  );

  // File input handler
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleImageFile(file);
      // Reset input so the same file can be selected again
      e.target.value = "";
    },
    [handleImageFile]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAttempted(true);
    if (!canSubmit) return;

    setIsSubmitting(true);
    setError(null);

    const success = await onSubmit(title, body);
    if (!success) {
      setError("Failed to publish post. Please try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Title input */}
      <div>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          maxLength={150}
          className={cn(
            "w-full font-sans text-xl font-bold text-foreground placeholder:text-muted-foreground/40 bg-transparent border-b pb-2 outline-none focus:outline-none transition-colors",
            attempted && !titleValid ? "border-red-400/60" : "border-border/40 focus:border-primary/40"
          )}
        />
        {attempted && !titleValid && (
          <p className="text-xs text-red-400/80 mt-1">
            {title.trim().length === 0 ? "Title is required" : `${5 - title.trim().length} more characters needed`}
          </p>
        )}
      </div>

      {/* Body textarea with drag-and-drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="relative"
      >
        <textarea
          ref={textareaRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onPaste={handlePaste}
          placeholder="What's your take today? Markdown is supported. Paste or drag images here."
          rows={6}
          maxLength={20000}
          disabled={isUploading}
          className={cn(
            "w-full rounded-lg border bg-background px-4 py-3 font-sans text-[15px] leading-relaxed text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors resize-y",
            isDragOver && "border-primary ring-2 ring-primary/30",
            attempted && !bodyValid ? "border-red-400/60" : "border-border focus:border-primary/50"
          )}
        />

        {/* Drag overlay */}
        {isDragOver && (
          <div className="absolute inset-0 rounded-lg bg-primary/5 border-2 border-dashed border-primary/40 flex items-center justify-center pointer-events-none">
            <p className="text-sm font-medium text-primary/70">Drop image here</p>
          </div>
        )}

        {attempted && !bodyValid && (
          <p className="text-xs text-red-400/80 mt-1">Post body is required</p>
        )}
      </div>

      {/* Image upload bar */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <ImagePlus className="h-3.5 w-3.5" />
              Add image
            </>
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          onChange={handleFileSelect}
          className="hidden"
        />
        {uploadError && (
          <p className="text-xs text-red-400/80">{uploadError}</p>
        )}
      </div>

      {/* Live preview */}
      {body.trim() && (
        <div>
          <span className="text-xs text-muted-foreground/60 mb-2 block">Preview</span>
          <div className="rounded-lg border border-border/60 bg-background px-4 py-3">
            <MarkdownRenderer content={body} />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        <Link
          href="/forum"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={isSubmitting || isUploading}
          className="h-10 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Publishing...
            </>
          ) : (
            "Publish"
          )}
        </button>
      </div>
    </form>
  );
}
