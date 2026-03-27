import path from "node:path";
import type { Browser, PuppeteerNode, Viewport } from "puppeteer-core";

const CHROMIUM_HEADLESS_MODE = "shell" as const;

function chromiumBinPath(): string {
  return path.join(process.cwd(), "node_modules", "@sparticuz", "chromium", "bin");
}

export async function launchChromiumBrowser(
  defaultViewport: Viewport
): Promise<Browser> {
  const [chromiumMod, puppeteerMod] = await Promise.all([
    import("@sparticuz/chromium"),
    import("puppeteer-core"),
  ]);

  const chromium = chromiumMod.default;
  const puppeteer = puppeteerMod.default as PuppeteerNode;

  chromium.setGraphicsMode = false;

  return puppeteer.launch({
    args: puppeteer.defaultArgs({
      args: chromium.args,
      headless: CHROMIUM_HEADLESS_MODE,
    }),
    defaultViewport,
    executablePath: await chromium.executablePath(chromiumBinPath()),
    headless: CHROMIUM_HEADLESS_MODE,
  });
}