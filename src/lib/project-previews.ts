export interface ProjectPreview {
  id: string;
  label: string;
  caseStudySlug: string;
}

// Media intentionally remains neutral until the final case-study assets arrive.
// Multiple previews can share a slug, so one case study can be represented by
// several grid tiles without duplicating its route.
export const PROJECT_PREVIEWS: ProjectPreview[] = [
  { id: "shop-01", label: "Shop", caseStudySlug: "shop" },
  { id: "shop-02", label: "Shop", caseStudySlug: "shop" },
  { id: "shop-03", label: "Shop", caseStudySlug: "shop" },
  { id: "bird-01", label: "Bird", caseStudySlug: "bird" },
  { id: "plasticity-01", label: "Plasticity", caseStudySlug: "plasticity" },
  { id: "azura-01", label: "Azura", caseStudySlug: "azura" },
];
