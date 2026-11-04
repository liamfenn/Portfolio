import type { ProjectStackTag } from "@/lib/project-arrangement";
import type { PortfolioMediaAsset } from "@/lib/media-assets";
import { MEDIA_ASSETS } from "@/lib/media-assets";

export interface ProjectPreview {
  id: string;
  label: string;
  stackTag?: ProjectStackTag;
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
  {
    id: "shop-01", ...shop,
    stackTag: "top",
    label: "Top search",
    period: "Q4 2026",
    quarter: 4,
    media: MEDIA_ASSETS.shopFirstPreview,
    team: [
      { name: "Luke Dupont", href: "https://www.linkedin.com/in/lukedupont" },
      { name: "Julian Kelly", href: "https://x.com/julianfkelly" },
    ],
  },
  {
    id: "shop-02", ...shop,
    label: "Shop card",
    period: "Q4 2026",
    quarter: 4,
    media: MEDIA_ASSETS.shopRewardsCard,
    tech: ["Javascript", "WebGL", "CSS 3D transforms"],
    team: [
      { name: "Julian Kelly", href: "https://x.com/julianfkelly" },
      { name: "Max Kaplun", href: "https://x.com/maxkaplun" },
      { name: "Ben Parker", href: "https://x.com/benjamintparker" },
    ],
  },
  {
    id: "shop-03", ...shop,
    label: "Shop Incentives",
    period: "Q3 2026",
    year: 2026,
    quarter: 3,
    media: MEDIA_ASSETS.shopQ32026,
    team: [{ name: "Ashten Alexander", href: "https://ashten.studio" }],
    tech: ["Swift", "UIKit"],
  },
  {
    id: "shop-04", ...shop,
    label: "Baskets",
    media: MEDIA_ASSETS.shopFourthPreview,
    team: [],
    tech: ["Swift", "Nano Banana", "Kling"],
  },
  {
    id: "shop-05", ...shop,
    stackTag: "top",
    label: "Collections sheet",
    description: undefined,
    period: "Q3 2025",
    year: 2025,
    quarter: 3,
    media: MEDIA_ASSETS.shopCollections,
    team: [{ name: "Staci Kelly", href: "https://www.linkedin.com/in/stacikelly" }],
    tech: [],
  },
  {
    id: "shop-07", ...shop,
    stackTag: "bottom",
    label: "Bottom search",
    period: "Q4 2026",
    year: 2026,
    quarter: 4,
    media: MEDIA_ASSETS.shopSeventhPreview,
    team: [{ name: "Jon Rundle", href: "https://x.com/jonrundle" }],
    tech: ["Swift", "UIKit", "Metal"],
  },
  {
    id: "shop-08", ...shop,
    label: "Canvas",
    period: "Q3 2026",
    year: 2026,
    quarter: 3,
    media: MEDIA_ASSETS.shopCanvasPreview,
    team: [
      { name: "Annabel Lake", href: "https://uk.linkedin.com/in/annabellake" },
      { name: "Julian Kelly", href: "https://x.com/julianfkelly" },
    ],
    tech: ["Swift", "Vision"],
  },
  {
    id: "shop-09", ...shop,
    label: "Feed cash",
    stackTag: "top",
    period: "Q4 2026",
    year: 2026,
    quarter: 4,
    description: undefined,
    media: MEDIA_ASSETS.shopFeedCashPreview,
    team: [{ name: "Ashten Alexander", href: "https://ashten.studio" }],
    tech: ["Swift", "UIKit"],
  },
  ...Array.from({ length: 3 }, (_, index) => ({
    id: `shop-${String(index + 10).padStart(2, "0")}`,
    ...shop,
    label: `Placeholder ${index + 10}`,
  })),
];
