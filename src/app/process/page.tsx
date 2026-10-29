import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { DesignInspector, InspectableText } from "@/components/design-inspector";
import { ProcessMedia } from "@/components/process-studies";
import { PROCESS_OPENING_MEDIA, PROCESS_SECTIONS } from "@/lib/process-essay";
import "./process.css";

const description = "On systems, expression, and the changing ways we design and build.";

export const metadata: Metadata = {
  title: "In the margins | Liam Fennell",
  description,
  alternates: { canonical: "https://fennell.cv/process" },
  openGraph: {
    title: "In the margins | Liam Fennell", description, url: "https://fennell.cv/process", type: "article",
    images: [{ url: "/images/meta/og-office.png", width: 1200, height: 630, alt: "Office of Liam Fennell" }],
  },
  twitter: { card: "summary_large_image", title: "In the margins | Liam Fennell", description, images: ["/images/meta/og-office.png"] },
};

export default function ProcessPage() {
  let textOrder = 0;
  const entranceStyle = () => ({ "--process-text-order": textOrder++ }) as CSSProperties;
  return <DesignInspector>
    <main className="process-page" id="top">
      <div className="project-focus-edge project-focus-edge-top" aria-hidden="true" />
      <header className="process-header">
        <ProcessMedia sequence={PROCESS_OPENING_MEDIA} number="01" hero entranceOrder={textOrder++} />
        <div className="process-reading-column process-heading">
          <div className="process-title-row process-enter-text" style={entranceStyle()}>
            <h1 id="process-title" className="text-bodySerif text-secondary"><InspectableText>In the margins</InspectableText></h1>
            <span className="text-captionSerif text-secondary"><InspectableText>5 min read</InspectableText></span>
          </div>
          <p className="process-subtitle process-enter-text text-bodySerif text-secondary" style={entranceStyle()}><InspectableText>{description}</InspectableText></p>
        </div>
      </header>
      <article className="process-reading-column process-essay" aria-label="In the margins">
        {PROCESS_SECTIONS.map((section, index) => <section id={index === 0 ? section.id : undefined} className="process-section" key={section.id} aria-labelledby={index === 0 ? "process-title" : section.id}>
          {index > 0 && <h2 id={section.id} className="process-section-heading process-enter-text text-bodySerif text-secondary" style={entranceStyle()}>
            <InspectableText>{section.title}</InspectableText>
          </h2>}
          <div className="process-prose text-bodySerif text-secondary">
            {section.paragraphs.map(paragraph => <p className="process-enter-text" style={entranceStyle()} key={paragraph}><InspectableText>{paragraph}</InspectableText></p>)}
          </div>
          {section.media && <ProcessMedia sequence={section.media} number={String(index + 1).padStart(2, "0")} entranceOrder={textOrder++} />}
          {section.extraMedia && <ProcessMedia sequence={section.extraMedia} number="05" entranceOrder={textOrder++} />}
        </section>)}
      </article>
      <div className="project-focus-bottom-fade" aria-hidden="true" />
      <nav className="project-focus-controls" aria-label="Return to portfolio">
        <Link className="project-focus-action process-close text-bodySans" href="/" aria-label="Close process and return to the portfolio"><InspectableText>Close</InspectableText></Link>
      </nav>
    </main>
  </DesignInspector>;
}
