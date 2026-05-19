import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["node-cron", "@sparticuz/chromium", "puppeteer-core"],
  outputFileTracingIncludes: {
    "/*": ["./node_modules/@sparticuz/chromium/bin/**"],
  },
};

export default nextConfig;
