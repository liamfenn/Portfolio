import { notFound } from "next/navigation";
import { OgFavicon } from "@/components/og-favicon";
import "../og.css";

// Source for the favicon (see scripts/capture-favicon.mjs). Rendered locally, never deployed.
export default function OgFaviconPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <OgFavicon />;
}
