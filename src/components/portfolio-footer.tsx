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

const FOOTER_LAYOUTS = [
  "Original", "Office block", "Centered stack", "Globe first", "Three columns",
  "Single line", "Split signature", "Minimal", "Colophon", "Centered globe",
];

export function PortfolioFooter() {
  const { data } = useWeather();
  const [layout, setLayout] = useState(0);
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
    <footer className={`portfolio-footer footer-layout-${layout + 1} text-bodySans`}>
      <div className="footer-identity">
        <button
          type="button"
          className="footer-office-toggle"
          aria-label={`Office of Liam Fennell. Footer ${layout + 1} of ${FOOTER_LAYOUTS.length}: ${FOOTER_LAYOUTS[layout]}. Tap for next layout.`}
          onClick={() => setLayout(value => (value + 1) % FOOTER_LAYOUTS.length)}
        ><InspectableText>Office of Liam Fennell</InspectableText></button>
        <span className="footer-copyright footer-highlight"><InspectableText>© 2026</InspectableText></span>
      </div>
      <span className="footer-location footer-highlight"><InspectableText>Atlanta, GA</InspectableText></span>
      <div className="footer-climate footer-weather text-bodySerif">
        <span className="footer-time"><InspectableText><span className={`footer-clock${time ? "" : " is-pending"}`} aria-hidden={!time}>{time ?? "12:00 PM"}</span></InspectableText></span>
        <span className="footer-conditions"><span className="footer-weather-separator" aria-hidden="true">, </span><InspectableText>{condition} at {temperature}°F</InspectableText></span>
      </div>
      <span className="footer-type-credit">
        <span className="text-bodySans"><InspectableText>Set in Oracle &amp;</InspectableText></span>
        <span className="text-bodySerif"><InspectableText>Otto</InspectableText></span>
      </span>
      <div className="footer-palette-slot"><PaletteToy /></div>
      <div id="glyph-globe-slot" className="glyph-globe-row" />
      <span className="sr-only" role="status" aria-live="polite">Footer {layout + 1} of {FOOTER_LAYOUTS.length}: {FOOTER_LAYOUTS[layout]}</span>
    </footer>
  );
}
