import Image from "next/image";
import { IdentitySpotify } from "@/components/identity-spotify";
import { PortfolioFooter } from "@/components/portfolio-footer";
import { PROJECT_PREVIEWS } from "@/lib/project-previews";

const CONTACT_LINKS = [
  { label: "Twitter", href: "https://x.com/xyzfennell" },
  { label: "Instagram", href: "https://instagram.com/lliamfennell" },
  { label: "Cosmos", href: "https://cosmos.so/notliam" },
  { label: "Github", href: "https://github.com/liamfenn" },
];

function ContactLinks({ mobile = false }: { mobile?: boolean }) {
  return (
    <div className={mobile ? "portfolio-contact portfolio-contact-mobile" : "portfolio-contact"}>
      <a className="portfolio-link-strong" href="mailto:info@fennell.cv">
        info@fennell.cv
      </a>
      <div className="portfolio-socials">
        {CONTACT_LINKS.map((link, index) => (
          <span key={link.label}>
            <a href={link.href} target="_blank" rel="noreferrer">
              {link.label}
            </a>
            {!mobile && index < CONTACT_LINKS.length - 1 ? ", " : null}
          </span>
        ))}
      </div>
    </div>
  );
}

function WorkToolbar() {
  return (
    <div className="work-toolbar" aria-label="Project display controls">
      <div className="work-toolbar-group">
        <span className="work-control">
          <Image src="/images/icons/filter-v2.svg" alt="" width={10} height={10} />
          Filter
        </span>
        <span className="work-control">
          <span className="work-control-square" aria-hidden="true" />
          Sort
        </span>
      </div>
      <span className="work-control">
        <span className="work-control-square" aria-hidden="true" />
        Grid
      </span>
    </div>
  );
}

function ProjectGrid() {
  return (
    <ul className="project-grid" aria-label="Selected work">
      {PROJECT_PREVIEWS.map((preview) => (
        <li
          key={preview.id}
          className="project-preview"
          data-case-study-slug={preview.caseStudySlug}
          aria-label={`${preview.label} preview placeholder`}
        >
          <span className="sr-only">
            {preview.label}. This preview will link to /work/{preview.caseStudySlug} when the case study is published.
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function Home() {
  return (
    <main className="portfolio-v2">
      <header className="portfolio-intro">
        <div className="portfolio-bio-group">
          <IdentitySpotify />
          <h1 className="sr-only">Liam Fennell — Product Designer</h1>
          <p className="portfolio-bio">
            <strong>Liam Fennell</strong> is a designer based in New York, currently working with the talented team at{" "}
            <strong>Shop</strong>, creating commerce &amp; discovery experiences for millions of users.
            <br />
            <br />
            Previously at <strong>OpenPurpose</strong> where he designed interfaces for <strong>Bird</strong>,{" "}
            <strong>Plasticity</strong>, <strong>Azura</strong> &amp; more.
          </p>
        </div>
        <ContactLinks />
      </header>

      <section className="portfolio-work" aria-label="Work">
        <WorkToolbar />
        <ProjectGrid />
      </section>

      <ContactLinks mobile />
      <PortfolioFooter />
    </main>
  );
}
