"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import UploadZone from "@/components/UploadZone";
import TabBar from "@/components/TabBar";
import MarkdownPreview from "@/components/MarkdownPreview";

interface MarkdownTab {
  id: string;
  name: string;
  content: string;
}

function makeUniqueName(baseName: string, existingNames: Set<string>): string {
  if (!existingNames.has(baseName)) {
    return baseName;
  }

  let count = 2;
  let candidate = `${baseName} (${count})`;
  while (existingNames.has(candidate)) {
    count += 1;
    candidate = `${baseName} (${count})`;
  }
  return candidate;
}

export default function Home() {
  const [tabs, setTabs] = useState<MarkdownTab[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const addFolderInputRef = useRef<HTMLInputElement>(null);
  const addFileInputRef = useRef<HTMLInputElement>(null);

  // Sync dark mode state with system preference and apply class to <html>
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    // Read current preference; the inline script may have already set the class
    const prefersDark = document.documentElement.classList.contains("dark") || mq.matches;
    setIsDark(prefersDark);

    const handler = (e: MediaQueryListEvent) => {
      // Only follow system if not manually overridden
      if (!document.documentElement.dataset.themeOverride) {
        setIsDark(e.matches);
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.classList.toggle("light", !isDark);
  }, [isDark]);

  const toggleDark = () => {
    setIsDark((prev) => {
      // Mark as manually overridden so system changes don't override it
      document.documentElement.dataset.themeOverride = "true";
      return !prev;
    });
  };

  // Auto-select the first tab whenever tabs exist but nothing is active.
  // This handles both initial load and edge cases where activeId becomes stale.
  useEffect(() => {
    if (!activeId && tabs.length > 0) {
      setActiveId(tabs[0].id);
    }
  }, [tabs, activeId]);

  const handleFilesLoaded = useCallback(
    (files: { name: string; content: string }[]) => {
      setTabs((prev) => {
        const next = [...prev];
        const existingNames = new Set(prev.map((t) => t.name));

        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const uniqueName = makeUniqueName(file.name, existingNames);
          existingNames.add(uniqueName);
          const tabId = `${Date.now()}-${Math.random()}-${i}`;

          next.push({
            id: tabId,
            name: uniqueName,
            content: file.content,
          });
        }

        return next;
      });
    },
    []
  );

  const handleAddFiles = useCallback(async (fileList: FileList) => {
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
      handleFilesLoaded(mdFiles);
    }
  }, [handleFilesLoaded]);

  const closeTab = useCallback(
    (id: string) => {
      setTabs((prev) => {
        const idx = prev.findIndex((t) => t.id === id);
        const next = prev.filter((t) => t.id !== id);
        if (activeId === id && next.length > 0) {
          setActiveId(next[Math.max(0, idx - 1)].id);
        } else if (next.length === 0) {
          setActiveId("");
        }
        return next;
      });
    },
    [activeId]
  );

  const activeTab = tabs.find((t) => t.id === activeId);

  const handleExportPdf = async () => {
    if (!activeTab || !previewRef.current) return;
    setExporting(true);
    setExportError(null);
    try {
      const markdownNode = previewRef.current.querySelector(".markdown-body");
      if (!(markdownNode instanceof HTMLElement)) {
        setExportError("Unable to export: active markdown preview not found");
        return;
      }

      const html = markdownNode.innerHTML;
      const res = await fetch("/api/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          html,
          filePath: activeTab.name,
          title: activeTab.name,
        }),
      });

      if (!res.ok) {
        const contentType = res.headers.get("content-type") || "";
        let message = "PDF export failed";

        const text = await res.text();
        const looksJson =
          contentType.includes("application/json") || text.trim().startsWith("{");

        if (looksJson) {
          try {
            const data = JSON.parse(text) as { error?: string };
            message = data.error ?? message;
          } catch {
            message = text.trim().startsWith("<")
              ? "PDF export failed on server"
              : text.slice(0, 240) || message;
          }
        } else {
          // If server returned an HTML error page, avoid dumping markup to the UI.
          message = text.trim().startsWith("<")
            ? "PDF export failed on server"
            : text.slice(0, 240) || message;
        }

        setExportError(message);
        return;
      }

      const okContentType = res.headers.get("content-type") || "";
      if (!okContentType.includes("application/pdf")) {
        const text = await res.text();
        const message = text.trim().startsWith("<")
          ? "PDF export failed on server"
          : text.slice(0, 240) || "PDF export failed";
        setExportError(message);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${activeTab.name.replace(/[/\\]/g, "_")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(String(err));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-gray-900">
      <input
        ref={addFolderInputRef}
        type="file"
        // @ts-expect-error - webkitdirectory is non-standard HTML attribute
        webkitdirectory=""
        directory=""
        multiple
        accept=".md"
        className="hidden"
        onChange={(e) => {
          if (e.target.files) handleAddFiles(e.target.files);
          e.currentTarget.value = "";
        }}
      />
      <input
        ref={addFileInputRef}
        type="file"
        accept=".md"
        className="hidden"
        onChange={(e) => {
          if (e.target.files) handleAddFiles(e.target.files);
          e.currentTarget.value = "";
        }}
      />

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-800">
        <div className="flex items-center gap-2">
          <svg
            className="w-6 h-6 text-white"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
          </svg>
          <span className="text-white font-semibold text-lg">MeReader</span>
          <span className="text-gray-400 text-sm hidden sm:inline">
            GFM Live Previewer &amp; PDF Exporter
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Dark mode toggle – always visible */}
          <button
            onClick={toggleDark}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            className="flex items-center justify-center w-8 h-8 text-gray-300 hover:text-white rounded transition-colors"
          >
            {isDark ? (
              /* Sun icon – click to go light */
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z"
                />
              </svg>
            ) : (
              /* Moon icon – click to go dark */
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z"
                />
              </svg>
            )}
          </button>

          {tabs.length > 0 && (
            <>
              <button
                onClick={handleExportPdf}
                disabled={!activeTab || exporting}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded transition-colors"
              >
                {exporting ? (
                  <>
                    <svg
                      className="w-4 h-4 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8H4z"
                      />
                    </svg>
                    Exporting…
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                      />
                    </svg>
                    Export PDF
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setTabs([]);
                  setActiveId("");
                }}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-600 hover:bg-gray-500 text-white rounded transition-colors"
              >
                Close All
              </button>
            </>
          )}
        </div>
      </header>

      {exportError && (
        <div className="px-4 py-2 text-sm bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border-b border-red-200 dark:border-red-800 flex items-center justify-between">
          <span>⚠ {exportError}</span>
          <button
            onClick={() => setExportError(null)}
            className="ml-4 text-red-500 hover:text-red-700"
          >
            ✕
          </button>
        </div>
      )}

      {tabs.length === 0 ? (
        /* Upload screen */
        <main className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="w-full max-w-xl">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 text-center">
              MeReader
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-center mb-8">
              Upload a folder of{" "}
              <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">
                .md
              </code>{" "}
              files or a single{" "}
              <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">
                .md
              </code>{" "}
              file to preview with GitHub-style rendering.
            </p>
            <UploadZone onFilesLoaded={handleFilesLoaded} />
            <p className="text-xs text-gray-400 text-center mt-4">
              Files are read locally in your browser. Server upload is only
              used when exporting to PDF.
            </p>
          </div>
        </main>
      ) : (
        /* Tab + preview screen */
        <div className="flex flex-col flex-1 overflow-hidden">
          <TabBar
            tabs={tabs}
            activeId={activeId}
            onSelect={setActiveId}
            onClose={closeTab}
            onAddFolder={() => addFolderInputRef.current?.click()}
            onAddFile={() => addFileInputRef.current?.click()}
          />
          <div className="flex-1 overflow-y-auto">
            <div
              ref={previewRef}
              className="max-w-4xl mx-auto px-6 py-8"
            >
              {activeTab ? (
                <MarkdownPreview
                  key={activeTab.id}
                  content={activeTab.content}
                />
              ) : (
                <p className="text-gray-400 text-center mt-16">
                  Select a tab to preview
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
