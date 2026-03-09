import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { safeSessionPath } from "@/lib/cleanup";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId") ?? "";
  const filePath = searchParams.get("path") ?? "";

  if (!sessionId || !filePath) {
    return NextResponse.json(
      { error: "sessionId and path are required" },
      { status: 400 }
    );
  }

  const resolved = safeSessionPath(sessionId, filePath);
  if (!resolved) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  try {
    const content = await readFile(resolved, "utf-8");
    return NextResponse.json({ content });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
