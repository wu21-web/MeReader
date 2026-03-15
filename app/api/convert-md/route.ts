import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import { escapeHtml } from "@/lib/exportTitle";
import { deriveExportTitle, escapeHtml, sanitizeFileName } from "@/lib/exportTitle";

export const runtime = "nodejs";
export const maxDuration = 60;

const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;
const MAX_FILE_BYTES = 5 * 1024 * 1024;

type OutputFormat = "pdf" | "png";
type PngMode = "pages" | "single";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    const format = String(form.get("format") ?? "pdf").toLowerCase() as OutputFormat;
    const pngMode = String(form.get("pngMode") ?? "pages").toLowerCase() as PngMode;

    if (!(file instanceof File)) {
      return jsonError("file is required", 400);
    }

    if (!file.name.toLowerCase().endsWith(".md")) {
      return jsonError("Only .md files are supported", 400);
    }

    if (file.size > MAX_FILE_BYTES) {
      return jsonError("File too large (max 5 MB)", 413);
    }

    if (format !== "pdf" && format !== "png") {
      return jsonError("format must be either 'pdf' or 'png'", 400);
    }

    if (pngMode !== "pages" && pngMode !== "single") {
      return jsonError("pngMode must be either 'pages' or 'single'", 400);
    }

    const markdown = await file.text();
    const sanitizedTitle = sanitizeFileName(deriveExportTitle(file.name));
    const exportTitle = sanitizedTitle || "mereader_export";

    const htmlBody = renderMarkdownToSafeHtml(markdown);
    const fullHtml = buildHtmlPage(htmlBody, exportTitle);

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

    try {
      const page = await browser.newPage();
      await page.setJavaScriptEnabled(false);
      await page.setViewport({
        width: A4_WIDTH_PX,
        height: A4_HEIGHT_PX,
        deviceScaleFactor: 2,
      });
      await page.setContent(fullHtml, { waitUntil: "networkidle0" });
      await page.evaluate(async () => {
        await document.fonts.ready;
      });

      if (format === "pdf") {
        const pdfBuffer = await page.pdf({
          format: "A4",
          printBackground: true,
          margin: { top: "20mm", bottom: "20mm", left: "20mm", right: "20mm" },
        });

        return new NextResponse(new Blob([Buffer.from(pdfBuffer)], { type: "application/pdf" }), {
          status: 200,
          headers: {
            ...corsHeaders(),
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${encodeURIComponent(exportTitle)}.pdf"`,
          },
        });
      }

      if (pngMode === "single") {
        const png = (await page.screenshot({
          type: "png",
          fullPage: true,
        })) as Buffer;

        return new NextResponse(new Blob([Buffer.from(png)], { type: "image/png" }), {
          status: 200,
          headers: {
            ...corsHeaders(),
            "Content-Type": "image/png",
            "Content-Disposition": `attachment; filename="${encodeURIComponent(
              exportTitle
            )}.png"`,
          },
        });
      }

      const totalHeight = await page.evaluate(() => {
        return Math.max(
          document.body.scrollHeight,
          document.documentElement.scrollHeight
        );
      });

      const pageCount = Math.max(1, Math.ceil(totalHeight / A4_HEIGHT_PX));
      const zip = new JSZip();

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

        zip.file(`${exportTitle}_page_${i + 1}.png`, png);
      }

      const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
      return new NextResponse(new Blob([Buffer.from(zipBuffer)], { type: "application/zip" }), {
        status: 200,
        headers: {
          ...corsHeaders(),
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="${encodeURIComponent(
            exportTitle
          )}_png_pages.zip"`,
        },
      });
    } finally {
      await browser.close();
    }
  } catch (err) {
    console.error("convert-md error:", err);
    return jsonError("Conversion failed", 500);
  }
}

function renderMarkdownToSafeHtml(markdown: string): string {
  const rawHtml = marked.parse(markdown, {
    gfm: true,
    breaks: false,
  }) as string;

  return sanitizeHtml(rawHtml, {
    allowedTags: [
      "a",
      "abbr",
      "b",
      "blockquote",
      "br",
      "code",
      "del",
      "details",
      "div",
      "em",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "hr",
      "i",
      "img",
      "input",
      "li",
      "ol",
      "p",
      "pre",
      "s",
      "small",
      "span",
      "strong",
      "sub",
      "summary",
      "sup",
      "table",
      "tbody",
      "td",
      "th",
      "thead",
      "tr",
      "ul",
    ],
    allowedAttributes: {
      a: ["href", "name", "target", "rel", "title"],
      img: ["src", "alt", "title", "width", "height"],
      code: ["class"],
      pre: ["class"],
      span: ["class"],
      div: ["class"],
      input: ["type", "checked", "disabled"],
      th: ["align"],
      td: ["align"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    disallowedTagsMode: "discard",
  });
}

function buildHtmlPage(bodyHtml: string, title: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <style>
    @import url("https://fonts.googleapis.com/css2?family=Noto+Color+Emoji&family=Noto+Sans:wght@400;600;700&family=Noto+Sans+JP:wght@400;600;700&family=Noto+Sans+KR:wght@400;600;700&family=Noto+Sans+SC:wght@400;600;700&display=swap");
    *, *::before, *::after { box-sizing: border-box; }
    body {
      font-family: "Noto Sans", "Noto Sans SC", "Noto Sans JP", "Noto Sans KR", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji";
      font-size: 16px;
      line-height: 1.55;
      color: #24292f;
      background: #ffffff;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      padding: 32px;
    }
    h1, h2, h3, h4, h5, h6 {
      font-weight: 600;
      line-height: 1.25;
      margin-top: 24px;
      margin-bottom: 16px;
    }
    h1 { font-size: 2em; border-bottom: 1px solid #d0d7de; padding-bottom: 0.3em; }
    h2 { font-size: 1.5em; border-bottom: 1px solid #d0d7de; padding-bottom: 0.3em; }
    h3 { font-size: 1.25em; }
    p { margin-top: 0; margin-bottom: 16px; }
    a { color: #0969da; text-decoration: none; }
    code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
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
    pre code {
      background: none;
      padding: 0;
      font-size: 100%;
    }
    blockquote {
      margin: 0 0 16px;
      padding: 0 1em;
      color: #57606a;
      border-left: 0.25em solid #d0d7de;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin-bottom: 16px;
      font-size: 14px;
    }
    th, td {
      border: 1px solid #d0d7de;
      padding: 6px 13px;
    }
    th {
      background: #f6f8fa;
      font-weight: 600;
    }
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

function jsonError(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    {
      status,
      headers: corsHeaders(),
    }
  );
}

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}


