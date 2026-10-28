import type { PortfolioMediaAsset } from "@/lib/media-assets";
import { MEDIA_ASSETS } from "@/lib/media-assets";

export interface ProjectPreview {
  id: string;
  label: string;
  company: string;
  companyLogo: string;
  companyColor: string;
  period: string;
  quarter?: number;
  featuredOrder: number;
  year: number;
  media?: PortfolioMediaAsset;
  description?: string;
  tech?: string[];
  team?: { name: string; href: string }[];
}

// Each entry is a homepage tile. Media stays optional until final assets arrive.
const shop = {
  label: "Product details page",
  company: "Shop",
  companyLogo: "/images/icons/shop-swirl.svg",
  companyColor: "var(--bg-purple-fill)",
  period: "Q2 2026",
  year: 2026,
  quarter: 2,
  featuredOrder: 1,
  description: "Experiential campaign centered around social graph of personalized baskets with real products selected from the canvas. Each card is generated on device, dynamic layout and physics every time.",
  tech: ["Swift", "UIKit", "Metal"],
  team: [
    { name: "Annabel Lake", href: "https://uk.linkedin.com/in/annabellake" },
    { name: "Luke Dupont", href: "https://www.linkedin.com/in/lukedupont" },
    { name: "Jon Rundle", href: "https://jonrundle.design/" },
  ],
};

export const PROJECT_PREVIEWS: ProjectPreview[] = [
  { id: "shop-01", ...shop, media: MEDIA_ASSETS.shopProductPage },
  {
    id: "shop-02", ...shop,
    label: "Rewards card",
    period: "Q4 2026",
    quarter: 4,
    media: MEDIA_ASSETS.shopRewardsCard,
    team: [
      { name: "Julian Kelly", href: "https://x.com/julianfkelly" },
      { name: "Max Kaplun", href: "https://x.com/maxkaplun" },
      { name: "Ben Parker", href: "https://x.com/benjamintparker" },
    ],
  },
  { id: "shop-03", ...shop },
  ...Array.from({ length: 9 }, (_, index) => ({
    id: `shop-${String(index + 4).padStart(2, "0")}`,
    ...shop,
  })),
];
