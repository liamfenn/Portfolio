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
const companies = {
  shop: { company: "Shop", companyLogo: "/images/icons/shop-swirl.svg", companyColor: "var(--color-shop)", period: "Q2 2026", year: 2026, quarter: 2, featuredOrder: 1 },
  bird: { company: "Bird", companyLogo: "/images/logos/Bird.png", companyColor: "var(--color-foreground)", period: "2025", year: 2025, featuredOrder: 2 },
  plasticity: { company: "Plasticity", companyLogo: "/images/logos/Plasticity.png", companyColor: "var(--color-plasticity)", period: "2025", year: 2025, featuredOrder: 3 },
  azura: { company: "Azura", companyLogo: "/images/logos/Azura.png", companyColor: "var(--color-azura)", period: "2024", year: 2024, featuredOrder: 4 },
};

export const PROJECT_PREVIEWS: ProjectPreview[] = [
  { id: "shop-01", label: "Interactive Baskets", ...companies.shop, media: MEDIA_ASSETS.shoppableBasketsMain },
  { id: "shop-02", label: "Shop", ...companies.shop },
  { id: "shop-03", label: "Shop", ...companies.shop },
  { id: "bird-01", label: "Bird", ...companies.bird },
  { id: "plasticity-01", label: "Plasticity", ...companies.plasticity },
  { id: "azura-01", label: "Azura", ...companies.azura },
];
