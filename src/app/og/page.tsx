import { notFound } from "next/navigation";
import { OgCard } from "@/components/og-card";
import "./og.css";

// Source for the link-preview video and poster (see scripts/capture-og.mjs). Recorded locally, never deployed.
export default function OgPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <OgCard />;
}
