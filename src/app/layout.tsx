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

export const metadata: Metadata = {
  title: "Liam Fennell",
  description:
    "Liam Fennell is a designer based in Atlanta building consumer products. Currently at Shopify, working with the talented team building Shop app.",
  icons: {
    icon: "/images/meta/favicon.png",
    apple: "/images/meta/favicon.png",
    shortcut: "/images/meta/favicon.png",
  },
  openGraph: {
    title: "Liam Fennell",
    description:
      "Liam Fennell is a designer based in Atlanta building consumer products. Currently at Shopify, working with the talented team building Shop app.",
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
      "Liam Fennell is a designer based in Atlanta building consumer products. Currently at Shopify, working with the talented team building Shop app.",
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
      <body className={`${suisseIntl.variable} ${GeistMono.variable} font-sans antialiased`}>
        {children}
        <Analytics />
        <AgentationProvider />
      </body>
    </html>
  );
}
