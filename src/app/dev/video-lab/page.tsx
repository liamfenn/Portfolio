import { notFound } from "next/navigation";
import { VideoLab } from "@/components/video-lab";

export default function VideoLabPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <VideoLab />;
}
