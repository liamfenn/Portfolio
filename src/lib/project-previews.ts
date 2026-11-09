import type { ProjectStackTag } from "@/lib/project-arrangement";
import type { PortfolioMediaAsset } from "@/lib/media-assets";
import { MEDIA_ASSETS } from "@/lib/media-assets";

export interface ProjectPreview {
  id: string;
  label: string;
  stackTag?: ProjectStackTag;
  company: string;
  companyHref: string;
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
  companyHref: "https://shop.com/",
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
    label: "Navigation",
    description: "Explored exposing search throughout Shop, with particular attention to the product detail page and typeahead. Rolled a custom tinted glass treatment that preserves fluidity while making transitions calmer and more predictable.",
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
    label: "Rewards card",
    description: "Interactive digital card for Shop rewards. Tested various visual treatments and custom shaders that informed the design of a physical card. Gyroscope-driven movement adds a small moment of play to the shopping experience.",
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
    label: "Incentives",
    description: "Reimagined how incentives show up throughout the funnel. Organized by offer type rather than funding source to make them clearer for buyers. Developed a canonical system for communicating value, progress, and eligibility without visual clutter.",
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
    description: "Extended an early creative direction for Shop Week, exploring how users could create and share personalized baskets of products. Each card is generated on device, with a different arrangement and physical behavior every time.",
    media: MEDIA_ASSETS.shopFourthPreview,
    team: [],
    tech: ["Swift", "Nano Banana", "Kling"],
  },
  {
    id: "shop-05", ...shop,
    stackTag: "top",
    label: "Collections",
    description: "The first project I worked on when I joined Shop. Built on an early version of collections, adding collaboration and recommendations based on saved products, and guiding the project to completion.",
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
    label: "Navigation",
    description: "Experimented with a bottom-anchored search, using a distortion shader to connect its movement to the surrounding page. Suggested queries emerge from behind the bar as the user scrolls through a product page, inviting deeper exploration only when we can infer interest.",
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
    description: "Visual shopping concept built around an open, procedurally generated canvas of products. The thesis was that a spatial layout organized around intent could make discovering and collecting items feel more fluid and effortless.",
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
    id: "shopping-agent",
    label: "Shopping agent",
    description: "Conversational shopping prototype exploring how an agent can help turn an idea into a set of products. The experience brings conversation and product discovery together, with room to refine what you’re looking for along the way.",
    company: "Milk Tooth",
    companyHref: "https://milktooth.studio",
    companyLogo: "/images/logos/LF.png",
    companyColor: "var(--text-primary)",
    period: "Q1 2026",
    year: 2026,
    quarter: 1,
    featuredOrder: 8,
    media: MEDIA_ASSETS.shoppingAgent,
    tech: ["Next.js", "OpenAI API"],
    team: [],
  },
  {
    id: "milktooth-q4-2026",
    label: "Blink",
    description: "Interaction study for Blink exploring depth, material, and motion in a compact interface. The prototype gives the experience a more tactile feel through dimensional elements and responsive movement.",
    company: "Milk Tooth",
    companyHref: "https://milktooth.studio",
    companyLogo: "/images/logos/LF.png",
    companyColor: "var(--text-primary)",
    period: "Q4 2026",
    year: 2026,
    quarter: 4,
    featuredOrder: 9,
    media: MEDIA_ASSETS.milktoothQ42026,
    tech: ["UIKit", "Metal"],
    team: [],
  },
  {
    id: "milktooth-blink-timer",
    stackTag: "bottom",
    label: "Blink",
    description: "Timer interaction study for Blink, exploring how motion can make the passage of time feel more tangible. The prototype focuses on the relationship between a simple utility and the small physical behaviors that give it character.",
    company: "Milk Tooth",
    companyHref: "https://milktooth.studio",
    companyLogo: "/images/logos/LF.png",
    companyColor: "var(--text-primary)",
    period: "Q4 2026",
    year: 2026,
    quarter: 4,
    featuredOrder: 10,
    media: MEDIA_ASSETS.milktoothBlinkTimer,
    tech: ["UIKit", "Metal"],
    team: [],
  },
  ...Array.from({ length: 5 }, (_, index) => ({
    id: `shop-${String(index + 10).padStart(2, "0")}`,
    ...shop,
    label: `Placeholder ${index + 8}`,
  })),
];
