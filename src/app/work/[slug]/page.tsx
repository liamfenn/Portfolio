import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { CaseStudyControls } from "@/components/case-study-controls";
import { CaseStudySummary } from "@/components/case-study-summary";
import {
  CASE_STUDIES,
  getAdjacentCaseStudies,
  getCaseStudy,
  type CaseStudyMediaBlock,
} from "@/lib/case-studies";

interface CaseStudyPageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return CASE_STUDIES.map((study) => ({ slug: study.slug }));
}

export async function generateMetadata({ params }: CaseStudyPageProps): Promise<Metadata> {
  const { slug } = await params;
  const study = getCaseStudy(slug);

  if (!study) {
    return {};
  }

  return {
    title: `${study.title} — Liam Fennell`,
    description: study.description,
  };
}

function CaseStudyMedia({ block }: { block: CaseStudyMediaBlock }) {
  const { media } = block;

  return (
    <figure className="case-study-media-block">
      <div className="case-study-media" data-media-kind={media.kind}>
        {media.kind === "image" && media.src ? (
          <Image src={media.src} alt={media.alt ?? ""} fill sizes="(max-width: 767px) 100vw, 600px" />
        ) : null}
        {media.kind === "video" && media.src ? (
          <video src={media.src} aria-label={media.alt} autoPlay muted loop playsInline preload="metadata" />
        ) : null}
        {media.kind === "interactive" ? (
          <div className="case-study-interactive-slot" data-demo-id={media.demoId} aria-hidden="true" />
        ) : null}
      </div>
      {block.caption ? <figcaption className="case-study-media-caption">{block.caption}</figcaption> : null}
    </figure>
  );
}

export default async function CaseStudyPage({ params }: CaseStudyPageProps) {
  const { slug } = await params;
  const study = getCaseStudy(slug);
  const adjacentStudies = getAdjacentCaseStudies(slug);

  if (!study || !adjacentStudies) {
    notFound();
  }

  return (
    <main className="portfolio-v2 case-study-page">
      <article className="case-study-content">
        <header className="case-study-header">
          <div className="persistent-identity-spacer" aria-hidden="true" />
          <CaseStudySummary
            key={study.slug}
            slug={study.slug}
            period={study.period}
            title={study.title}
            description={study.description}
          />
        </header>

        {study.blocks.map((block) => {
          if (block.type === "media") {
            return <CaseStudyMedia key={block.id} block={block} />;
          }

          if (block.type === "technology") {
            return (
              <section className="case-study-text-block case-study-technology" key={block.id}>
                <h2>{block.title}</h2>
                <div className="case-study-technology-list">
                  {block.items.map((item) => (
                    <span key={item.label} className="case-study-technology-tag">
                      {item.label}
                    </span>
                  ))}
                </div>
              </section>
            );
          }

          return (
            <section className="case-study-text-block" key={block.id}>
              <h2>{block.title}</h2>
              {block.paragraphs.map((paragraph, index) => (
                <p key={`${block.id}-${index}`}>{paragraph}</p>
              ))}
            </section>
          );
        })}
      </article>

      <CaseStudyControls
        currentSlug={study.slug}
        currentPeriod={study.period}
        currentTitle={study.title}
        previousSlug={adjacentStudies.previous.slug}
        previousPeriod={adjacentStudies.previous.period}
        previousTitle={adjacentStudies.previous.title}
        nextSlug={adjacentStudies.next.slug}
        nextPeriod={adjacentStudies.next.period}
        nextTitle={adjacentStudies.next.title}
      />
    </main>
  );
}
