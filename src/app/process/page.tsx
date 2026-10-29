import type { Metadata } from "next";
import { Fragment, type CSSProperties } from "react";
import Link from "next/link";
import { DesignInspector, InspectableText } from "@/components/design-inspector";
import { ProcessMedia } from "@/components/process-studies";
import { PROCESS_OPENING_MEDIA, PROCESS_SECTIONS } from "@/lib/process-essay";
import "./process.css";

const description = "On systems, expression and tools";

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
      <header className="process-header">
        <ProcessMedia sequence={PROCESS_OPENING_MEDIA} hero />
        <div className="process-reading-column process-heading">
          <div className="process-title-row process-enter-text" style={entranceStyle()}>
            <div className="process-title-copy text-bodySans">
              <h1 id="process-title" className="text-primary"><InspectableText>In the margins</InspectableText></h1>
              <p className="text-secondary"><InspectableText>{description}</InspectableText></p>
            </div>
            <span className="text-captionSans text-muted"><InspectableText>5 minutes</InspectableText></span>
          </div>
        </div>
      </header>
      <article className="process-essay" aria-label="In the margins">
        {PROCESS_SECTIONS.map((section, index) => <Fragment key={section.id}>
          <section id={index === 0 ? section.id : undefined} className={`process-reading-column process-section${index < 2 ? " process-section-opening" : ""}`} aria-labelledby={index === 0 ? "process-title" : section.id}>
            {index > 0 && <h2 id={section.id} className="process-section-heading process-enter-text text-bodySans text-primary" style={entranceStyle()}>
              <InspectableText>{section.title}</InspectableText>
            </h2>}
            <div className="process-prose text-bodySerif text-secondary">
              {section.paragraphs.map(paragraph => <p className="process-enter-text" style={entranceStyle()} key={paragraph}><InspectableText>{paragraph}</InspectableText></p>)}
            </div>
          </section>
          {section.media && (section.extraMedia ? <div className="process-media-group" role="group" aria-label="Text style studies">
            <ProcessMedia sequence={section.media} entranceOrder={textOrder++} />
            <ProcessMedia sequence={section.extraMedia} entranceOrder={textOrder++} />
          </div> : <ProcessMedia sequence={section.media} entranceOrder={textOrder++} />)}
        </Fragment>)}
      </article>
      <nav className="project-focus-controls" aria-label="Return to portfolio">
        <Link className="project-focus-action process-close text-bodySans" href="/" aria-label="Close process and return to the portfolio"><InspectableText>Close</InspectableText></Link>
      </nav>
    </main>
  </DesignInspector>;
}
