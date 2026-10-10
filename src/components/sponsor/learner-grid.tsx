"use client";

import { useState, useEffect, useCallback } from "react";
import { LearnerCard } from "./learner-card";
import type { LearnersResponse, ReadyToSponsorLearner } from "./types";

const LEARNERS_PAGE_LIMIT = 12;

export const LearnerGrid = () => {
  const [learners, setLearners] = useState<ReadyToSponsorLearner[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);

  const fetchLearners = useCallback(async (pageNum: number, append: boolean) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError("");

      const res = await fetch(
        `/api/learner/ready-to-sponsor?limit=${LEARNERS_PAGE_LIMIT}&page=${pageNum}`,
      );
      if (!res.ok) {
        throw new Error("Failed to fetch learners");
      }

      const data: LearnersResponse = await res.json();
      setLearners((prev) => (append ? [...prev, ...data.data] : data.data));
      setHasNextPage(data.pagination.has_next_page);
      setPage(pageNum);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load learners");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchLearners(1, false);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchLearners]);

  const handleLoadMore = () => {
    if (hasNextPage && !loadingMore) {
      fetchLearners(page + 1, true);
    }
  };

  if (loading) {
    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="p-6 rounded-2xl bg-card border border-border shadow-soft animate-pulse"
          >
            <div className="w-20 h-20 rounded-full bg-muted mx-auto" />
            <div className="mt-4 h-5 bg-muted rounded w-3/4 mx-auto" />
            <div className="mt-2 h-4 bg-muted rounded w-1/2 mx-auto" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10">
        <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center text-3xl mb-4">
          ⚠️
        </div>
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (learners.length === 0) {
    return (
      <div className="text-center py-10">
        <div className="w-16 h-16 mx-auto rounded-full bg-accent/20 flex items-center justify-center text-3xl mb-4">
          🎉
        </div>
        <p className="text-lg font-semibold">All Learners Are Sponsored!</p>
        <p className="text-muted-foreground mt-2">
          Thank you to all our generous sponsors. Check back soon for new learners.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {learners.map((learner) => (
          <LearnerCard key={learner.id} learner={learner} />
        ))}
      </div>

      {hasNextPage && (
        <div className="mt-10 text-center">
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-3 font-semibold hover:border-primary/40 hover:shadow-soft transition-all disabled:opacity-60"
          >
            {loadingMore ? "Loading..." : "Load more learners"}
          </button>
        </div>
      )}
    </div>
  );
};
