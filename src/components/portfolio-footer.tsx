"use client";

import { useEffect, useState } from "react";
import { useWeather } from "@/hooks/use-weather";

function getNewYorkTime() {
  return new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/New_York",
  });
}

export function PortfolioFooter({ variant = "default" }: { variant?: "default" | "case-study" }) {
  const { data } = useWeather();
  const [time, setTime] = useState(getNewYorkTime);

  useEffect(() => {
    const interval = window.setInterval(() => setTime(getNewYorkTime()), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  const condition = data?.condition ?? "Partly cloudy";
  const temperature = data ? Math.round(data.temperature) : 71;

  return (
    <footer className={`portfolio-footer${variant === "case-study" ? " case-study-footer" : ""}`}>
      {variant === "case-study" ? (
        <div className="portfolio-footer-row case-study-footer-mobile-row">
          <span className="case-study-footer-owner">
            <span className="footer-highlight">© 2026</span>
            <span>Liam Fennell</span>
          </span>
          <span className="footer-weather">All rights reserved</span>
        </div>
      ) : null}
      <div className={`portfolio-footer-row${variant === "case-study" ? " case-study-footer-desktop-row" : ""}`}>
        <span className="footer-highlight">© 2026</span>
        <span>Office of Liam Fennell</span>
      </div>
      <div className={`portfolio-footer-row${variant === "case-study" ? " case-study-footer-desktop-row" : ""}`}>
        <span className="footer-highlight">Atlanta, GA</span>
        <span className="footer-weather">
          {time}, {condition} at {temperature}°F
        </span>
      </div>
      <div className="portfolio-footer-row portfolio-footer-bottom">
        <span className="footer-type-credit">
          Set in Oracle &amp; <span className="footer-otto">Otto</span>
        </span>
        <span className="footer-palette" aria-label="Lavender, pink, blue, green, and gray color palette">
          <i />
          <i />
          <i />
          <i />
          <i />
        </span>
      </div>
    </footer>
  );
}
