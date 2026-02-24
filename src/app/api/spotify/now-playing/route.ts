import { NextResponse } from "next/server";
import { getNowPlaying } from "@/lib/spotify";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const data = await getNowPlaying();

    if (!data) {
      return NextResponse.json(
        { isPlaying: false, error: "No track data available" },
        { status: 200 }
      );
    }

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=1, stale-while-revalidate=0",
      },
    });
  } catch (error) {
    console.error("Spotify API error:", error);
    return NextResponse.json(
      { isPlaying: false, error: "Failed to fetch Spotify data" },
      { status: 500 }
    );
  }
}
