import { existsSync } from "node:fs";
import path from "node:path";
import type { Browser, PuppeteerNode, Viewport } from "puppeteer-core";
import type * as SparticuzChromium from "@sparticuz/chromium";
import type * as PuppeteerCore from "puppeteer-core";

const CHROMIUM_HEADLESS_MODE = "shell" as const;
const LOCAL_BROWSER_PATHS: Partial<Record<NodeJS.Platform, string[]>> = {
  darwin: [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    ...(process.env.HOME
      ? [
          path.join(
            process.env.HOME,
            "Applications",
            "Google Chrome.app",
            "Contents",
            "MacOS",
            "Google Chrome"
          ),
          path.join(
            process.env.HOME,
            "Applications",
            "Chromium.app",
            "Contents",
            "MacOS",
            "Chromium"
          ),
        ]
      : []),
  ],
  win32: [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  ],
  linux: [
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
  ],
};

// Cache modules for warm starts in serverless environments.
let chromiumMod: typeof SparticuzChromium | undefined;
let puppeteerMod: typeof PuppeteerCore | undefined;

function chromiumBinPath(): string {
  return path.join(process.cwd(), "node_modules", "@sparticuz", "chromium", "bin");
}

function firstExistingPath(paths: string[]): string | undefined {
  return paths.find((candidate) => existsSync(candidate));
}

function localBrowserExecutablePath(): string | undefined {
  const configuredPath =
    process.env.PUPPETEER_EXECUTABLE_PATH ??
    process.env.CHROME_EXECUTABLE_PATH ??
    process.env.CHROMIUM_PATH;

  if (configuredPath && existsSync(configuredPath)) {
    return configuredPath;
  }

  return firstExistingPath(LOCAL_BROWSER_PATHS[process.platform] ?? []);
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
  const localExecutablePath = localBrowserExecutablePath();

  chromium.setGraphicsMode = false;

  return puppeteer.launch({
    args: localExecutablePath ? [] : chromium.args,
    defaultViewport,
    executablePath: localExecutablePath ?? (await chromium.executablePath(chromiumBinPath())),
    headless: localExecutablePath ? true : CHROMIUM_HEADLESS_MODE,
  });
}