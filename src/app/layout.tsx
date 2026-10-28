import type { Metadata, Viewport } from "next";
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Use the device-width layout as the zoom-out floor without restricting zooming in.
  minimumScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: SITE,
  title: "Liam Fennell",
  description:
    "Liam Fennell is a designer based in Atlanta, GA, currently designing commerce and discovery experiences for Shop.",
  // The footer globe mid-glitch, captured with scripts/capture-favicon.mjs.
  icons: {
    icon: [
      { url: "/images/meta/favicon-globe-32.png", sizes: "32x32", type: "image/png" },
      { url: "/images/meta/favicon-globe-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: { url: "/images/meta/favicon-globe-180.png", sizes: "180x180", type: "image/png" },
    shortcut: "/images/meta/favicon-globe-32.png",
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
        <noscript><style>{`.skeleton { display: none; } .skeleton-text-reserve { visibility: visible; } .skeleton-text > .sr-only { display: none; } .project-preview-media[data-video-display] > .project-preview-poster { visibility: visible; }`}</style></noscript>
        <ProjectDisplayProvider>
          {children}
        </ProjectDisplayProvider>
        <Analytics />
        <AgentationProvider />
      </body>
    </html>
  );
}
