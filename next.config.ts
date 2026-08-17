import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Next 16 rejects any quality not declared here. 90 is for case study media,
    // where the default 75 is too lossy for flat colour and fine type.
    qualities: [75, 90],
    remotePatterns: [
      {
        // Vercel Blob, where encoded media lives once NEXT_PUBLIC_MEDIA_BASE_URL is set.
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "i.scdn.co",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.scdn.co",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "mosaic.scdn.co",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "video.twimg.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
