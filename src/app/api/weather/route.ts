import { NextResponse } from "next/server";

const OPENWEATHERMAP_API_KEY = process.env.OPENWEATHERMAP_API_KEY;
const CITY = "Atlanta";
const COUNTRY = "US";

export interface WeatherResponse {
  temperature: number;
  condition: string;
  location: string;
}

export async function GET() {
  // If no API key, return static fallback
  if (!OPENWEATHERMAP_API_KEY) {
    return NextResponse.json({
      temperature: 71,
      condition: "Partly cloudy",
      location: "Atlanta, Georgia",
    });
  }

  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${CITY},${COUNTRY}&units=imperial&appid=${OPENWEATHERMAP_API_KEY}`,
      {
        next: { revalidate: 600 }, // Cache for 10 minutes
      }
    );

    if (!response.ok) {
      throw new Error("Weather API request failed");
    }

    const data = await response.json();

    const condition = data.weather?.[0]?.description || "Clear";
    const capitalizedCondition =
      condition.charAt(0).toUpperCase() + condition.slice(1);

    return NextResponse.json({
      temperature: Math.round(data.main.temp),
      condition: capitalizedCondition,
      location: "Atlanta, Georgia",
    });
  } catch (error) {
    console.error("Weather API error:", error);
    // Return fallback on error
    return NextResponse.json({
      temperature: 71,
      condition: "Partly cloudy",
      location: "Atlanta, Georgia",
    });
  }
}
