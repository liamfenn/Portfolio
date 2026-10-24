import { notFound } from "next/navigation";
import { OgCard } from "@/components/og-card";
import "../og.css";

// Source for the work reel videos (scripts/capture-og.mjs --reel). Recorded locally, never deployed.
export default function OgReelPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <OgCard reel />;
}
