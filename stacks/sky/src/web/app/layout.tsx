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
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${inter.className} min-h-screen transition-colors duration-300`}
      >
        <header
          className="border-b backdrop-blur-lg sticky top-0 z-50"
          style={{
            borderColor: "var(--sky-border)",
            backgroundColor: "var(--sky-header-bg)",
          }}
        >
          <div className="max-w-5xl mx-auto flex items-center justify-between px-5 h-12">
            <div className="flex items-center gap-2">
              <span className="text-base">✦</span>
              <span className="text-sm font-semibold tracking-tight">
                Skytoday
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span
                className="text-[11px] uppercase tracking-widest font-medium hidden sm:block"
                style={{ color: "var(--sky-muted)" }}
              >
                Pathfinder
              </span>
              {/* Theme toggle */}
              <button
                id="theme-toggle"
                className="w-7 h-7 rounded-md border flex items-center justify-center cursor-pointer transition-colors sky-theme-btn"
                aria-label="Toggle theme"
              >
                <svg
                  id="theme-icon"
                  className="w-3.5 h-3.5"
                  style={{ color: "var(--sky-muted)" }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              </button>
            </div>
          </div>
        </header>
        <main className="max-w-5xl mx-auto px-5 py-6">
          {children}
        </main>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </body>
    </html>
  );
}

const THEME_SCRIPT = `
(function() {
  var html = document.documentElement;
  var btn = document.getElementById('theme-toggle');
  var icon = document.getElementById('theme-icon');
  if (!btn || !icon) return;

  var sunPath = 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z';
  var moonPath = 'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z';

  function setTheme(dark) {
    html.classList.toggle('dark', dark);
    html.classList.toggle('light', !dark);
    icon.innerHTML = '<path strokeLinecap="round" strokeLinejoin="round" d="' + (dark ? sunPath : moonPath) + '" />';
    localStorage.setItem('skytoday-theme', dark ? 'dark' : 'light');
  }

  var dark = localStorage.getItem('skytoday-theme') !== 'light';
  setTheme(dark);

  btn.addEventListener('click', function() {
    dark = !dark;
    setTheme(dark);
  });
})();
`;
