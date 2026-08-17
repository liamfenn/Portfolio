import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CaseStudyMedia } from "@/components/case-study-media";
import { CaseStudySummary } from "@/components/case-study-summary";
import { CASE_STUDIES, getAdjacentCaseStudies, getCaseStudy } from "@/lib/case-studies";

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
    </main>
  );
}
