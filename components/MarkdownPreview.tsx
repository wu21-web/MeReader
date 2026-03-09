"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkFrontmatter from "remark-frontmatter";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github.css";

interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

// Extend the default sanitize schema to allow class attributes (needed for
// syntax highlighting and shields.io badge HTML), and common inline styles.
const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    "*": [
      ...(defaultSchema.attributes?.["*"] ?? []),
      "className",
      "class",
      "align",
      "width",
      "height",
      "style",
    ],
    img: [
      ...(defaultSchema.attributes?.["img"] ?? []),
      "src",
      "alt",
      "title",
      "width",
      "height",
    ],
    a: [
      ...(defaultSchema.attributes?.["a"] ?? []),
      "href",
      "title",
      "target",
      "rel",
    ],
    input: ["type", "checked", "disabled"],
    th: ["align"],
    td: ["align"],
    code: ["className", "class"],
  },
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    "details",
    "summary",
    "sup",
    "sub",
    "del",
    "ins",
    "mark",
    "kbd",
    "small",
    "center",
    "picture",
    "source",
  ],
};

export default function MarkdownPreview({
  content,
  className = "",
}: MarkdownPreviewProps) {
  return (
    <div className={`markdown-body ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkFrontmatter]}
        rehypePlugins={[
          rehypeRaw,
          [rehypeSanitize, sanitizeSchema],
          rehypeHighlight,
        ]}
        components={{
          // Render task list checkboxes correctly
          input({ type, checked, ...props }) {
            if (type === "checkbox") {
              return (
                <input
                  type="checkbox"
                  checked={checked}
                  readOnly
                  className="mr-1 align-middle"
                  {...props}
                />
              );
            }
            return <input type={type} {...props} />;
          },
          // Open external links in new tab safely
          a({ href, children, ...props }) {
            const isExternal =
              href?.startsWith("http://") || href?.startsWith("https://");
            return (
              <a
                href={href}
                rel={isExternal ? "noopener noreferrer" : undefined}
                target={isExternal ? "_blank" : undefined}
                {...props}
              >
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
