"use client";

import { useState } from "react";
import { PostCard } from "./post-card";
import type { FeedPost } from "@/types/database";

const PAGE_SIZE = 10;

interface PostListProps {
  initialPosts: FeedPost[];
  currentUserId?: string;
  variant: "banner" | "compact";
  loadMore: (offset: number) => Promise<FeedPost[]>;
}

export function PostList({ initialPosts, currentUserId, variant, loadMore }: PostListProps) {
  const [posts, setPosts] = useState(initialPosts);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialPosts.length === PAGE_SIZE);

  async function handleLoadMore() {
    setLoading(true);
    const newPosts = await loadMore(posts.length);
    setPosts((prev) => [...prev, ...newPosts]);
    if (newPosts.length < PAGE_SIZE) setHasMore(false);
    setLoading(false);
  }

  return (
    <>
      <div className={variant === "banner" ? "space-y-4" : "space-y-2"}>
        {posts.map((post) => (
          <PostCard key={post.id} post={post} currentUserId={currentUserId} variant={variant} />
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center pt-4">
          <button
            onClick={handleLoadMore}
            disabled={loading}
            className="px-6 py-2 rounded-full border border-border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
          >
            {loading ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </>
  );
}
