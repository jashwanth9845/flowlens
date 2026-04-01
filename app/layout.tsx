import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FlowLens — Visual Prototype & Flow Builder",
  description: "Connect Figma, detect interactive elements, build visual prototype flows.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-zinc-950 text-zinc-200 antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
