FROM nginx:1.27-alpine

# Copy docs
COPY docs/ /usr/share/nginx/html/

# Install marked.js for client-side markdown rendering
RUN apk add --no-cache curl && \
    cat > /usr/share/nginx/html/index.html << 'INDEX'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Glasswing Wiki</title>
  <style>
    :root {
      --bg: #0b0d13;
      --surface: #131620;
      --card: #1a1e2e;
      --border: #2a2f45;
      --text: #e2e4ed;
      --muted: #8b90a5;
      --accent: #6c8cff;
      --green: #34d399;
      --cyan: #22d3ee;
      --purple: #a78bfa;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.7;
      display: flex;
      min-height: 100vh;
    }
    /* Sidebar */
    .sidebar {
      width: 260px;
      background: var(--surface);
      border-right: 1px solid var(--border);
      padding: 1.5rem 0;
      position: fixed;
      top: 0;
      left: 0;
      bottom: 0;
      overflow-y: auto;
      flex-shrink: 0;
    }
    .sidebar h1 {
      font-size: 1.1rem;
      padding: 0 1.25rem 1rem;
      border-bottom: 1px solid var(--border);
      margin-bottom: 0.75rem;
      color: var(--accent);
    }
    .sidebar a {
      display: block;
      padding: 0.35rem 1.25rem;
      color: var(--muted);
      text-decoration: none;
      font-size: 0.9rem;
      border-left: 2px solid transparent;
      transition: all 0.15s;
    }
    .sidebar a:hover, .sidebar a.active {
      color: var(--accent);
      border-left-color: var(--accent);
      background: rgba(108,140,255,0.05);
    }
    .sidebar .section-title {
      padding: 0.75rem 1.25rem 0.25rem;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--muted);
      font-weight: 600;
    }
    /* Main content */
    .main {
      margin-left: 260px;
      flex: 1;
      padding: 2rem 3rem 4rem;
      max-width: 900px;
    }
    .main h1 { font-size: 2rem; margin-bottom: 0.5rem; color: var(--accent); }
    .main h2 { font-size: 1.4rem; margin: 2rem 0 0.75rem; padding-bottom: 0.4rem; border-bottom: 1px solid var(--border); }
    .main h3 { font-size: 1.15rem; margin: 1.5rem 0 0.5rem; }
    .main a { color: var(--accent); text-decoration: none; }
    .main a:hover { text-decoration: underline; }
    .main p { margin: 0.75rem 0; }
    .main ul, .main ol { margin: 0.5rem 0 0.5rem 1.5rem; }
    .main li { margin: 0.25rem 0; }
    .main blockquote {
      margin: 1rem 0;
      padding: 0.75rem 1rem;
      background: var(--card);
      border-left: 3px solid var(--accent);
      border-radius: 0 8px 8px 0;
      color: var(--muted);
    }
    .main code {
      background: var(--card);
      padding: 0.15rem 0.4rem;
      border-radius: 4px;
      font-size: 0.88em;
      font-family: 'SF Mono', 'Fira Code', monospace;
    }
    .main pre {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1rem;
      overflow-x: auto;
      margin: 1rem 0;
    }
    .main pre code {
      background: none;
      padding: 0;
    }
    .main table {
      width: 100%;
      border-collapse: collapse;
      margin: 1rem 0;
    }
    .main th, .main td {
      padding: 0.5rem 0.75rem;
      border: 1px solid var(--border);
      text-align: left;
      font-size: 0.9rem;
    }
    .main th {
      background: var(--card);
      font-weight: 600;
    }
    .main hr {
      border: none;
      border-top: 1px solid var(--border);
      margin: 2rem 0;
    }
    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      color: var(--muted);
    }
    /* Search */
    .search-box {
      padding: 0 1.25rem;
      margin-bottom: 0.75rem;
    }
    .search-box input {
      width: 100%;
      padding: 0.5rem 0.75rem;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 6px;
      color: var(--text);
      font-size: 0.85rem;
      outline: none;
    }
    .search-box input:focus {
      border-color: var(--accent);
    }
    .search-box input::placeholder {
      color: var(--muted);
    }
    @media (max-width: 768px) {
      .sidebar { width: 200px; }
      .main { margin-left: 200px; padding: 1.5rem; }
    }
  </style>
