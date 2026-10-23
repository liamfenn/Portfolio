"use client";

import { useEffect, useState } from "react";
import { useWeather } from "@/hooks/use-weather";
import { PaletteToy } from "@/components/palette-toy";
import { InspectableText } from "@/components/design-inspector";

function getNewYorkTime() {
  return new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/New_York",
  });
}

export function PortfolioFooter() {
  const { data } = useWeather();
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    const initialFrame = window.requestAnimationFrame(() => setTime(getNewYorkTime()));
    const interval = window.setInterval(() => setTime(getNewYorkTime()), 30_000);
    return () => {
      window.cancelAnimationFrame(initialFrame);
      window.clearInterval(interval);
    };
  }, []);

  const condition = data?.condition ?? "Partly cloudy";
  const temperature = data ? Math.round(data.temperature) : 71;

  return (
    <footer className="portfolio-footer text-bodySans">
      <div className="portfolio-footer-row">
        <span className="footer-highlight"><InspectableText>© 2026</InspectableText></span>
        <span><InspectableText>Office of <span className="footer-office-name text-bodySerif">Liam Fennell</span></InspectableText></span>
      </div>
      <div className="portfolio-footer-row">
        <span className="footer-highlight"><InspectableText>Atlanta, GA</InspectableText></span>
        <span className="footer-weather text-bodySerif">
          <InspectableText><span className={`footer-clock${time ? "" : " is-pending"}`} aria-hidden={!time}>
            {time ?? "12:00 PM"}
          </span>
          , {condition} at {temperature}°F</InspectableText>
        </span>
      </div>
      <PaletteToy />
      <div id="glyph-globe-slot" className="glyph-globe-row" />
    </footer>
  );
}
