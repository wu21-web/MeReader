# MeReader

**Multi-Tab GitHub-Flavored Markdown (GFM) Live Previewer & PDF Exporter**

Upload a local folder of `.md` files and preview them instantly with 1:1 GitHub visual parity — then export any tab to a high-fidelity PDF.

## Features

- **Folder Upload** — drag-and-drop or browse to upload any folder; all `.md` files are opened as tabs
- **Multi-Tab SPA** — navigate between files with a browser-style tab bar; close individual tabs
- **GitHub-Style Rendering** — full GFM support via `react-markdown` + `remark-gfm`:
  - Tables, task-list checkboxes, strikethrough, autolinks
  - Fenced code blocks with syntax highlighting (`highlight.js`)
  - Jekyll/front-matter stripping (`remark-frontmatter`)
  - Raw HTML passthrough (e.g. badges, `<details>`, custom fonts)
  - Sanitised with `rehype-sanitize` to prevent XSS
- **shields.io badges** render correctly via HTML passthrough
- **Export to PDF** — headless-browser PDF via [Playwright](https://playwright.dev/) preserving all CSS styles
- **API Cross-platform Support** unlimited api calls to converting .md files
- **Ephemeral Storage** — server-side uploads stored in `/tmp/`; a cron job purges sessions older than **24 hours**
- **Privacy** — client-side-only mode: files are read directly in the browser and never uploaded unless you call the upload API

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | [Next.js 16](https://nextjs.org/) (App Router, TypeScript) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com/) + GitHub Primer-inspired markdown CSS |
| Markdown | `react-markdown`, `remark-gfm`, `remark-frontmatter`, `rehype-raw`, `rehype-sanitize`, `rehype-highlight` |
| PDF/PNG Rendering | `puppeteer-core` + `@sparticuz/chromium` |
| Cleanup | `node-cron` — hourly sweep of sessions older than 24 h |

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. (Optional) Install Playwright browser for PDF export
npx playwright install chromium

# 3. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production build

```bash
npm run build
npm start
```

## API Routes

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/upload` | Upload folder files (multipart/form-data: `files[]` + `paths[]`) |
| `GET` | `/api/list-files?sessionId=<id>` | List `.md` files in a session |
| `GET` | `/api/file-content?sessionId=<id>&path=<rel>` | Fetch file contents |
| `POST` | `/api/export-pdf` | Convert rendered HTML to PDF |
| `POST` | `/api/export-png-pages` | Convert rendered HTML to a ZIP of page-sliced PNGs |
| `POST` | `/api/convert-md` | Upload one `.md` file and export directly to PDF or PNG |

### `POST /api/convert-md`

Upload a single markdown file and export in one request. This route is designed for browser clients, `curl`, Python scripts, CI jobs, and other HTTP clients.

Request (`multipart/form-data`):

- `file` (required): one `.md` file, max 5 MB
- `format` (required): `pdf` or `png`
- `pngMode` (optional): `pages` (default, returns `.zip`) or `single` (returns one `.png`)

Response content types:

- `format=pdf` -> `application/pdf`
- `format=png&pngMode=pages` -> `application/zip`
- `format=png&pngMode=single` -> `image/png`

#### curl examples
You should replace 'your-domain.com' to your deployment server or a vercel server (me-reader-gray.vercel.app)
```bash
# PDF
curl -L -X POST "https://your-domain.com/api/convert-md" \
  -F "file=@README.md" \
  -F "format=pdf" \
  -o README.pdf

# PNG pages (zip)
curl -L -X POST "https://your-domain.com/api/convert-md" \
  -F "file=@README.md" \
  -F "format=png" \
  -F "pngMode=pages" \
  -o README_png_pages.zip

# Single PNG
curl -L -X POST "https://your-domain.com/api/convert-md" \
  -F "file=@README.md" \
  -F "format=png" \
  -F "pngMode=single" \
  -o README.png
```

#### Python example

```python
import requests

url = "https://your-domain.com/api/convert-md"
with open("README.md", "rb") as f:
    files = {"file": ("README.md", f, "text/markdown")}
    data = {"format": "pdf"}
    response = requests.post(url, files=files, data=data, timeout=120)
    response.raise_for_status()

with open("README.pdf", "wb") as out:
    out.write(response.content)
```
#### HTML Example

There is a renderer component in MarkdownPreview.tsx. Below is an example.
```
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Live MD Renderer</title>
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <style>
    body {
      margin: 0;
      background: #f6f8fa;
      font-family: Georgia, "Times New Roman", serif;
    }

    #preview {
      max-width: 900px;
      margin: 32px auto;
      padding: 24px 28px;
      background: #ffffff;
      border: 1px solid #d0d7de;
      border-radius: 10px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <div id="preview">Loading rendered.md...</div>

  <script>
    const preview = document.getElementById("preview");
    let lastText = "";

    async function renderMarkdown() {
      try {
        const response = await fetch("/rendered.md?t=" + Date.now(), { cache: "no-store" });
        if (!response.ok) throw new Error("Cannot load rendered.md");

        const markdown = await response.text();
        if (markdown !== lastText) {
          preview.innerHTML = marked.parse(markdown);
          lastText = markdown;
        }
      } catch (error) {
        preview.textContent = "Error: " + error.message;
      }
    }

    renderMarkdown();
    setInterval(renderMarkdown, 1000);
  </script>
</body>
</html>
```
### HTTPS Note

The route is standard HTTP and works over HTTPS automatically when deployed behind TLS (for example Vercel, Nginx, Cloudflare, or other reverse proxies). Use `https://` URLs in Python/curl clients in production.

## File Cleanup

Uploaded files are stored in `/tmp/<sessionId>/`. The server runs a cron job every hour that deletes any session directory whose `.meta` timestamp is older than 24 hours.

## Project Structure
See the _project_tree.txt_ for update versions of the project structure.
