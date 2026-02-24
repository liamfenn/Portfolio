import type { Metadata } from "next";
import localFont from "next/font/local";
import { GeistMono } from "geist/font/mono";
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
  title: "Liam Fennell - Designer",
  description:
    "Designer based in Atlanta with experience working on consumer products. Interested in ideas surrounding fashion, commerce, culture, and artificial intelligence.",
  openGraph: {
    title: "Liam Fennell - Designer",
    description:
      "Designer based in Atlanta with experience working on consumer products.",
    type: "website",
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
        <AgentationProvider />
      </body>
    </html>
  );
}
