"use client";

import { useEffect, useState } from "react";

interface WeatherData {
  temperature: number;
  condition: string;
  location: string;
}

export function useWeather() {
  const [data, setData] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchWeather() {
      try {
        const response = await fetch("/api/weather");
        if (response.ok) {
          const result = await response.json();
          setData(result);
        }
      } catch (error) {
        console.error("Failed to fetch weather:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchWeather();

    // Refresh every 10 minutes
    const interval = setInterval(fetchWeather, 600000);
    return () => clearInterval(interval);
  }, []);

  return { data, isLoading };
}
