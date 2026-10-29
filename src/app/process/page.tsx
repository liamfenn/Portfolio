import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { DesignInspector, InspectableText } from "@/components/design-inspector";
import { ProcessInspectorStudy, ProcessTypeStudy } from "@/components/process-studies";
import { PROCESS_SECTIONS } from "@/lib/process-essay";
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

function IterationStudy() {
  return <figure className="process-figure">
    <div className="process-iterations">
      {[
        { label: "Inline expansion", status: "Exploration", lines: ["Work", "Project details"] },
        { label: "Focused view", status: "Exploration", lines: ["Project", "Close"] },
        { label: "Card overlay", status: "Current", lines: ["Project", "Contributors / Tech"] },
      ].map(({ label, status, lines }, index) => <div className="process-iteration" key={label}>
        <div className={`process-iteration-sketch process-iteration-sketch-${index}`} aria-hidden="true">
          <span className="process-sketch-media" />
          <div className="process-sketch-labels text-captionSans text-secondary">
            {lines.map(line => <span key={line}><InspectableText>{line}</InspectableText></span>)}
          </div>
        </div>
        <div className="process-iteration-label text-captionSans text-secondary"><InspectableText>{label}</InspectableText></div>
        <span className="text-captionSans text-muted"><InspectableText>{status}</InspectableText></span>
      </div>)}
    </div>
    <figcaption className="process-caption text-captionSans text-muted"><InspectableText>02 / Schematic studies of the three project views. The shader entry was set aside in favor of blur and fade.</InspectableText></figcaption>
  </figure>;
}

export default function ProcessPage() {
  return <DesignInspector>
    <main className="process-page" id="top">
      <header className="process-header">
        <div className="process-hero" role="img" aria-label="Opening media placeholder: Office of Liam Fennell, centered on a white field">
          <Image src="/images/meta/og-office.png" alt="" fill priority sizes="100vw" />
        </div>
        <div className="process-reading-column process-heading">
          <p className="process-caption text-captionSans text-muted"><InspectableText>Opening media / Placeholder</InspectableText></p>
          <div className="process-title-row">
            <h1 className="text-bodySans text-primary"><InspectableText>In the margins</InspectableText></h1>
            <span className="text-captionSans text-muted"><InspectableText>5 min read</InspectableText></span>
          </div>
          <p className="process-subtitle text-bodySerif text-secondary"><InspectableText>{description}</InspectableText></p>
        </div>
      </header>
      <article className="process-reading-column process-essay" aria-label="In the margins">
        {PROCESS_SECTIONS.map((section, index) => <section className="process-section" key={section.id} aria-labelledby={section.id}>
          <h2 id={section.id} className="process-section-heading text-captionSans text-primary">
            <span className="text-muted"><InspectableText>{String(index + 1).padStart(2, "0")}</InspectableText></span>
            <InspectableText>{section.title}</InspectableText>
          </h2>
          <div className="process-prose text-bodySerif text-secondary">
            {section.paragraphs.map(paragraph => <p key={paragraph}><InspectableText>{paragraph}</InspectableText></p>)}
          </div>
          {index === 1 && <ProcessTypeStudy />}
          {index === 2 && <IterationStudy />}
          {index === 3 && <>
            <ProcessInspectorStudy />
            <figure className="process-figure">
              <div className="process-media-placeholder text-captionSans text-muted" role="img" aria-label="Placeholder for a future recording of the palette lab and video workflow">
                <InspectableText>Process recording / Media to come</InspectableText>
              </div>
              <figcaption className="process-caption text-captionSans text-muted"><InspectableText>04 / A place for the palette lab, working sessions, and the tools behind the site.</InspectableText></figcaption>
            </figure>
          </>}
        </section>)}
        <footer className="process-colophon text-captionSans text-muted">
          <p><InspectableText>Written, designed, and built by Liam Fennell.</InspectableText></p>
          <p><InspectableText>Set in ABC Oracle and ABC Otto. An ongoing work in progress.</InspectableText></p>
          <Link className="text-secondary" href="/"><InspectableText>Back to the work</InspectableText></Link>
        </footer>
      </article>
      <div className="project-focus-bottom-fade" aria-hidden="true" />
      <nav className="project-focus-controls" aria-label="Return to portfolio">
        <Link className="project-focus-action process-close text-bodySans" href="/" aria-label="Close process and return to the portfolio"><InspectableText>Close</InspectableText></Link>
      </nav>
    </main>
  </DesignInspector>;
}
