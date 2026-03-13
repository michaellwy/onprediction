"use client";

import { useState } from "react";
import { ArrowUp, Share2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";

interface ForumPostActionsProps {
  isUpvoted: boolean;
  upvoteCount: number;
  onToggleUpvote: () => void;
  isAuthor: boolean;
  onDelete: () => Promise<void>;
  postId: string;
}

export function ForumPostActions({
  isUpvoted,
  upvoteCount,
  onToggleUpvote,
  isAuthor,
  onDelete,
  postId,
}: ForumPostActionsProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);
    await onDelete();
    setIsDeleting(false);
    setDeleteOpen(false);
  }

  function handleShare() {
    const url = `${window.location.origin}/forum/post?id=${postId}`;
    navigator.clipboard.writeText(url).then(() => {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    });
  }

  return (
    <>
      <div className="flex items-center gap-1 border-t border-b border-border/40 py-2 my-6">
        <button
          onClick={onToggleUpvote}
          className={cn(
            "flex items-center gap-1.5 h-8 px-3 rounded-md text-sm font-medium transition-colors",
            isUpvoted
              ? "bg-emerald-500/10 text-emerald-600"
              : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
          )}
        >
          <ArrowUp className="h-4 w-4" />
          {upvoteCount > 0 ? upvoteCount : "Upvote"}
        </button>

        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 h-8 px-3 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
        >
          <Share2 className="h-4 w-4" />
          {shareCopied ? "Copied!" : "Share"}
        </button>

        {isAuthor && (
          <button
            onClick={() => setDeleteOpen(true)}
            className="flex items-center gap-1.5 h-8 px-3 rounded-md text-sm font-medium text-muted-foreground hover:text-red-600 hover:bg-red-500/10 transition-colors ml-auto"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        )}
      </div>

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
        title="Delete post"
        description="This will permanently delete your post and all its comments. This action cannot be undone."
      />
    </>
  );
}
