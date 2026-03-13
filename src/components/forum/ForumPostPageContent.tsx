"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useForumPost } from "@/hooks/useForumPost";
import { useForumPostUpvotes } from "@/hooks/useForumPostUpvotes";
import { useForumCommentUpvotes } from "@/hooks/useForumCommentUpvotes";
import { ForumPostBody } from "./ForumPostBody";
import { ForumPostActions } from "./ForumPostActions";
import { ForumCommentSection } from "./ForumCommentSection";
import { supabase } from "@/lib/supabase";

function formatFullDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

interface ForumPostPageContentProps {
  postId: string | null;
}

export function ForumPostPageContent({ postId }: ForumPostPageContentProps) {
  const router = useRouter();
  const { user } = useAuth();

  const { post, comments, isLoading, error, addComment, deleteComment } =
    useForumPost(postId ?? null);
  const { counts: upvoteCounts, userUpvotes, toggleUpvote } = useForumPostUpvotes();
  const {
    counts: commentUpvoteCounts,
    userUpvotes: userCommentUpvotes,
    toggleUpvote: toggleCommentUpvote,
  } = useForumCommentUpvotes(postId ?? null);

  async function handleDeletePost() {
    if (!post || !user) return;

    const { error } = await supabase
      .from("forum_posts")
      .delete()
      .eq("id", post.id)
      .eq("user_id", user.id);

    if (!error) {
      router.push("/forum");
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="max-w-2xl mx-auto px-3 sm:px-6 py-16 text-center">
        <h1 className="font-sans text-xl font-bold text-foreground mb-3">
          Post not found
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          This post may have been deleted or doesn&apos;t exist.
        </p>
        <Link
          href="/forum"
          className="text-sm text-primary hover:text-primary/80 transition-colors"
        >
          Back to Forum
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-6 py-6">
      {/* Back link */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        <Link
          href="/forum"
          className="inline-flex items-center gap-1 text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Forum
        </Link>
      </motion.div>

      {/* Post header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
      >
        <h1 className="font-sans text-xl sm:text-2xl font-bold text-foreground leading-tight mb-2">
          {post.title}
        </h1>
        <div className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground mb-5">
          {post.author_avatar_url && (
            <img
              src={post.author_avatar_url}
              alt=""
              className="w-4 h-4 rounded-full"
            />
          )}
          <span className="font-medium text-foreground/80">{post.author_name}</span>
          <span className="text-foreground/25">·</span>
          <span>{formatFullDate(post.created_at)}</span>
        </div>
      </motion.div>

      {/* Post body */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <ForumPostBody content={post.body} />
      </motion.div>

      {/* Actions bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <ForumPostActions
          isUpvoted={userUpvotes.has(post.id)}
          upvoteCount={upvoteCounts.get(post.id) || 0}
          onToggleUpvote={() => toggleUpvote(post.id)}
          isAuthor={user?.id === post.user_id}
          onDelete={handleDeletePost}
          postId={post.id}
        />
      </motion.div>

      {/* Comments */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.25 }}
      >
        <ForumCommentSection
          comments={comments}
          onAddComment={addComment}
          onDeleteComment={deleteComment}
          commentUpvoteCounts={commentUpvoteCounts}
          userCommentUpvotes={userCommentUpvotes}
          onToggleCommentUpvote={toggleCommentUpvote}
          currentUserId={user?.id ?? null}
        />
      </motion.div>
    </div>
  );
}
