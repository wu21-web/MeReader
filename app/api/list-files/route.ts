import { NextRequest, NextResponse } from "next/server";
import { readdir } from "fs/promises";
import path from "path";
import { UPLOAD_DIR, safeSessionPath } from "@/lib/cleanup";
import fs from "fs";

async function collectMarkdownFiles(
  dir: string,
  baseDir: string
): Promise<string[]> {
  const result: string[] = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return result;
  }

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue; // skip hidden / meta files
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = await collectMarkdownFiles(full, baseDir);
      result.push(...nested);
    } else if (entry.name.toLowerCase().endsWith(".md")) {
      result.push(path.relative(baseDir, full).replace(/\\/g, "/"));
    }
  }
  return result;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId") ?? "";

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }

  const sessionDir = safeSessionPath(sessionId, ".");
  if (!sessionDir || !fs.existsSync(sessionDir)) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const files = await collectMarkdownFiles(
    path.join(UPLOAD_DIR, path.basename(sessionId)),
    path.join(UPLOAD_DIR, path.basename(sessionId))
  );

  return NextResponse.json({ files });
}
