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

/** One rung of the encode ladder, in both codecs. Produced by scripts/process-video.sh. */
export interface PortfolioVideoRendition {
  width: number;
  av1: string;
  h264: string;
}

export interface PortfolioVideoAsset extends PortfolioMediaBase {
  kind: "video";
  poster: string;
  /** Sorted ascending by width. `src` stays the largest H.264 rung as a fallback. */
  renditions: PortfolioVideoRendition[];
}

export type PortfolioMediaAsset = PortfolioImageAsset | PortfolioVideoAsset;

export const MEDIA_ASSETS = {
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
} as const satisfies Record<string, PortfolioMediaAsset>;
