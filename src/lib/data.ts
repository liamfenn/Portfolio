export interface Thumbnail {
  videoUrl: string;
  href: string;
  glowColor?: string; // override glow for light videos, e.g. "black"
  mobileGlowColor?: string; // override glow on mobile only (e.g. for dark images)
  mobileGlow?: boolean; // show dynamic video glow on mobile (default: no glow on mobile)
}

export interface WorkEntry {
  id: string;
  personalLogo: string;
  personalLogoOpacity?: number;
  companyLogo: string;
  companyLogoBg?: string;
  company: string;
  companyColor: string;
  role: string;
  collaborator?: string;
  collaboratorHref?: string;
  description: string;
  isActive?: boolean;
  thumbnails?: Thumbnail[];
  href?: string;
}

export interface YearGroup {
  year: string;
  entries: WorkEntry[];
}

export const WORK_TIMELINE: YearGroup[] = [
  {
    year: "2026",
    entries: [
      {
        id: "shop",
        personalLogo: "/images/logos/Shopify.png",
        companyLogo: "/images/logos/Shop.png",
        companyLogoBg: "#f6f3ef",
        company: "Shop",
        companyColor: "#5533ea",
        role: "Senior Product Designer",
        description:
          "Designing commerce experiences for millions of users. Contributed to major initiatives like BFCM 2025 and the Shop Web redesign. Currently leading design for Buyer Acquisition, improving how users discover products and how merchants reach new customers.",
        isActive: true,
        thumbnails: [
          {
            videoUrl: "/images/projects/Shop-3.mp4",
            href: "https://x.com/i/status/2018734068536377426",
            mobileGlow: true,
          },
          {
            videoUrl: "/images/projects/Shop-4.mp4",
            href: "https://x.com/i/status/2014409124587700290",
            glowColor: "#cccccc",
          },
        ],
        href: "https://shop.app",
      },
    ],
  },
  {
    year: "2025",
    entries: [
      {
        id: "plasticity",
        personalLogo: "/images/logos/OP.png",
        companyLogo: "/images/logos/Plasticity.png",
        companyLogoBg: "#494578",
        company: "Plasticity",
        companyColor: "#3D0028",
        role: "Product Designer",
        collaborator: "OpenPurpose®",
        collaboratorHref: "https://openpurpose.com",
        description:
          "Worked closely with the founder to evolve Plasticity into a simpler, more powerful modeling experience. Introduced a flexible design system and refined core workflows to improve usability and product coherence.",
        thumbnails: [
          {
            videoUrl: "/images/projects/Plasticity.png",
            href: "https://x.com/getPlasticity/status/1894434327024603504?s=20",
            glowColor: "#cccccc",
            mobileGlowColor: "#494578",
          },
        ],
        href: "https://plasticity.xyz",
      },
      {
        id: "scyai",
        personalLogo: "/images/logos/LF.png",
        companyLogo: "/images/logos/ScyAI.png",
        companyLogoBg: "#1d1652",
        company: "ScyAI",
        companyColor: "#999999",
        role: "Independent Designer",
        collaborator: "Trinita Studio",
        collaboratorHref: "https://x.com/hours",
        description:
          "Partnered with Trinita Studio to design the first version of ScyAI. Delivered core product flows and a foundational brand system.",
        href: "https://scyai.com",
      },
      {
        id: "bird",
        personalLogo: "/images/logos/OP.png",
        companyLogo: "/images/logos/Bird.png",
        companyLogoBg: "#000000",
        company: "Bird",
        companyColor: "#999999",
        role: "Product Designer",
        collaborator: "OpenPurpose®",
        collaboratorHref: "https://openpurpose.com",
        description:
          "Worked alongside a team of 10 designers to reimagine Bird from the ground up in a two-month sprint. Helped strip the product back to its fundamentals and rebuild a clearer, more scalable experience.",
        thumbnails: [
          {
            videoUrl: "/images/projects/Bird.mp4",
            href: "https://www.linkedin.com/posts/birdhq_stop-juggling-tools-start-winning-customers-activity-7386060914032054272-A_eQ",
            mobileGlow: true,
          },
        ],
        href: "https://bird.com",
      },
      {
        id: "hcc",
        personalLogo: "/images/logos/LF.png",
        companyLogo: "/images/logos/HCC.png",
        company: "Human Chemical Company",
        companyColor: "#999999",
        role: "Independent Designer",
        description:
          "Collaborated with HCC to reinvent the product from first principles. Delivered a new design system, robust component library, and redesigned core feature flows to support long-term product evolution.",
        href: "https://humanchemical.com",
      },
    ],
  },
  {
    year: "2024",
    entries: [
      {
        id: "fitag",
        personalLogo: "/images/logos/LF.png",
        companyLogo: "/images/logos/Fitag.png",
        companyLogoBg: "#391940",
        company: "Fitag",
        companyColor: "#332E5D",
        role: "Founding Designer",
        description:
          "Led design for iOS and Shopify apps, creating a modular system for onboarding, recommendations, and product scoring.",
        thumbnails: [
          {
            videoUrl: "/images/projects/Fitag.png",
            href: "https://x.com/xyzfennell/status/1923067660620730766?s=20",
            glowColor: "#cccccc",
          },
        ],
        href: "https://fitag.app",
      },
      {
        id: "azura",
        personalLogo: "/images/logos/OP.png",
        companyLogo: "/images/logos/Azura.png",
        companyLogoBg: "#65fc9f",
        company: "Azura",
        companyColor: "#1ed760",
        role: "Intern Product Designer",
        collaborator: "OpenPurpose®",
        collaboratorHref: "https://openpurpose.com",
        description:
          "Designed the first native app version of Azura, rebuilt the marketing site, and refined the component library to support future growth.",
        thumbnails: [
          {
            videoUrl: "/images/projects/Azura.png",
            href: "https://x.com/AzuraTrade/status/2025688718703829429?s=20",
            glowColor: "#cccccc",
          },
        ],
        href: "https://azura.xyz",
      },
    ],
  },
];
