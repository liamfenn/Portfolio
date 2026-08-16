import type { Metadata } from "next";
import localFont from "next/font/local";
import { GeistMono } from "geist/font/mono";
import { Analytics } from "@vercel/analytics/react";
import { AgentationProvider } from "@/components/agentation-provider";
import "./globals.css";

const suisseIntl = localFont({
  src: [
    {
      path: "../../public/fonts/SuisseIntl-Book.otf",
      weight: "500",
      style: "normal",
    },
  ],
  variable: "--font-suisse-intl",
  display: "swap",
});

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

export const metadata: Metadata = {
  metadataBase: new URL("https://www.fennell.cv"),
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
        url: "/images/meta/opengraph.png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Liam Fennell",
    description:
      "Liam Fennell is a designer based in Atlanta, GA, currently designing commerce and discovery experiences for Shop.",
    images: ["/images/meta/opengraph.png"],
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
        className={`${suisseIntl.variable} ${oracle.variable} ${otto.variable} ${GeistMono.variable} font-sans antialiased`}
      >
        {children}
        <Analytics />
        <AgentationProvider />
      </body>
    </html>
  );
}
