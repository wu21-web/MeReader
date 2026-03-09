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
- **Ephemeral Storage** — server-side uploads stored in `tmp_uploads/`; a cron job purges sessions older than **24 hours**
- **Privacy** — client-side-only mode: files are read directly in the browser and never uploaded unless you call the upload API

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | [Next.js 16](https://nextjs.org/) (App Router, TypeScript) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com/) + GitHub Primer-inspired markdown CSS |
| Markdown | `react-markdown`, `remark-gfm`, `remark-frontmatter`, `rehype-raw`, `rehype-sanitize`, `rehype-highlight` |
| PDF | [Playwright](https://playwright.dev/) (Chromium headless) |
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
| `POST` | `/api/export-pdf` | Convert rendered HTML to PDF (requires Playwright) |

## File Cleanup

Uploaded files are stored in `tmp_uploads/<sessionId>/`. The server runs a cron job every hour that deletes any session directory whose `.meta` timestamp is older than 24 hours.

## Project Structure

```
├── app/
│   ├── page.tsx              # Main SPA (upload zone + tab viewer)
│   ├── layout.tsx
│   ├── globals.css           # GitHub Primer-inspired markdown styles
│   └── api/
│       ├── upload/route.ts
│       ├── list-files/route.ts
│       ├── file-content/route.ts
│       └── export-pdf/route.ts
├── components/
│   ├── UploadZone.tsx        # Drag-and-drop folder upload
│   ├── TabBar.tsx            # Multi-tab navigation
│   └── MarkdownPreview.tsx   # GFM renderer
├── lib/
│   ├── cleanup.ts            # Session path helpers + 24-h purge logic
│   └── cronCleanup.ts        # Cron scheduler
└── instrumentation.ts        # Next.js server startup hook (starts cron)
```
