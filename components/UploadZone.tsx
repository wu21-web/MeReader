"use client";

import { useRef } from "react";

interface UploadZoneProps {
  onFilesLoaded: (
    files: { name: string; content: string }[]
  ) => void;
}

export default function UploadZone({ onFilesLoaded }: UploadZoneProps) {
  const folderInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      className="cursor-pointer border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-12 text-center hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors"
    >
      <input
        ref={folderInputRef}
        type="file"
        // @ts-expect-error – webkitdirectory is non-standard HTML attribute
        webkitdirectory=""
        directory=""
        multiple
        accept=".md"
        className="hidden"
        onChange={(e) => {
          if (e.target.files) handleFiles(e.target.files);
          e.currentTarget.value = "";
        }}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept=".md"
        className="hidden"
        onChange={(e) => {
          if (e.target.files) handleFiles(e.target.files);
          e.currentTarget.value = "";
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
          Drop markdown files or choose what to upload
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Upload a folder of markdown files or a single <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">.md</code> file.
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              folderInputRef.current?.click();
            }}
            className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Upload Folder
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            className="px-4 py-2 text-sm font-medium bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg transition-colors"
          >
            Upload .md File
          </button>
        </div>
      </div>
    </div>
  );
}
