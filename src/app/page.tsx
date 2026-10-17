import { PortfolioFooter } from "@/components/portfolio-footer";
import { HomepageIdentity, HomepageSpotify } from "@/components/homepage-identity";
import { HomepageBio } from "@/components/homepage-bio";
import { ProjectWork } from "@/components/project-work";
import { DesignInspector, InspectableText } from "@/components/design-inspector";

const CONTACT_LINKS = [
  { label: "Twitter", href: "https://x.com/xyzfennell" },
  { label: "Instagram", href: "https://instagram.com/lliamfennell" },
  { label: "Cosmos", href: "https://cosmos.so/notliam" },
  { label: "Github", href: "https://github.com/lliamfennell" },
];

function ContactLinks() {
  return (
    <div className="portfolio-contact homepage-contact text-bodySmall">
      <a className="portfolio-link-strong" href="mailto:info@fennell.cv"><InspectableText>info@fennell.cv</InspectableText></a>
      <div className="portfolio-socials text-body">
        {CONTACT_LINKS.map(link => <a key={link.label} href={link.href} target="_blank" rel="noreferrer"><InspectableText>{link.label}</InspectableText></a>)}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <DesignInspector><main className="portfolio-v2 portfolio-v3">
      <header className="portfolio-intro">
        <div className="portfolio-bio-group">
          <HomepageIdentity />
          <h1 className="sr-only">Liam Fennell — Product Designer</h1>
          <HomepageBio />
        </div>
      </header>
      <ProjectWork />
      <ContactLinks />
      <HomepageSpotify />
      <PortfolioFooter />
    </main></DesignInspector>
  );
}
