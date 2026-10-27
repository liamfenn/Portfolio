"use client";

import type { ReactNode } from "react";
import { usePortfolioExperiments } from "@/components/portfolio-experiments";

export function Skeleton({ active = true }: { active?: boolean }) {
  const { skeletonPreviewEnabled } = usePortfolioExperiments();
  if (!active && !skeletonPreviewEnabled) return null;
  return <span className={`skeleton${skeletonPreviewEnabled ? " is-preview" : ""}`} aria-hidden="true" />;
}

/** The real copy reserves its final space while a decorative line covers the loading gap. */
export function SkeletonText({ loading: pending, label, children }: { loading: boolean; label: string; children: ReactNode }) {
  const { skeletonPreviewEnabled } = usePortfolioExperiments();
  const loading = pending || skeletonPreviewEnabled;
  return <span className="skeleton-text" aria-busy={loading}>
    <span className={loading ? "skeleton-text-reserve" : undefined} aria-hidden={loading || undefined}>{children}</span>
    {loading && <><Skeleton /><span className="sr-only">{label}</span></>}
  </span>;
}
