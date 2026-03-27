import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep dev artifacts separate so running dev and build in parallel cannot corrupt manifests.
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
};

export default nextConfig;