</head>
<body>
  <nav class="sidebar" id="sidebar">
    <h1>Glasswing Wiki</h1>
    <div class="search-box">
      <input type="text" id="search" placeholder="Search pages..." oninput="filterPages()">
    </div>
    <div id="nav-links"></div>
  </nav>
  <main class="main" id="content">
    <div class="loading">Loading...</div>
  </main>
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <script>
    const pages = [
      { title: 'Home', path: 'README.md', section: '' },
      { title: 'Architecture', path: 'architecture/overview.md', section: 'Architecture' },
      { title: 'Service Directory', path: 'services/overview.md', section: 'Services' },
      { title: 'Infrastructure', path: 'services/infrastructure.md', section: 'Services' },
      { title: 'AI Platform', path: 'services/ai-platform.md', section: 'Services' },
      { title: 'MCP Servers', path: 'services/mcp-servers.md', section: 'Services' },
      { title: 'Developer Tools', path: 'services/developer.md', section: 'Services' },
      { title: 'World Clock', path: 'services/world-clock.md', section: 'Services' },
      { title: 'Home Management', path: 'services/home-management.md', section: 'Services' },
      { title: 'Astronomy', path: 'services/astronomy.md', section: 'Services' },
      { title: 'Research & Intel', path: 'services/research.md', section: 'Services' },
      { title: 'News Centre', path: 'services/news-centre.md', section: 'Services' },
      { title: 'Entertainment', path: 'services/entertainment.md', section: 'Services' },
      { title: 'Deploying Stacks', path: 'guides/deploying-stacks.md', section: 'Guides' },
      { title: 'Troubleshooting', path: 'guides/troubleshooting.md', section: 'Guides' },
    ];

    let currentPage = null;

    // Build sidebar
    function buildSidebar() {
      const nav = document.getElementById('nav-links');
      let currentSection = '';
      pages.forEach(p => {
        if (p.section && p.section !== currentSection) {
          currentSection = p.section;
          const sec = document.createElement('div');
          sec.className = 'section-title';
          sec.textContent = currentSection;
          nav.appendChild(sec);
        }
        const a = document.createElement('a');
        a.href = '#' + p.path;
        a.textContent = p.title;
        a.dataset.path = p.path;
        a.addEventListener('click', (e) => {
          e.preventDefault();
          loadPage(p.path);
        });
        nav.appendChild(a);
      });
    }

    // Load a markdown page
    async function loadPage(path) {
      currentPage = path;
      document.querySelectorAll('#nav-links a').forEach(a => {
        a.classList.toggle('active', a.dataset.path === path);
      });
      try {
        const resp = await fetch(path);
        const text = await resp.text();
        document.getElementById('content').innerHTML = marked.parse(text);
        // Fix relative links in rendered markdown
        document.querySelectorAll('#content a[href^="#"]').forEach(a => a.removeAttribute('href'));
        history.replaceState(null, '', '#' + path);
      } catch (e) {
        document.getElementById('content').innerHTML = '<p style="color:#f87171">Failed to load: ' + path + '</p>';
      }
    }

    // Filter pages by search
    function filterPages() {
      const q = document.getElementById('search').value.toLowerCase();
      document.querySelectorAll('#nav-links a').forEach(a => {
        a.style.display = a.textContent.toLowerCase().includes(q) ? '' : 'none';
      });
      document.querySelectorAll('.section-title').forEach(s => {
        const next = s.nextElementSibling;
        s.style.display = (next && next.style.display !== 'none') ? '' : 'none';
      });
    }

    // Init
    buildSidebar();
    const hash = window.location.hash.slice(1);
    if (hash && pages.find(p => p.path === hash)) {
      loadPage(hash);
    } else {
      loadPage('README.md');
    }
    window.addEventListener('hashchange', () => {
      const h = window.location.hash.slice(1);
      if (h && pages.find(p => p.path === h)) loadPage(h);
    });
  </script>
</body>
</html>
INDEX

# Nginx config
RUN cat > /etc/nginx/conf.d/default.conf << 'NGINX'
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    include /etc/nginx/mime.types;
    types {
        text/markdown md markdown;
    }

    add_header Cache-Control "no-cache, no-store, must-revalidate";
    add_header Pragma "no-cache";
    add_header Expires "0";

    location / {
        try_files $uri $uri/ /index.html;
    }
}
NGINX

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -qO- http://127.0.0.1:80/ || exit 1
