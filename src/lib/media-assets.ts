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
  /** Preserve supplied pixels for color-sensitive assets that are already small. */
  unoptimized?: boolean;
}

/** One rung of the shared ladder: H.264 for opaque video, verified HEVC/VP9 for alpha. */
export interface PortfolioVideoRendition {
  width: number;
  av1?: string;
  h264?: string;
  webmAlpha?: string;
  hevcAlpha?: string;
}

export interface PortfolioVideoAsset extends PortfolioMediaBase {
  kind: "video";
  /** Transparent clips keep their backdrop separate when raised above the focused header. */
  alpha?: boolean;
  poster: string;
  posters?: { width: number; src: string }[];
  frameRate?: number;
  duration?: number;
  /** Sorted ascending by width. `src` is the largest native file; playback chooses an appropriate rung. */
  renditions: PortfolioVideoRendition[];
}

export type PortfolioMediaAsset = PortfolioImageAsset | PortfolioVideoAsset;

/** Written by media:import only after validated files are available in public storage. */
export const IMPORTED_MEDIA = importedMedia as Record<string, PortfolioVideoAsset>;

export const MEDIA_ASSETS = {
  milktoothQ42026: IMPORTED_MEDIA["milktooth-q4-2026"],
  milktoothBlinkTimer: IMPORTED_MEDIA["milktooth-blink-timer"],
  shoppingAgent: IMPORTED_MEDIA["shopping-agent"],
  shopProductPage: IMPORTED_MEDIA["shop-product-page"],
  shopRewardsCard: IMPORTED_MEDIA["shop-rewards-card"],
  shopFirstPreview: IMPORTED_MEDIA["shop-first-preview"],
  shopQ32026: IMPORTED_MEDIA["shop-q3-2026"],
  shopFourthPreview: IMPORTED_MEDIA["shop-fourth-preview"],
  shopSeventhPreview: IMPORTED_MEDIA["shop-seventh-preview"],
  shopCanvasPreview: IMPORTED_MEDIA["shop-canvas-preview"],
  shopCollections: {
    id: "shop-collections",
    kind: "image",
    src: "/images/projects/shop-collections-v5.jpg",
    unoptimized: true,
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
