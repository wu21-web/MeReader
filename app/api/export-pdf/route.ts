import { NextRequest, NextResponse } from "next/server";
import { safeSessionPath } from "@/lib/cleanup";

export const runtime = "nodejs";

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

    // Validate session path only when a sessionId + filePath pair is explicitly provided
    if (sessionId && filePath) {
      const resolved = safeSessionPath(sessionId, filePath);
      if (!resolved) {
        return NextResponse.json({ error: "Invalid path" }, { status: 400 });
      }
    }

    // Derive a clean title: use explicit title, or strip folder prefix from filePath, or fall back
    const exportTitle = title
      ? title.replace(/^.*[\/]/, "").replace(/\.md(\s.*)?$/i, "") || title
      : "MeReader Export";
    const fullHtml = buildHtmlPage(html, exportTitle);

    // Try Playwright first (best fidelity)
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const playwright = require("playwright") as {
        chromium?: {
          launch: (options: { headless: boolean }) => Promise<{
            newPage: () => Promise<{
              setContent: (
                html: string,
                options: { waitUntil: "networkidle" }
              ) => Promise<void>;
              pdf: (options: {
                format: "A4";
                printBackground: boolean;
                margin: {
                  top: string;
                  bottom: string;
                  left: string;
                  right: string;
                };
              }) => Promise<Uint8Array>;
            }>;
            close: () => Promise<void>;
          }>;
        };
      };
      const { chromium } = playwright;
      if (!chromium) {
        throw new Error("Playwright chromium runtime is unavailable");
      }
      const browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();

      await page.setContent(fullHtml, { waitUntil: "networkidle" });

      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "20mm", bottom: "20mm", left: "20mm", right: "20mm" },
      });

      await browser.close();

      // Use Buffer.from to get a correctly-sliced copy — pdfBuffer.buffer may be
      // a shared Node.js pool ArrayBuffer with a non-zero byteOffset, which would
      // corrupt the response if passed directly.
      const safeBuffer = Buffer.from(
        pdfBuffer.buffer,
        pdfBuffer.byteOffset,
        pdfBuffer.byteLength
      );

      return new NextResponse(safeBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${encodeURIComponent(
            exportTitle
          )}.pdf"`,
        },
      });
    } catch {
      return NextResponse.json(
        {
          error:
            "PDF generation requires Playwright. Run: npx playwright install chromium",
        },
        { status: 503 }
      );
    }
  } catch (err) {
    console.error("PDF export error:", err);
    return NextResponse.json({ error: "PDF export failed" }, { status: 500 });
  }
}

function buildHtmlPage(bodyHtml: string, title: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
      font-size: 16px;
      line-height: 1.5;
      color: #24292f;
      background: #ffffff;
      padding: 0;
      margin: 0;
    }
    .container { max-width: 900px; margin: 0 auto; padding: 32px; }
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

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
