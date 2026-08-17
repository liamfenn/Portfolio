import { PortfolioFooter } from "@/components/portfolio-footer";
import { ProjectWork } from "@/components/project-work";

const CONTACT_LINKS = [
  { label: "Twitter", href: "https://x.com/xyzfennell" },
  { label: "Instagram", href: "https://instagram.com/lliamfennell" },
  { label: "Cosmos", href: "https://cosmos.so/notliam" },
  { label: "Github", href: "https://github.com/lliamfennell" },
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

export default function Home() {
  return (
    <main className="portfolio-v2">
      <header className="portfolio-intro">
        <div className="portfolio-bio-group">
          <div className="persistent-identity-spacer" aria-hidden="true" />
          <h1 className="sr-only">Liam Fennell — Product Designer</h1>
          <div className="portfolio-bio">
            <p>
              <strong>Liam Fennell</strong> is a designer based in Atlanta, currently at{" "}
            <a className="portfolio-link-strong" href="https://shop.app" target="_blank" rel="noreferrer">
              Shop
            </a>
            . Previously at OpenPurpose where he designed interfaces for{" "}
            <a className="portfolio-link-strong" href="https://bird.com" target="_blank" rel="noreferrer">
              Bird
            </a>
            ,{" "}
            <a className="portfolio-link-strong" href="https://plasticity.xyz" target="_blank" rel="noreferrer">
              Plasticity
            </a>
            ,{" "}
            <a className="portfolio-link-strong" href="https://azura.xyz" target="_blank" rel="noreferrer">
              Azura
            </a>{" "}
              &amp; more.
            </p>
            <p>
              His practice explores how products can recede around intent without flattening their character. He
              treats design as a reflective conversation with the thing being made, moving between conception and
              execution to shape interaction and introduce expression where it earns attention.
            </p>
          </div>
        </div>
        <ContactLinks />
      </header>

      <ProjectWork />

      <ContactLinks mobile />
      <PortfolioFooter />
    </main>
  );
}
