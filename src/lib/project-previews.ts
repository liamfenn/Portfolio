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
  team: [
    { name: "Annabel Lake", href: "https://uk.linkedin.com/in/annabellake" },
    { name: "Luke Dupont", href: "https://www.linkedin.com/in/lukedupont" },
    { name: "Jon Rundle", href: "https://jonrundle.design/" },
  ],
};

export const PROJECT_PREVIEWS: ProjectPreview[] = [
  { id: "shop-01", ...shop, media: MEDIA_ASSETS.shopProductPage },
  { id: "shop-02", ...shop },
  { id: "shop-03", ...shop },
  ...Array.from({ length: 9 }, (_, index) => ({
    id: `shop-${String(index + 4).padStart(2, "0")}`,
    ...shop,
  })),
];
