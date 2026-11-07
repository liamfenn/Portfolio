import type { Metadata } from "next";
import Link from "next/link";
import { DesignInspector, InspectableText } from "@/components/design-inspector";
import { PortfolioFooter } from "@/components/portfolio-footer";
import { PortfolioHeader } from "@/components/portfolio-header";
import "./not-found.css";

export const metadata: Metadata = {
  title: "Page not found | Liam Fennell",
};

export default function NotFound() {
  return (
    <DesignInspector>
      <main className="portfolio-v2 portfolio-v4 not-found-page" data-page-frame>
        <PortfolioHeader />
        <section className="not-found-content" aria-labelledby="not-found-title">
          <p className="text-captionSans text-muted"><InspectableText>404</InspectableText></p>
          <div className="not-found-copy text-bodySerif">
            <h1 id="not-found-title" className="text-primary"><InspectableText>This page doesn&apos;t exist.</InspectableText></h1>
            <p className="text-secondary"><InspectableText>There&apos;s more to see back home.</InspectableText></p>
          </div>
          <Link href="/" className="not-found-home text-bodySans text-primary">
            <InspectableText>Back home</InspectableText>
          </Link>
        </section>
        <PortfolioFooter />
      </main>
    </DesignInspector>
  );
}
