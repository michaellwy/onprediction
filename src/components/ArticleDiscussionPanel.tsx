"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useArticleDiscussion } from "@/hooks/useArticleDiscussion";
import { useForumCommentUpvotes } from "@/hooks/useForumCommentUpvotes";
import { ForumCommentSection } from "@/components/forum/ForumCommentSection";
import { cn } from "@/lib/utils";

interface ArticleDiscussionPanelProps {
  articleId: number | null;
  articleTitle: string;
  articleUrl: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ArticleDiscussionPanel({
  articleId,
  articleTitle,
  articleUrl,
  isOpen,
  onClose,
}: ArticleDiscussionPanelProps) {
  const { user, openSignInModal } = useAuth();
  const { postId, comments, isLoading, addComment, deleteComment } =
    useArticleDiscussion(isOpen ? articleId : null, articleTitle);
  const {
    counts: commentUpvoteCounts,
    userUpvotes: userCommentUpvotes,
    toggleUpvote: toggleCommentUpvote,
  } = useForumCommentUpvotes(postId);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className={cn(
              "fixed inset-y-0 right-0 z-50",
              "w-full sm:w-[450px] bg-background border-l border-border",
              "flex flex-col shadow-2xl"
            )}
          >
            {/* Header */}
            <div className="shrink-0 px-4 py-3 border-b border-border/50 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground/60 mb-1">
                  Discussing
                </p>
                <h2 className="font-serif text-[15px] font-semibold text-foreground leading-tight line-clamp-2">
                  {articleTitle}
                </h2>
                {articleUrl && (
                  <a
                    href={articleUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[12px] text-primary hover:text-primary/80 transition-colors mt-1"
                  >
                    Read article
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                )}
              </div>
              <button
                onClick={onClose}
                className="shrink-0 p-1.5 -mr-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-5 w-5 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin" />
                </div>
              ) : (
                <ForumCommentSection
                  comments={comments}
                  onAddComment={addComment}
                  onDeleteComment={deleteComment}
                  commentUpvoteCounts={commentUpvoteCounts}
                  userCommentUpvotes={userCommentUpvotes}
                  onToggleCommentUpvote={(commentId: string) => {
                    if (!user) {
                      openSignInModal();
                      return;
                    }
                    toggleCommentUpvote(commentId);
                  }}
                  currentUserId={user?.id ?? null}
                />
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
