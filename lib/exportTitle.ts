/**
 * Derives a clean export title from a possibly path-like input.
 * Removes directory parts and strips trailing ".md" (case-insensitive)
 * when followed by nothing or whitespace.
 */
export function deriveExportTitle(title?: string): string {
  if (!title) {
    return "MeReader Export";
  }

  const lastSlash = Math.max(title.lastIndexOf("/"), title.lastIndexOf("\\"));
  const fileName = lastSlash >= 0 ? title.slice(lastSlash + 1) : title;

  // Keep old behavior for ".md" handling: remove trailing ".md" or ".md" followed by whitespace suffix.
  // Note: Path separator handling above was intentionally expanded to also strip Windows-style "\".
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

/**
 * Escapes HTML special characters to prevent XSS when embedding user content.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Sanitizes a string for safe use as a file name.
 * Replaces characters forbidden in Windows/Linux file systems with underscores.
 */
export function sanitizeFileName(input: string, fallback: string = "download"): string {
  const sanitized = input.replace(/[\\/:*?"<>|]+/g, "_").trim();
  return sanitized === "" ? fallback : sanitized;
}