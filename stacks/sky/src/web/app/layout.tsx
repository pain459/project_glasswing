import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Skytoday — Pathfinder Sky",
  description: "Personal Astronomy Intelligence Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-gray-950 text-gray-100">
        <nav className="border-b border-gray-800 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <h1 className="text-xl font-semibold tracking-tight">
              🌌 Skytoday
            </h1>
            <span className="text-sm text-gray-500">Pathfinder Sky</span>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-6 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
