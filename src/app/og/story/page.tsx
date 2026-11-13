import { notFound } from "next/navigation";
import { OgStory } from "@/components/og-story";
import "../og.css";

// Source for the story videos (scripts/capture-og.mjs --story). Recorded locally, never deployed.
export default function OgStoryPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <OgStory />;
}
