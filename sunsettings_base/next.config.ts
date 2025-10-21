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
  // Add permissive headers useful for certain wallet SDKs in dev (e.g. Coinbase Smart Wallet)
  // so they can communicate with their companion app. These are safe for localhost.
  // You can disable or tighten these in production if not needed.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
          { key: "Cross-Origin-Embedder-Policy", value: "unsafe-none" },
        ],
      },
    ]
  },
};

export default nextConfig;
