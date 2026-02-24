import type { Metadata } from "next";
import localFont from "next/font/local";
import { GeistMono } from "geist/font/mono";
import { Analytics } from "@vercel/analytics/react";
import { AgentationProvider } from "@/components/agentation-provider";
import "./globals.css";

const abcDiatype = localFont({
  src: [
    {
      path: "../../public/fonts/ABC Diatype Medium.ttf",
      weight: "500",
      style: "normal",
    },
  ],
  variable: "--font-abc-diatype",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Liam Fennell",
  description:
    "Liam Fennell is a designer based in Atlanta building consumer products. His work leans toward restraint, reducing friction and abstraction so systems feel intuitive and obvious in hindsight.",
  icons: {
    icon: "/images/meta/favicon.png",
  },
  openGraph: {
    title: "Liam Fennell",
    description:
      "Liam Fennell is a designer based in Atlanta building consumer products. His work leans toward restraint, reducing friction and abstraction so systems feel intuitive and obvious in hindsight.",
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
      "Liam Fennell is a designer based in Atlanta building consumer products. His work leans toward restraint, reducing friction and abstraction so systems feel intuitive and obvious in hindsight.",
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
      <body className={`${abcDiatype.variable} ${GeistMono.variable} font-sans antialiased`}>
        {children}
        <Analytics />
        <AgentationProvider />
      </body>
    </html>
  );
}
