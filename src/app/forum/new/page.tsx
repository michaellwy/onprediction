"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useForumPosts } from "@/hooks/useForumPosts";
import { ForumCreatePostForm } from "@/components/forum/ForumCreatePostForm";

export default function ForumNewPostPage() {
  const router = useRouter();
  const { user, profile, openSignInModal } = useAuth();
  const { createPost } = useForumPosts();

  async function handleSubmit(title: string, body: string): Promise<boolean> {
    const post = await createPost(title, body, profile);
    if (post) {
      router.push(`/forum/post?id=${post.id}`);
      return true;
    }
    return false;
  }

  if (!user) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="max-w-2xl mx-auto px-3 sm:px-6 py-16 text-center"
      >
        <h1 className="font-sans text-xl font-bold text-foreground mb-3">
          Sign in to write a post
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          You need to be signed in to create forum posts.
        </p>
        <button
          onClick={openSignInModal}
          className="h-10 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Sign in
        </button>
      </motion.div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-6 py-6">
      <motion.h1
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="font-sans text-xl font-bold text-foreground mb-6"
      >
        New Post
      </motion.h1>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
      >
        <ForumCreatePostForm onSubmit={handleSubmit} />
      </motion.div>
    </div>
  );
}
