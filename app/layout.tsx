import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MeReader — GFM Live Previewer & PDF Exporter",
  description:
    "Upload a folder of Markdown files and get real-time GitHub-Flavored Markdown preview with PDF export.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Apply dark class before first paint to avoid flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(window.matchMedia('(prefers-color-scheme: dark)').matches){document.documentElement.classList.add('dark')}}catch(e){}})()`,
          }}
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
