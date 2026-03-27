import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep heavy server-only packages out of the client bundle.
  // @sparticuz/chromium and puppeteer-core are large binaries that must
  // only ever run in the Node.js server runtime (never bundled by webpack).
  serverExternalPackages: ["node-cron", "@sparticuz/chromium", "puppeteer-core"],
  outputFileTracingIncludes: {
    "/*": ["./node_modules/@sparticuz/chromium/bin/**"],
  },
};

export default nextConfig;
