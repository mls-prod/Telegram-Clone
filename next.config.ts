import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.vercel.app",
      },
      {
        protocol: "https",
        hostname: "storage.c2.liara.space",
        port: "",
        pathname: "/tlgrm/**",
      },
    ],
  },
};

export default nextConfig;
