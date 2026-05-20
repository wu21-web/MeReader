export function deriveExportTitle(title?: string): string {
  if (!title) {
    return "MeReader Export";
  }

  const lastSlash = Math.max(title.lastIndexOf("/"), title.lastIndexOf("\\"));
  const fileName = lastSlash >= 0 ? title.slice(lastSlash + 1) : title;

  const lower = fileName.toLowerCase();
  const mdIndex = lower.lastIndexOf(".md");
  if (mdIndex === -1) {
    return fileName || title;
  }

  const suffix = fileName.slice(mdIndex + 3);
  if (suffix.length === 0 || suffix[0].trim() === "") {
    const stripped = fileName.slice(0, mdIndex);
    return stripped || title;
  }

  return fileName || title;
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function sanitizeFileName(input: string, fallback: string = "download"): string {
  const sanitized = input.replace(/[\\/:*?"<>|]+/g, "_").trim();
  return sanitized === "" ? fallback : sanitized;
}