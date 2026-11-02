import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Skytoday",
  description: "Personal Astronomy Intelligence Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.className} min-h-screen bg-[#0a0e17] text-gray-100 antialiased`}
      >
        <header className="border-b border-white/5 bg-[#0a0e17]/80 backdrop-blur-lg sticky top-0 z-50">
          <div className="max-w-5xl mx-auto flex items-center justify-between px-5 h-12">
            <div className="flex items-center gap-2">
              <span className="text-base">✦</span>
              <span className="text-sm font-semibold tracking-tight text-gray-200">
                Skytoday
              </span>
            </div>
            <span className="text-[11px] text-gray-600 uppercase tracking-widest font-medium">
              Pathfinder
            </span>
          </div>
        </header>
        <main className="max-w-5xl mx-auto px-5 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
