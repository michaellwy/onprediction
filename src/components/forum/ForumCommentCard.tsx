"use client";

import { useState } from "react";
import { ArrowUp, MessageSquare, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import type { ForumComment } from "@/types/forum";

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

interface ForumCommentCardProps {
  comment: ForumComment;
  replies?: ForumComment[];
  upvoteCount: number;
  isUpvoted: boolean;
  onToggleUpvote: () => void;
  isAuthor: boolean;
  onDelete: () => Promise<boolean>;
  onReply?: (body: string, parentId: string) => Promise<ForumComment | null>;
  replyUpvoteCounts?: Map<string, number>;
  replyUserUpvotes?: Set<string>;
  onToggleReplyUpvote?: (commentId: string) => void;
  currentUserId?: string | null;
  onDeleteReply?: (commentId: string) => Promise<boolean>;
  isNested?: boolean;
}

export function ForumCommentCard({
  comment,
  replies = [],
  upvoteCount,
  isUpvoted,
  onToggleUpvote,
  isAuthor,
  onDelete,
  onReply,
  replyUpvoteCounts,
  replyUserUpvotes,
  onToggleReplyUpvote,
  currentUserId,
  onDeleteReply,
  isNested = false,
}: ForumCommentCardProps) {
  const { user, openSignInModal } = useAuth();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [isReplying, setIsReplying] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);
    await onDelete();
    setIsDeleting(false);
    setDeleteOpen(false);
  }

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyBody.trim() || isReplying || !onReply) return;
    setIsReplying(true);
    const result = await onReply(replyBody, comment.id);
    if (result) {
      setReplyBody("");
      setReplyOpen(false);
    }
    setIsReplying(false);
  }

  return (
    <>
      <div className={cn("py-2", isNested && "pl-4 sm:pl-6 border-l border-border/30")}>
        {/* Header line */}
        <div className="flex items-center gap-1.5 mb-0.5">
          {comment.author_avatar_url && (
            <img src={comment.author_avatar_url} alt="" className="w-4 h-4 rounded-full" />
          )}
          <span className="text-[12px] sm:text-[13px] font-medium text-foreground/80">
            {comment.author_name}
          </span>
          <span className="text-[11px] text-muted-foreground/60">
            {formatRelativeDate(comment.created_at)}
          </span>
        </div>

        {/* Body */}
        <p className="font-sans text-[13px] sm:text-[14px] leading-snug text-foreground/80 whitespace-pre-wrap">
          {comment.body}
        </p>

        {/* Action row */}
        <div className="flex items-center gap-0.5 mt-1">
          <button
            onClick={onToggleUpvote}
            className={cn(
              "flex items-center gap-0.5 h-6 px-1.5 rounded text-[11px] font-medium transition-colors",
              isUpvoted
                ? "text-emerald-600"
                : "text-muted-foreground/40 hover:text-muted-foreground/70"
            )}
          >
            <ArrowUp className="h-3 w-3" />
            {upvoteCount > 0 && <span className="tabular-nums">{upvoteCount}</span>}
          </button>

          {!isNested && (
            <button
              onClick={() => {
                if (!user) { openSignInModal(); return; }
                setReplyOpen(!replyOpen);
              }}
              className="flex items-center gap-0.5 h-6 px-1.5 rounded text-[11px] font-medium text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors"
            >
              <MessageSquare className="h-3 w-3" />
              Reply
            </button>
          )}

          {isAuthor && (
            <button
              onClick={() => setDeleteOpen(true)}
              className="flex items-center h-6 px-1.5 rounded text-[11px] font-medium text-muted-foreground/40 hover:text-red-600 transition-colors"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Inline reply form */}
        {replyOpen && (
          <form onSubmit={handleReply} className="mt-2 pl-4 sm:pl-6 border-l border-border/30">
            <textarea
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              placeholder={`Reply to ${comment.author_name}...`}
              rows={2}
              maxLength={5000}
              autoFocus
              className="w-full rounded border border-border bg-background px-2.5 py-1.5 font-sans text-[13px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors resize-none"
            />
            <div className="flex items-center gap-2 mt-1">
              <button
                type="submit"
                disabled={!replyBody.trim() || isReplying}
                className="h-6 px-3 rounded bg-primary text-primary-foreground text-[11px] font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
              >
                {isReplying ? <Loader2 className="h-3 w-3 animate-spin" /> : "Reply"}
              </button>
              <button
                type="button"
                onClick={() => { setReplyOpen(false); setReplyBody(""); }}
                className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Nested replies */}
        {replies.length > 0 && (
          <div className="mt-1">
            {replies.map((reply) => (
              <ForumCommentCard
                key={reply.id}
                comment={reply}
                upvoteCount={replyUpvoteCounts?.get(reply.id) || 0}
                isUpvoted={replyUserUpvotes?.has(reply.id) || false}
                onToggleUpvote={() => onToggleReplyUpvote?.(reply.id)}
                isAuthor={currentUserId === reply.user_id}
                onDelete={() => onDeleteReply?.(reply.id) ?? Promise.resolve(false)}
                isNested
              />
            ))}
          </div>
        )}
      </div>

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
        title="Delete comment"
        description="This will permanently delete your comment. This action cannot be undone."
      />
    </>
  );
}
