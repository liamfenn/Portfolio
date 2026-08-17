interface PortfolioMediaBase {
  id: string;
  src: string;
  alt: string;
  width: number;
  height: number;
}

export interface PortfolioImageAsset extends PortfolioMediaBase {
  kind: "image";
  blurDataURL?: string;
}

export interface PortfolioVideoAsset extends PortfolioMediaBase {
  kind: "video";
  poster: string;
  previewSrc?: string;
}

export type PortfolioMediaAsset = PortfolioImageAsset | PortfolioVideoAsset;

export const MEDIA_ASSETS = {
  shoppableBasketsMain: {
    id: "shop-baskets-main",
    kind: "video",
    src: "/media/shop/baskets-main.mp4",
    previewSrc: "/media/shop/baskets-main.mp4",
    poster: "/media/shop/baskets-main-poster.webp",
    alt: "Shoppable Baskets interaction prototype",
    width: 1600,
    height: 1600,
  },
  shoppableBasketsFlare: {
    id: "shop-baskets-flare",
    kind: "video",
    src: "/media/shop/baskets-flare.mp4",
    poster: "/media/shop/baskets-flare-poster.webp",
    alt: "Shoppable Baskets flared interaction prototype",
    width: 1600,
    height: 1600,
  },
} as const satisfies Record<string, PortfolioMediaAsset>;
