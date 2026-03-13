"use client";

import { useState, useMemo } from "react";
import { Loader2, PenLine } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { ForumCommentCard } from "./ForumCommentCard";
import type { ForumComment } from "@/types/forum";

interface ForumCommentSectionProps {
  comments: ForumComment[];
  onAddComment: (body: string, parentId?: string | null) => Promise<ForumComment | null>;
  onDeleteComment: (commentId: string) => Promise<boolean>;
  commentUpvoteCounts: Map<string, number>;
  userCommentUpvotes: Set<string>;
  onToggleCommentUpvote: (commentId: string) => void;
  currentUserId: string | null;
}

export function ForumCommentSection({
  comments,
  onAddComment,
  onDeleteComment,
  commentUpvoteCounts,
  userCommentUpvotes,
  onToggleCommentUpvote,
  currentUserId,
}: ForumCommentSectionProps) {
  const { user, openSignInModal } = useAuth();
  const [composeOpen, setComposeOpen] = useState(false);
  const [body, setBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { topLevel, repliesByParent } = useMemo(() => {
    const top: ForumComment[] = [];
    const replies = new Map<string, ForumComment[]>();
    for (const c of comments) {
      if (!c.parent_id) {
        top.push(c);
      } else {
        const arr = replies.get(c.parent_id) || [];
        arr.push(c);
        replies.set(c.parent_id, arr);
      }
    }
    return { topLevel: top, repliesByParent: replies };
  }, [comments]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const result = await onAddComment(body);
    if (result) {
      setBody("");
      setComposeOpen(false);
    }
    setIsSubmitting(false);
  }

  async function handleReply(replyBody: string, parentId: string) {
    return onAddComment(replyBody, parentId);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-sans text-sm font-semibold text-foreground">
          Responses ({comments.length})
        </h3>
      </div>

      {/* Prominent compose button / form */}
      {!composeOpen ? (
        <button
          onClick={() => {
            if (!user) { openSignInModal(); return; }
            setComposeOpen(true);
          }}
          className="w-full flex items-center gap-2 px-3 py-2.5 mb-4 rounded-lg border border-border bg-accent/20 hover:bg-accent/40 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <PenLine className="h-3.5 w-3.5" />
          {user ? "Write a response..." : "Sign in to respond..."}
        </button>
      ) : (
        <AnimatePresence>
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            onSubmit={handleSubmit}
            className="mb-4 overflow-hidden"
          >
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Share your thoughts..."
              rows={3}
              maxLength={5000}
              autoFocus
              className="w-full rounded-lg border border-border bg-background px-3 py-2 font-sans text-[13px] sm:text-[14px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-colors resize-none"
            />
            <div className="flex items-center justify-end gap-2 mt-1.5">
              <button
                type="button"
                onClick={() => { setComposeOpen(false); setBody(""); }}
                className="h-8 px-3 rounded-md text-[13px] text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!body.trim() || isSubmitting}
                className="h-8 px-4 rounded-md bg-primary text-primary-foreground text-[13px] font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Posting...
                  </>
                ) : (
                  "Reply"
                )}
              </button>
            </div>
          </motion.form>
        </AnimatePresence>
      )}

      {/* Comment list */}
      {topLevel.length > 0 ? (
        <div className="divide-y divide-border/30">
          {topLevel.map((comment, index) => (
            <div
              key={comment.id}
              className="animate-list-item"
              style={{ animationDelay: `${Math.min(index * 40, 400)}ms` }}
            >
              <ForumCommentCard
                comment={comment}
                replies={repliesByParent.get(comment.id) || []}
                upvoteCount={commentUpvoteCounts.get(comment.id) || 0}
                isUpvoted={userCommentUpvotes.has(comment.id)}
                onToggleUpvote={() => onToggleCommentUpvote(comment.id)}
                isAuthor={currentUserId === comment.user_id}
                onDelete={() => onDeleteComment(comment.id)}
                onReply={handleReply}
                replyUpvoteCounts={commentUpvoteCounts}
                replyUserUpvotes={userCommentUpvotes}
                onToggleReplyUpvote={onToggleCommentUpvote}
                currentUserId={currentUserId}
                onDeleteReply={onDeleteComment}
              />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[12px] text-muted-foreground/50 py-6 text-center">
          No responses yet.
        </p>
      )}
    </div>
  );
}
