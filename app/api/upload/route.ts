import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { createSession, safeSessionPath } from "@/lib/cleanup";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];
    const relPaths = formData.getAll("paths") as string[];

    if (!files.length) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const sessionId = uuidv4();
    createSession(sessionId);

    const uploadedFiles: { name: string; path: string }[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const relPath = relPaths[i] ?? file.name;

      // Only handle markdown files
      if (!relPath.toLowerCase().endsWith(".md")) continue;

      // Normalize relative path — strip any leading slash/dot-dot segments
      const cleanRel = relPath
        .split(/[/\\]/)
        .filter((seg) => seg !== "" && seg !== ".." && seg !== ".")
        .join(path.sep);

      const targetPath = safeSessionPath(sessionId, cleanRel);
      if (!targetPath) continue; // path traversal attempt

      await mkdir(path.dirname(targetPath), { recursive: true });
      const bytes = await file.arrayBuffer();
      await writeFile(targetPath, Buffer.from(bytes));

      uploadedFiles.push({ name: relPath.replace(/\\/g, "/"), path: cleanRel });
    }

    if (!uploadedFiles.length) {
      return NextResponse.json(
        { error: "No markdown files found in the uploaded folder" },
        { status: 400 }
      );
    }

    return NextResponse.json({ sessionId, files: uploadedFiles });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
