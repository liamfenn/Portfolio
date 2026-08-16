export interface CaseStudyTechnology {
  label: string;
  color: string;
  background: string;
}

export interface CaseStudyMediaBlock {
  id: string;
  type: "media";
  media: {
    kind: "placeholder" | "image" | "video" | "interactive";
    src?: string;
    alt?: string;
    demoId?: string;
  };
}

export interface CaseStudyCopyBlock {
  id: string;
  type: "copy";
  title: string;
  paragraphs: string[];
}

export interface CaseStudyTechnologyBlock {
  id: string;
  type: "technology";
  title: string;
  items: CaseStudyTechnology[];
}

export type CaseStudyBlock = CaseStudyMediaBlock | CaseStudyCopyBlock | CaseStudyTechnologyBlock;

export interface CaseStudy {
  slug: string;
  title: string;
  company: string;
  role: string;
  period: string;
  description: string;
  companyLogo: string;
  companyLogoBackground: string;
  blocks: CaseStudyBlock[];
}

const PLACEHOLDER_DESCRIPTION =
  "Experiential campaign centered around social graph of personalized baskets with real products selected from the canvas. Each card is generated on device, dynamic layout and physics every time.";

const TECHNOLOGIES: CaseStudyTechnology[] = [
  { label: "SwiftUI", color: "#5533ea", background: "rgba(85, 51, 234, 0.16)" },
  { label: "UIKit", color: "#eb37ac", background: "rgba(235, 55, 172, 0.16)" },
  { label: "WebGL", color: "#5a1171", background: "rgba(90, 17, 113, 0.16)" },
  { label: "Codex", color: "#1e71d7", background: "rgba(30, 113, 215, 0.16)" },
];

function placeholderBlocks(slug: string): CaseStudyBlock[] {
  return [
    { id: `${slug}-media-01`, type: "media", media: { kind: "placeholder" } },
    {
      id: `${slug}-copy-01`,
      type: "copy",
      title: "Platform refresh",
      paragraphs: [PLACEHOLDER_DESCRIPTION],
    },
    { id: `${slug}-technology`, type: "technology", title: "Technology", items: TECHNOLOGIES },
    { id: `${slug}-media-02`, type: "media", media: { kind: "placeholder" } },
    {
      id: `${slug}-copy-02`,
      type: "copy",
      title: "Platform refresh",
      paragraphs: [PLACEHOLDER_DESCRIPTION, PLACEHOLDER_DESCRIPTION],
    },
    { id: `${slug}-media-03`, type: "media", media: { kind: "placeholder" } },
  ];
}

export const CASE_STUDIES: CaseStudy[] = [
  {
    slug: "shop",
    title: "Shoppable Baskets",
    company: "Shop",
    role: "Senior Product Designer",
    period: "Q2 2026",
    description: PLACEHOLDER_DESCRIPTION,
    companyLogo: "/images/logos/Shop.png",
    companyLogoBackground: "#5533ea",
    blocks: placeholderBlocks("shop"),
  },
  {
    slug: "bird",
    title: "Bird",
    company: "Bird",
    role: "Product Designer",
    period: "2025",
    description: PLACEHOLDER_DESCRIPTION,
    companyLogo: "/images/logos/Bird.png",
    companyLogoBackground: "#000000",
    blocks: placeholderBlocks("bird"),
  },
  {
    slug: "plasticity",
    title: "Plasticity",
    company: "Plasticity",
    role: "Product Designer",
    period: "2025",
    description: PLACEHOLDER_DESCRIPTION,
    companyLogo: "/images/logos/Plasticity.png",
    companyLogoBackground: "#494578",
    blocks: placeholderBlocks("plasticity"),
  },
  {
    slug: "azura",
    title: "Azura",
    company: "Azura",
    role: "Product Designer",
    period: "2024",
    description: PLACEHOLDER_DESCRIPTION,
    companyLogo: "/images/logos/Azura.png",
    companyLogoBackground: "#65fc9f",
    blocks: placeholderBlocks("azura"),
  },
];

export function getCaseStudy(slug: string) {
  return CASE_STUDIES.find((study) => study.slug === slug);
}

export function getAdjacentCaseStudies(slug: string) {
  const currentIndex = CASE_STUDIES.findIndex((study) => study.slug === slug);

  if (currentIndex === -1) {
    return null;
  }

  return {
    previous: CASE_STUDIES[(currentIndex - 1 + CASE_STUDIES.length) % CASE_STUDIES.length],
    next: CASE_STUDIES[(currentIndex + 1) % CASE_STUDIES.length],
  };
}
