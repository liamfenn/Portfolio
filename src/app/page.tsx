import { PortfolioFooter } from "@/components/portfolio-footer";
import { PortfolioHeader } from "@/components/portfolio-header";
import { PortfolioPlayer } from "@/components/portfolio-player";
import { HomepageBio } from "@/components/homepage-bio";
import { ProjectFeed } from "@/components/project-feed";
import { DesignInspector, InspectableText } from "@/components/design-inspector";

const CONTACT_LINKS = [
  { label: "Twitter", href: "https://x.com/xyzfennell" },
  { label: "Instagram", href: "https://instagram.com/lliamfennell" },
  { label: "Cosmos", href: "https://cosmos.so/notliam" },
  { label: "Github", href: "https://github.com/lliamfennell" },
];

function ContactLinks() {
  return (
    <div className="portfolio-contact homepage-contact text-bodySerif">
      <a className="portfolio-link-strong" href="mailto:info@fennell.cv"><InspectableText>info@fennell.cv</InspectableText></a>
      <div className="portfolio-socials">
        {CONTACT_LINKS.map(link => <a key={link.label} href={link.href} target="_blank" rel="noreferrer"><InspectableText>{link.label}</InspectableText></a>)}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <DesignInspector><div className="portfolio-safari-edge" aria-hidden="true" /><div className="portfolio-safari-fade" aria-hidden="true" /><main className="portfolio-v2 portfolio-v4" data-page-frame>
      <PortfolioHeader />
      <header className="portfolio-intro">
          <h1 className="sr-only">Liam Fennell — Product Designer</h1>
          <HomepageBio />
      </header>
      <ProjectFeed />
      <ContactLinks />
      <PortfolioPlayer />
      <PortfolioFooter />
    </main></DesignInspector>
  );
}
