import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "gateway.pinata.cloud",
        port: "",
        pathname: "/ipfs/**",
      },
      {
        protocol: "https",
        hostname: "tan-mad-gorilla-689.mypinata.cloud",
        port: "",
        pathname: "/ipfs/**",
      },
    ],
  },
};

export default nextConfig;
