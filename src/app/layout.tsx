import type { Metadata } from "next";
import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/react";
import { AgentationProvider } from "@/components/agentation-provider";
import { ProjectDisplayProvider } from "@/components/project-display-state";
import "./globals.css";

const oracle = localFont({
  src: "../../public/fonts/ABCOracle.ttf",
  variable: "--font-abc-oracle",
  weight: "100 900",
  style: "normal",
  display: "swap",
});

const otto = localFont({
  src: "../../public/fonts/ABCOttoVariable.woff2",
  variable: "--font-abc-otto",
  weight: "100 900",
  style: "normal",
  display: "swap",
});

const SITE = new URL("https://www.fennell.cv");

export const metadata: Metadata = {
  metadataBase: SITE,
  title: "Liam Fennell",
  description:
    "Liam Fennell is a designer based in Atlanta, GA, currently designing commerce and discovery experiences for Shop.",
  icons: {
    icon: "/images/meta/favicon.png",
    apple: "/images/meta/favicon.png",
    shortcut: "/images/meta/favicon.png",
  },
  openGraph: {
    title: "Liam Fennell",
    description:
      "Liam Fennell is a designer based in Atlanta, GA, currently designing commerce and discovery experiences for Shop.",
    type: "website",
    images: [
      {
        url: "/images/meta/og-office.png",
        width: 1200,
        height: 630,
        alt: "Office of Liam Fennell",
      },
    ],
    // Recorded from /og with scripts/capture-og.mjs; the image above is its first frame. Unlike images, Next doesn't
    // resolve video URLs against metadataBase, and crawlers ignore relative ones.
    videos: [
      {
        url: new URL("/images/meta/og-office.mp4", SITE),
        type: "video/mp4",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Liam Fennell",
    description:
      "Liam Fennell is a designer based in Atlanta, GA, currently designing commerce and discovery experiences for Shop.",
    images: ["/images/meta/og-office.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${oracle.variable} ${otto.variable} font-sans antialiased`}
      >
        <ProjectDisplayProvider>
          {children}
        </ProjectDisplayProvider>
        <Analytics />
        <AgentationProvider />
      </body>
    </html>
  );
}
