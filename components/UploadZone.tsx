"use client";

import { useRef } from "react";

interface UploadZoneProps {
  onFilesLoaded: (
    files: { name: string; content: string }[]
  ) => void;
}

export default function UploadZone({ onFilesLoaded }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (fileList: FileList) => {
    const mdFiles: { name: string; content: string }[] = [];

    for (const file of Array.from(fileList)) {
      const rel: string =
        (file as File & { webkitRelativePath?: string }).webkitRelativePath ||
        file.name;

      if (!rel.toLowerCase().endsWith(".md")) continue;

      const content = await file.text();
      mdFiles.push({ name: rel, content });
    }

    if (mdFiles.length > 0) {
      onFilesLoaded(mdFiles);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.items) {
      const files = Array.from(e.dataTransfer.items)
        .filter((i) => i.kind === "file")
        .map((i) => i.getAsFile()!)
        .filter(Boolean);

      const dt = new DataTransfer();
      files.forEach((f) => dt.items.add(f));
      handleFiles(dt.files);
    } else {
      handleFiles(e.dataTransfer.files);
    }
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      onClick={() => inputRef.current?.click()}
      className="cursor-pointer border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-12 text-center hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors"
    >
      <input
        ref={inputRef}
        type="file"
        // @ts-expect-error – webkitdirectory is non-standard HTML attribute
        webkitdirectory=""
        directory=""
        multiple
        accept=".md"
        className="hidden"
        onChange={(e) => {
          if (e.target.files) handleFiles(e.target.files);
        }}
      />
      <div className="flex flex-col items-center gap-3">
        <svg
          className="w-12 h-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"
          />
        </svg>
        <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
          Drop a folder or click to browse
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          All <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">.md</code> files inside the folder will be opened as tabs
        </p>
      </div>
    </div>
  );
}
