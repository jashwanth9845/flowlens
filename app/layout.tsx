import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FlowLens",
  description: "Visual prototype & flow builder for Figma",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#0c0c0d] text-zinc-300 antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
