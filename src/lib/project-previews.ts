export interface ProjectPreview {
  id: string;
  label: string;
  caseStudySlug: string;
  year: number;
}

// Media intentionally remains neutral until the final case-study assets arrive.
// Multiple previews can share a slug, so one case study can be represented by
// several grid tiles without duplicating its route.
export const PROJECT_PREVIEWS: ProjectPreview[] = [
  { id: "shop-01", label: "Shop", caseStudySlug: "shop", year: 2026 },
  { id: "shop-02", label: "Shop", caseStudySlug: "shop", year: 2026 },
  { id: "shop-03", label: "Shop", caseStudySlug: "shop", year: 2026 },
  { id: "bird-01", label: "Bird", caseStudySlug: "bird", year: 2025 },
  { id: "plasticity-01", label: "Plasticity", caseStudySlug: "plasticity", year: 2025 },
  { id: "azura-01", label: "Azura", caseStudySlug: "azura", year: 2024 },
];
