import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow large folder uploads in the API routes
  serverExternalPackages: ["node-cron"],
};

export default nextConfig;
