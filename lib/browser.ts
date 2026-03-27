import path from "node:path";
import type { Browser, PuppeteerNode, Viewport } from "puppeteer-core";
import type * as SparticuzChromium from "@sparticuz/chromium";
import type * as PuppeteerCore from "puppeteer-core";

const CHROMIUM_HEADLESS_MODE = "shell" as const;

// Cache modules for warm starts in serverless environments.
let chromiumMod: typeof SparticuzChromium | undefined;
let puppeteerMod: typeof PuppeteerCore | undefined;

function chromiumBinPath(): string {
  return path.join(process.cwd(), "node_modules", "@sparticuz", "chromium", "bin");
}

export async function launchChromiumBrowser(
  defaultViewport: Viewport
): Promise<Browser> {
  if (!chromiumMod || !puppeteerMod) {
    [chromiumMod, puppeteerMod] = await Promise.all([
      import("@sparticuz/chromium"),
      import("puppeteer-core"),
    ]);
  }

  const chromium = chromiumMod.default;
  const puppeteer = puppeteerMod.default as PuppeteerNode;

  chromium.setGraphicsMode = false;

  return puppeteer.launch({
    args: chromium.args,
    defaultViewport,
    executablePath: await chromium.executablePath(chromiumBinPath()),
    headless: CHROMIUM_HEADLESS_MODE,
  });
}