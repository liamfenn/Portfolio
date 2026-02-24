"use client";

import { WorkTimeline } from "@/components/work-timeline";
import { SpotifyWidget } from "@/components/spotify-widget";
import { LocationFooter } from "@/components/location-footer";

const CONTACT_LINKS = [
  { label: "X", url: "https://x.com/xyzfennell" },
  { label: "IG", url: "https://instagram.com/lliamfennell" },
  { label: "Cosmos", url: "https://cosmos.so/notliam" },
];

export default function Home() {
  return (
    <div className="relative min-h-screen bg-background">
      {/* Desktop contact — bottom right */}
      <div className="hidden md:flex fixed bottom-8 right-8 flex-col items-end z-10">
        <p className="text-muted-foreground">
          {CONTACT_LINKS.map((link, i) => (
            <span key={link.label}>
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className=""
              >
                {link.label}
              </a>
              {i < CONTACT_LINKS.length - 1 && ", "}
            </span>
          ))}
        </p>
        <a
          href="mailto:info@fennell.cv"
          className="text-muted "
        >
          info@fennell.cv
        </a>
      </div>

      {/* Centered content column */}
      <div className="mx-auto max-w-[500px] px-4 pt-4 md:px-0 md:pt-[172px] pb-16 md:pb-24 flex flex-col gap-12 md:gap-16">
        {/* Bio */}
        <p className="text-muted">
        <span className="text-foreground">Liam Fennell</span> is a designer based in Atlanta building consumer products. His work hinges on restraint, reducing friction so interfaces feel more intuitive and obvious in hindsight.
        <br /><br />
        Beyond product work, he’s interested in how design shapes behavior and experience across mediums, drawing influence from architecture, industrial design, and fashion.
        </p>

        {/* Work Timeline */}
        <WorkTimeline />

        {/* Mobile contact — inline before widgets */}
        <div className="md:hidden flex flex-col">
          <p className="type-secondary text-muted-foreground">
            {CONTACT_LINKS.map((link, i) => (
              <span key={link.label}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className=""
                >
                  {link.label}
                </a>
                {i < CONTACT_LINKS.length - 1 && ", "}
              </span>
            ))}
          </p>
          <a
            href="mailto:info@fennell.cv"
            className="type-secondary text-muted"
          >
            info@fennell.cv
          </a>
        </div>

        {/* Spotify + Location — tighter group */}
        <div className="flex flex-col gap-3 md:gap-4">
          <SpotifyWidget />
          <LocationFooter />
        </div>
      </div>
    </div>
  );
}
