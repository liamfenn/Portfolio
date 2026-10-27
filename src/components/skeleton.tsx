import type { ReactNode } from "react";

export function Skeleton() {
  return <span className="skeleton" aria-hidden="true" />;
}

/** The real copy reserves its final space while a decorative line covers the loading gap. */
export function SkeletonText({ loading, label, children }: { loading: boolean; label: string; children: ReactNode }) {
  return <span className="skeleton-text" aria-busy={loading}>
    <span className={loading ? "skeleton-text-reserve" : undefined} aria-hidden={loading || undefined}>{children}</span>
    {loading && <><Skeleton /><span className="sr-only">{label}</span></>}
  </span>;
}
