import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FlowLens",
  description:
    "An open source workspace for turning Figma screens and manual screenshots into searchable, shareable prototype flows.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#08111f] text-white antialiased">{children}</body>
    </html>
  );
}
