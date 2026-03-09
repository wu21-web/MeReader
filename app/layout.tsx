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
      <body className="antialiased">{children}</body>
    </html>
  );
}
