import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { DesignInspector, InspectableText } from "@/components/design-inspector";
import { PaletteToy } from "@/components/palette-toy";
import { PortfolioPlayer } from "@/components/portfolio-player";
import "./not-found.css";

export const metadata: Metadata = {
  title: "Page not found | Liam Fennell",
};

export default function NotFound() {
  return (
    <DesignInspector>
      <main className="portfolio-v2 portfolio-v4 not-found-page" data-page-frame>
        <header className="not-found-music">
          <button className="not-found-avatar hover-surface" type="button" data-inspector-toggle aria-label="Open design controls">
            <Image src="/images/redesign/avatar.webp" width={384} height={384} alt="Liam Fennell" priority unoptimized />
          </button>
          <PortfolioPlayer />
        </header>
        <section className="not-found-content text-bodySerif text-secondary" aria-labelledby="not-found-title" data-swarm-take="all">
          <div className="not-found-copy">
            <h1 id="not-found-title"><InspectableText>Looks like you’re lost.</InspectableText></h1>
            <p><InspectableText>Get back <Link href="/" className="not-found-home text-primary" data-swarm-skip>home</Link>.</InspectableText></p>
          </div>
        </section>
        <PaletteToy />
        <div id="glyph-globe-slot" className="glyph-globe-row" />
      </main>
    </DesignInspector>
  );
}
