import type { PortfolioMediaAsset } from "@/lib/media-assets";
import { MEDIA_ASSETS } from "@/lib/media-assets";

interface PlaceholderMedia {
  kind: "placeholder";
}

interface InteractiveMedia {
  kind: "interactive";
  demoId?: string;
}

export interface CaseStudyTechnology {
  label: string;
}

export interface CaseStudyMediaBlock {
  id: string;
  type: "media";
  caption?: string;
  media: PortfolioMediaAsset | PlaceholderMedia | InteractiveMedia;
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
  /** Display string, e.g. "Q2 2026". Sorting uses year/quarter, not this. */
  period: string;
  /** Hand-set position for the Featured sort. Lower comes first. */
  featuredOrder: number;
  year: number;
  /** 1-4. Omitted when the work is only dated to a year, which sorts last within it. */
  quarter?: number;
  description: string;
  companyLogo: string;
  companyLogoBackground: string;
  blocks: CaseStudyBlock[];
}

const PLACEHOLDER_DESCRIPTIONS = [
  "Experiential campaign centered around a social graph of personalized baskets, with real products selected from the canvas and generated dynamically on device.",
  "A product-system exploration focused on making complex tools feel direct, legible, and responsive across the full customer journey.",
  "A new interaction model that brings discovery and utility into one flexible surface, balancing expressive moments with familiar product patterns.",
  "An end-to-end redesign shaped through prototypes, motion studies, and close collaboration across product, engineering, and brand.",
] as const;

const PLACEHOLDER_COPY = [
  {
    title: "Platform refresh",
    paragraphs: [
      "The first phase focused on simplifying the platform's core structure and clarifying the path from discovery to action. The resulting system keeps the primary task legible while leaving room for contextual detail.",
    ],
  },
  {
    title: "Interaction model",
    paragraphs: [
      "Early prototypes explored how the interface could respond naturally as content changed. Motion, hierarchy, and progressive disclosure were tuned together rather than treated as separate layers.",
      "The final model uses a small set of repeatable behaviors so new features can feel familiar without becoming visually repetitive.",
    ],
  },
  {
    title: "From prototype to product",
    paragraphs: [
      "High-fidelity prototypes helped the team evaluate pacing, edge cases, and technical constraints before committing to a production direction.",
    ],
  },
  {
    title: "A flexible foundation",
    paragraphs: [
      "The system was designed to accommodate very different content densities while preserving a consistent rhythm, clear hierarchy, and predictable interaction language.",
      "Reusable primitives made it possible to iterate quickly without losing the specific character of each surface.",
    ],
  },
  {
    title: "Details at scale",
    paragraphs: [
      "Small decisions around typography, feedback, and transitions became especially important once the concept was tested across a wider range of real-world states.",
    ],
  },
] as const;

const PLACEHOLDER_CAPTIONS = [
  "Early interaction study",
  "Selected interface direction",
  "Prototype detail",
  "System behavior",
  "Exploratory layout",
  "Final interaction model",
] as const;

const TECHNOLOGIES: CaseStudyTechnology[] = [
  { label: "SwiftUI" },
  { label: "UIKit" },
  { label: "WebGL" },
  { label: "Codex" },
];

function hashString(value: string) {
  return Array.from(value).reduce((hash, character) => {
    return Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0;
  }, 2166136261);
}

function createSeededRandom(seed: number) {
  let state = seed;

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(items: readonly T[], random: () => number) {
  const result = [...items];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const replacementIndex = Math.floor(random() * (index + 1));
    [result[index], result[replacementIndex]] = [result[replacementIndex], result[index]];
  }

  return result;
}

function placeholderBlocks(slug: string): CaseStudyBlock[] {
  const seed = hashString(slug);
  const random = createSeededRandom(seed);
  const mediaCount = 2 + (seed % 3);
  const copyCount = 2 + ((seed >>> 3) % 2);
  const captions = shuffled(PLACEHOLDER_CAPTIONS, random);
  const copy = shuffled(PLACEHOLDER_COPY, random);
  const technologies = shuffled(TECHNOLOGIES, random).slice(0, 3 + (seed % 2));

  const blocks: CaseStudyBlock[] = [
    ...Array.from({ length: mediaCount }, (_, index): CaseStudyMediaBlock => ({
      id: `${slug}-media-${String(index + 1).padStart(2, "0")}`,
      type: "media",
      caption: index === mediaCount - 1 && seed % 2 === 0 ? undefined : captions[index],
      media: { kind: "placeholder" },
    })),
    ...copy.slice(0, copyCount).map(
      (block, index): CaseStudyCopyBlock => ({
        id: `${slug}-copy-${String(index + 1).padStart(2, "0")}`,
        type: "copy",
        title: block.title,
        paragraphs: [...block.paragraphs],
      }),
    ),
    {
      id: `${slug}-technology`,
      type: "technology",
      title: "Technology",
      items: technologies,
    },
  ];

  const randomizedBlocks = shuffled(blocks, random);

  if (slug === "shop") {
    const shopMedia = randomizedBlocks.filter(
      (block): block is CaseStudyMediaBlock => block.type === "media",
    );

    if (shopMedia[0]) {
      shopMedia[0].media = { ...MEDIA_ASSETS.shoppableBasketsMain };
    }

    if (shopMedia[1]) {
      shopMedia[1].media = { ...MEDIA_ASSETS.shoppableBasketsFlare };
    }
  }

  return randomizedBlocks;
}

export const CASE_STUDIES: CaseStudy[] = [
  {
    slug: "shop",
    title: "Shoppable Baskets",
    company: "Shop",
    role: "Senior Product Designer",
    period: "Q2 2026",
    featuredOrder: 1,
    year: 2026,
    quarter: 2,
    description: PLACEHOLDER_DESCRIPTIONS[0],
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
    featuredOrder: 2,
    year: 2025,
    description: PLACEHOLDER_DESCRIPTIONS[1],
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
    featuredOrder: 3,
    year: 2025,
    description: PLACEHOLDER_DESCRIPTIONS[2],
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
    featuredOrder: 4,
    year: 2024,
    description: PLACEHOLDER_DESCRIPTIONS[3],
    companyLogo: "/images/logos/Azura.png",
    companyLogoBackground: "#65fc9f",
    blocks: placeholderBlocks("azura"),
  },
];

/**
 * Sort keys for a case study. Anything unmatched sorts to the end of Featured
 * and to the bottom of Recent rather than jumping to the top.
 */
export function getCaseStudyOrder(slug: string) {
  const study = CASE_STUDIES.find((entry) => entry.slug === slug);

  return {
    featuredOrder: study?.featuredOrder ?? Number.MAX_SAFE_INTEGER,
    year: study?.year ?? Number.MIN_SAFE_INTEGER,
    quarter: study?.quarter ?? 0,
  };
}

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
