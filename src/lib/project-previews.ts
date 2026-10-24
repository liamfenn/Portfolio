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
}

// Each entry is a homepage tile. Media stays optional until final assets arrive.
const shop = {
  company: "Shop",
  companyLogo: "/images/icons/shop-swirl.svg",
  companyColor: "var(--bg-purple-fill)",
  period: "Q2 2026",
  year: 2026,
  quarter: 2,
  featuredOrder: 1,
};

export const PROJECT_PREVIEWS: ProjectPreview[] = [
  { id: "shop-01", label: "Interactive Baskets", ...shop, media: MEDIA_ASSETS.shopProductPage },
  { id: "shop-02", label: "Shop", ...shop },
  { id: "shop-03", label: "Shop", ...shop },
  ...Array.from({ length: 9 }, (_, index) => ({
    id: `shop-${String(index + 4).padStart(2, "0")}`,
    label: "Shop",
    ...shop,
  })),
];
