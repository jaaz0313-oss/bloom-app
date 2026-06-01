import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    localPatterns: [
      {
        pathname: "/logo.png",
      },
      {
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
