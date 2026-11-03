import importedMedia from "./imported-media.json";

interface PortfolioMediaBase {
  id: string;
  src: string;
  alt: string;
  width: number;
  height: number;
  /** Colour painted behind the media so sub-pixel seams match its edges. */
  backdrop?: string;
}

export interface PortfolioImageAsset extends PortfolioMediaBase {
  kind: "image";
  blurDataURL?: string;
}

/** One rung of the encode ladder. H.264 is the grid baseline; AV1 is an optional export. */
export interface PortfolioVideoRendition {
  width: number;
  av1?: string;
  h264: string;
}

export interface PortfolioVideoAsset extends PortfolioMediaBase {
  kind: "video";
  poster: string;
  posters?: { width: number; src: string }[];
  frameRate?: number;
  duration?: number;
  /** Sorted ascending by width. `src` stays the largest H.264 rung as a fallback. */
  renditions: PortfolioVideoRendition[];
}

export type PortfolioMediaAsset = PortfolioImageAsset | PortfolioVideoAsset;

/** Written by media:import only after validated files are available in public storage. */
export const IMPORTED_MEDIA = importedMedia as Record<string, PortfolioVideoAsset>;

export const MEDIA_ASSETS = {
  shopProductPage: IMPORTED_MEDIA["shop-product-page"],
  shopRewardsCard: IMPORTED_MEDIA["shop-rewards-card"],
  // Bundled preview delivery while the Blob upload credential is unavailable.
  shopQ32026: {
    id: "shop-q3-2026",
    kind: "video",
    src: "/videos/shop-q3-2026/d77935b0eb47b148-1600.mp4",
    poster: "/videos/shop-q3-2026/d77935b0eb47b148-poster-1600.webp",
    posters: [
      {
        width: 480,
        src: "/videos/shop-q3-2026/d77935b0eb47b148-poster-480.webp"
      },
      {
        width: 800,
        src: "/videos/shop-q3-2026/d77935b0eb47b148-poster-800.webp"
      },
      {
        width: 1600,
        src: "/videos/shop-q3-2026/d77935b0eb47b148-poster-1600.webp"
      }
    ],
    alt: "Shop interaction prototype from Q3 2026",
    width: 1600,
    height: 1600,
    frameRate: 60,
    duration: 18.45,
    renditions: [
      {
        width: 800,
        h264: "/videos/shop-q3-2026/d77935b0eb47b148-800.mp4"
      },
      {
        width: 1200,
        h264: "/videos/shop-q3-2026/d77935b0eb47b148-1200.mp4"
      },
      {
        width: 1600,
        h264: "/videos/shop-q3-2026/d77935b0eb47b148-1600.mp4"
      }
    ]
  },
  shopFourthPreview: {
    id: "shop-fourth-preview",
    kind: "video",
    src: "/videos/shop-fourth-preview/3409f49a692266b8-1600.mp4",
    poster: "/videos/shop-fourth-preview/3409f49a692266b8-poster-1600.webp",
    posters: [
      {
        width: 480,
        src: "/videos/shop-fourth-preview/3409f49a692266b8-poster-480.webp"
      },
      {
        width: 800,
        src: "/videos/shop-fourth-preview/3409f49a692266b8-poster-800.webp"
      },
      {
        width: 1600,
        src: "/videos/shop-fourth-preview/3409f49a692266b8-poster-1600.webp"
      }
    ],
    alt: "Shop interaction prototype from Q2 2026",
    width: 1600,
    height: 1600,
    frameRate: 60,
    duration: 13.433333,
    renditions: [
      {
        width: 800,
        h264: "/videos/shop-fourth-preview/3409f49a692266b8-800.mp4"
      },
      {
        width: 1200,
        h264: "/videos/shop-fourth-preview/3409f49a692266b8-1200.mp4"
      },
      {
        width: 1600,
        h264: "/videos/shop-fourth-preview/3409f49a692266b8-1600.mp4"
      }
    ]
  },
  shopCollections: {
    id: "shop-collections",
    kind: "image",
    src: "/images/projects/shop-collections-v3.jpg",
    alt: "Shop saved collections interface",
    width: 1280,
    height: 1280,
  },
  shoppableBasketsMain: {
    id: "shop-baskets-main",
    kind: "video",
    src: "/media/shop/baskets-main-1600.mp4",
    poster: "/media/shop/baskets-main-poster.webp",
    alt: "Shoppable Baskets interaction prototype",
    width: 1600,
    height: 1600,
    backdrop: "#f3f3f3",
    renditions: [
      {
        width: 800,
        av1: "/media/shop/baskets-main-800.av1.mp4",
        h264: "/media/shop/baskets-main-800.mp4",
      },
      {
        width: 1200,
        av1: "/media/shop/baskets-main-1200.av1.mp4",
        h264: "/media/shop/baskets-main-1200.mp4",
      },
      {
        width: 1600,
        av1: "/media/shop/baskets-main-1600.av1.mp4",
        h264: "/media/shop/baskets-main-1600.mp4",
      },
    ],
  },
  shoppableBasketsFlare: {
    id: "shop-baskets-flare",
    kind: "video",
    src: "/media/shop/baskets-flare-1600.mp4",
    poster: "/media/shop/baskets-flare-poster.webp",
    alt: "Shoppable Baskets flared interaction prototype",
    width: 1600,
    height: 1600,
    backdrop: "#000000",
    renditions: [
      {
        width: 800,
        av1: "/media/shop/baskets-flare-800.av1.mp4",
        h264: "/media/shop/baskets-flare-800.mp4",
      },
      {
        width: 1200,
        av1: "/media/shop/baskets-flare-1200.av1.mp4",
        h264: "/media/shop/baskets-flare-1200.mp4",
      },
      {
        width: 1600,
        av1: "/media/shop/baskets-flare-1600.av1.mp4",
        h264: "/media/shop/baskets-flare-1600.mp4",
      },
    ],
  },
  shoppableBasketsSecondary: {
    id: "shop-baskets-secondary",
    kind: "video",
    src: "/media/shop/fpo-1200.mp4",
    poster: "/media/shop/fpo-poster.webp",
    alt: "Shoppable Baskets on device",
    width: 1200,
    height: 1054,
    backdrop: "#635e58",
    renditions: [
      { width: 800, av1: "/media/shop/fpo-800.av1.mp4", h264: "/media/shop/fpo-800.mp4" },
      { width: 1200, av1: "/media/shop/fpo-1200.av1.mp4", h264: "/media/shop/fpo-1200.mp4" },
    ],
  },
} as const satisfies Record<string, PortfolioMediaAsset>;
