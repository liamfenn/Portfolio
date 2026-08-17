export interface PortfolioVideoAsset {
  kind: "video";
  src: string;
  alt: string;
  poster?: string;
}

export type PortfolioMediaAsset = PortfolioVideoAsset;

export const MEDIA_ASSETS = {
  shoppableBasketsMain: {
    kind: "video",
    src: "/videos/baskets-final.mp4",
    alt: "Shoppable Baskets interaction prototype",
  },
  shoppableBasketsFlare: {
    kind: "video",
    src: "/videos/baskets-flare.mp4",
    alt: "Shoppable Baskets flared interaction prototype",
  },
} as const satisfies Record<string, PortfolioMediaAsset>;
