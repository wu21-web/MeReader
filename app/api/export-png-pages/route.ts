import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { safeSessionPath } from "@/lib/cleanup";
import { deriveExportTitle, escapeHtml, sanitizeFileName } from "@/lib/exportTitle";

export const runtime = "nodejs";
export const maxDuration = 60;

const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, filePath, html, title } = body as {
      sessionId?: string;
      filePath?: string;
      html?: string;
      title?: string;
    };

    if (!html) {
      return NextResponse.json({ error: "html is required" }, { status: 400 });
    }

    if (sessionId && filePath) {
      const resolved = safeSessionPath(sessionId, filePath);
      if (!resolved) {
        return NextResponse.json({ error: "Invalid path" }, { status: 400 });
      }
    }

    const exportTitle = deriveExportTitle(title);

    const fullHtml = buildHtmlPage(html, exportTitle);

    try {
      const [chromiumMod, puppeteerMod] = await Promise.all([
        import("@sparticuz/chromium"),
        import("puppeteer-core"),
      ]);
      const chromium = chromiumMod.default;
      const puppeteer = puppeteerMod.default;

      chromium.setGraphicsMode = false;

      const browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: {
          width: A4_WIDTH_PX,
          height: A4_HEIGHT_PX,
          deviceScaleFactor: 2,
        },
        executablePath: await chromium.executablePath(),
        headless: true,
      });

      const page = await browser.newPage();
      await page.setViewport({
        width: A4_WIDTH_PX,
        height: A4_HEIGHT_PX,
        deviceScaleFactor: 2,
      });
      await page.setContent(fullHtml, { waitUntil: "networkidle0" });
      await page.evaluate(async () => {
        await document.fonts.ready;
      });

      const totalHeight = await page.evaluate(() => {
        return Math.max(
          document.body.scrollHeight,
          document.documentElement.scrollHeight
        );
      });

      const pageCount = Math.max(1, Math.ceil(totalHeight / A4_HEIGHT_PX));
      const zip = new JSZip();
      const safeBase = sanitizeFileName(exportTitle) || "mereader";

      for (let i = 0; i < pageCount; i += 1) {
        const y = i * A4_HEIGHT_PX;
        const clipHeight = Math.min(A4_HEIGHT_PX, totalHeight - y);

        const png = (await page.screenshot({
          type: "png",
          clip: {
            x: 0,
            y,
            width: A4_WIDTH_PX,
            height: Math.max(1, clipHeight),
          },
          captureBeyondViewport: true,
        })) as Buffer;

        zip.file(`${safeBase}_page_${i + 1}.png`, png);
      }

      await browser.close();

      const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
      const zipBlob = new Blob([Buffer.from(zipBuffer)], {
        type: "application/zip",
      });

      return new NextResponse(zipBlob, {
        status: 200,
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="${encodeURIComponent(
            safeBase
          )}_png_pages.zip"`,
        },
      });
    } catch (err) {
      console.error("Chromium/puppeteer PNG export error:", err);
      return NextResponse.json(
        { error: "PNG generation failed. Please try again." },
        { status: 503 }
      );
    }
  } catch (err) {
    console.error("PNG export error:", err);
    return NextResponse.json({ error: "PNG export failed" }, { status: 500 });
  }
}

function buildHtmlPage(bodyHtml: string, title: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    @import url("https://fonts.googleapis.com/css2?family=Noto+Color+Emoji&family=Noto+Sans:wght@400;600;700&family=Noto+Sans+JP:wght@400;600;700&family=Noto+Sans+KR:wght@400;600;700&family=Noto+Sans+SC:wght@400;600;700&display=swap");
    *, *::before, *::after { box-sizing: border-box; }
    body {
      font-family: "Noto Sans", "Noto Sans SC", "Noto Sans JP", "Noto Sans KR", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji";
      font-size: 16px;
      line-height: 1.5;
      color: #24292f;
      background: #ffffff;
      padding: 0;
      margin: 0;
    }
    .container { max-width: 730px; margin: 0 auto; padding: 32px; }
    h1,h2,h3,h4,h5,h6 { font-weight: 600; line-height: 1.25; margin-top: 24px; margin-bottom: 16px; }
    h1 { font-size: 2em; border-bottom: 1px solid #d0d7de; padding-bottom: 0.3em; }
    h2 { font-size: 1.5em; border-bottom: 1px solid #d0d7de; padding-bottom: 0.3em; }
    h3 { font-size: 1.25em; }
    p { margin-top: 0; margin-bottom: 16px; }
    a { color: #0969da; text-decoration: none; }
    code {
      font-family: ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace;
      font-size: 85%;
      background: #f6f8fa;
      border-radius: 6px;
      padding: 0.2em 0.4em;
    }
    pre {
      background: #f6f8fa;
      border-radius: 6px;
      padding: 16px;
      overflow: auto;
      line-height: 1.45;
      margin-bottom: 16px;
    }
    pre code { background: none; padding: 0; font-size: 100%; }
    blockquote {
      margin: 0 0 16px;
      padding: 0 1em;
      color: #57606a;
      border-left: 0.25em solid #d0d7de;
    }
    table { border-collapse: collapse; width: 100%; margin-bottom: 16px; }
    th, td { border: 1px solid #d0d7de; padding: 6px 13px; }
    th { background: #f6f8fa; font-weight: 600; }
    tr:nth-child(even) { background: #f6f8fa; }
    img { max-width: 100%; height: auto; }
    hr { border: none; border-top: 1px solid #d0d7de; margin: 24px 0; }
    ul, ol { padding-left: 2em; margin-bottom: 16px; }
    li { margin-bottom: 4px; }
    input[type="checkbox"] { margin-right: 6px; }
  </style>
</head>
<body>
  <div class="container">
    ${bodyHtml}
  </div>
</body>
</html>`;
}

