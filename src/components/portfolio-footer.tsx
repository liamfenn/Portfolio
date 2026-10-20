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
  const [alternate, setAlternate] = useState(false);
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

  const officeToggle = <button
    type="button"
    className="footer-office-toggle"
    aria-label={alternate ? "Switch to original footer" : "Switch to new footer"}
    aria-pressed={alternate}
    onClick={() => setAlternate(value => !value)}
  ><InspectableText>Office of Liam Fennell</InspectableText></button>;

  return (
    <footer className={`portfolio-footer text-bodySans${alternate ? " portfolio-footer-alternate" : ""}`}>
      {alternate && <div className="footer-office">
        <div>{officeToggle}{" "}<span className="footer-highlight"><InspectableText>© 2026</InspectableText></span></div>
        <div><span className="footer-weather text-bodySerif"><InspectableText><span className={`footer-clock${time ? "" : " is-pending"}`} aria-hidden={!time}>{time ?? "12:00 PM"}</span></InspectableText></span>{" "}<span className="footer-highlight"><InspectableText>Atlanta, GA</InspectableText></span></div>
        <div className="footer-weather text-bodySerif"><InspectableText>{condition} at {temperature}°F</InspectableText></div>
      </div>}
      <div className="portfolio-footer-row">
        <span className="footer-highlight"><InspectableText>© 2026</InspectableText></span>
        {officeToggle}
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
      <div className="portfolio-footer-row portfolio-footer-bottom">
        {/* Each name is set in its own face; the 4px gap stands in for the space so it still reads as one line. */}
        <span className="footer-type-credit">
          <span className="text-bodySans"><InspectableText>Set in Oracle &amp;</InspectableText></span>
          <span className="text-bodySerif"><InspectableText>Otto</InspectableText></span>
        </span>
        <PaletteToy />
      </div>
      <div id="glyph-globe-slot" className="glyph-globe-row" />
    </footer>
  );
}
