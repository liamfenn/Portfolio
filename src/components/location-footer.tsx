"use client";

import { useWeather } from "@/hooks/use-weather";
import { useState, useEffect } from "react";

function getTime() {
  return new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/New_York",
  });
}

export function LocationFooter() {
  const { data, isLoading } = useWeather();
  const [time, setTime] = useState(getTime);

  useEffect(() => {
    const interval = setInterval(() => setTime(getTime()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center justify-between px-2 md:px-4 type-mono-responsive">
      <span className="text-muted">
        <span className="md:hidden">Atlanta, GA</span>
        <span className="hidden md:inline">Atlanta, Georgia</span>
      </span>
      <span className="text-muted-foreground">
        {time}
        {!isLoading && data && `, ${Math.round(data.temperature)}°F ${data.condition}`}
      </span>
    </div>
  );
}
