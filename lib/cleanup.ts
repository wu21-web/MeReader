import fs from "fs";
import path from "path";

export const UPLOAD_DIR = "/tmp";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function ensureUploadDir(): void {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

export function cleanupExpiredSessions(): void {
  ensureUploadDir();
  const now = Date.now();
  const entries = fs.readdirSync(UPLOAD_DIR, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const sessionPath = path.join(UPLOAD_DIR, entry.name);
    const metaPath = path.join(sessionPath, ".meta");

    let uploadedAt: number | null = null;
    if (fs.existsSync(metaPath)) {
      try {
        const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
        uploadedAt = meta.uploadedAt ?? null;
      } catch {
      }
    }

    if (uploadedAt === null) {
      try {
        uploadedAt = fs.statSync(sessionPath).mtimeMs;
      } catch {
        continue;
      }
    }

    if (now - uploadedAt > MAX_AGE_MS) {
      fs.rmSync(sessionPath, { recursive: true, force: true });
    }
  }
}

export function createSession(sessionId: string): string {
  ensureUploadDir();
  const sessionPath = path.join(UPLOAD_DIR, sessionId);
  fs.mkdirSync(sessionPath, { recursive: true });

  const meta = { uploadedAt: Date.now() };
  fs.writeFileSync(path.join(sessionPath, ".meta"), JSON.stringify(meta));

  return sessionId;
}

export function safeSessionPath(
  sessionId: string,
  relativePath: string
): string | null {
  const sanitisedSession = path.basename(sessionId);
  const sessionDir = path.join(UPLOAD_DIR, sanitisedSession);
  const target = path.resolve(sessionDir, relativePath);

  if (!target.startsWith(sessionDir + path.sep) && target !== sessionDir) {
    return null;
  }
  return target;
}
