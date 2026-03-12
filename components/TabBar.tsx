"use client";

import { useState } from "react";

interface Tab {
  id: string;
  name: string;
}

interface TabBarProps {
  tabs: Tab[];
  activeId: string;
  batchSidebarOpen: boolean;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onToggleBatchSidebar: () => void;
  onAddFolder: () => void;
  onAddFile: () => void;
}

export default function TabBar({
  tabs,
  activeId,
  batchSidebarOpen,
  onSelect,
  onClose,
  onToggleBatchSidebar,
  onAddFolder,
  onAddFile,
}: TabBarProps) {
  const [showAddMenu, setShowAddMenu] = useState(false);

  return (
    <div className="flex items-end border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 min-h-[42px]">
      <div className="flex items-end overflow-x-auto flex-1 min-w-0">
        {tabs.map((tab) => {
          const isActive = tab.id === activeId;
          const shortName = tab.name.split(/[\\/]/).pop() ?? tab.name;

          return (
            <div
              key={tab.id}
              title={tab.name}
              className={`flex items-center gap-1 px-4 py-2 text-sm border-r border-gray-200 dark:border-gray-700 cursor-pointer select-none shrink-0 max-w-[200px] group
                ${
                  isActive
                    ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-medium border-t-2 border-t-blue-500"
                    : "bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
            >
              <span
                className="truncate flex-1"
                onClick={() => onSelect(tab.id)}
              >
                {shortName}
              </span>
              <button
                aria-label={`Close ${shortName}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onClose(tab.id);
                }}
                className="ml-1 rounded hover:bg-red-100 dark:hover:bg-red-900 text-gray-400 hover:text-red-600 transition-colors flex-shrink-0 w-4 h-4 flex items-center justify-center"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex items-center shrink-0 border-l border-gray-200 dark:border-gray-700 pr-1">
        <button
          type="button"
          aria-label={batchSidebarOpen ? "Hide batch sidebar" : "Show batch sidebar"}
          title={batchSidebarOpen ? "Hide batch sidebar" : "Show batch sidebar"}
          onClick={onToggleBatchSidebar}
          className={`m-1 w-8 h-8 flex items-center justify-center rounded border transition-colors ${
            batchSidebarOpen
              ? "border-blue-500 text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30"
              : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        <div className="relative">
        <button
          type="button"
          aria-label="Add markdown tab"
          title="Add markdown tab"
          onClick={() => setShowAddMenu((prev) => !prev)}
          className="m-1 w-8 h-8 flex items-center justify-center rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 5v14m-7-7h14"
            />
          </svg>
        </button>

        {showAddMenu && (
          <div className="absolute right-0 top-11 z-20 w-44 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg p-1">
            <button
              type="button"
              onClick={() => {
                setShowAddMenu(false);
                onAddFolder();
              }}
              className="w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-100"
            >
              Open Folder
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddMenu(false);
                onAddFile();
              }}
              className="w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-100"
            >
              Open .md File
            </button>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
