FROM nginx:1.27-alpine

# Copy docs
COPY docs/ /usr/share/nginx/html/

# Docsify index.html - serves the wiki
RUN apk add --no-cache curl && \
    cat > /usr/share/nginx/html/index.html << 'INDEX'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Glasswing Wiki</title>
  <style>
    /* Docsify overrides for dark theme */
    :root {
      --base-bg-color: #0b0d13;
      --base-text-color: #e2e4ed;
    }
    body { background: #0b0d13 !important; color: #e2e4ed !important; }
    .markdown-section { color: #e2e4ed !important; }
    .sidebar { background: #131620 !important; border-right: 1px solid #2a2f45 !important; }
    .sidebar ul li a { color: #8b90a5 !important; }
    .sidebar ul li a:hover { color: #6c8cff !important; }
    .sidebar ul li.active > a { color: #6c8cff !important; border-color: #6c8cff !important; }
    a { color: #6c8cff !important; }
    code { background: #1a1e2e !important; color: #e2e4ed !important; }
    pre { background: #131620 !important; border: 1px solid #2a2f45 !important; }
    table { border-color: #2a2f45 !important; }
    table th { background: #1a1e2e !important; }
    table td, table th { border-color: #2a2f45 !important; }
    .content p, .content ul, .content ol { color: #e2e4ed !important; }
    .content h1, .content h2, .content h3, .content h4 { color: #e2e4ed !important; border-color: #2a2f45 !important; }
    blockquote { background: #1a1e2e !important; border-color: #6c8cff !important; color: #8b90a5 !important; }
    .search { background: #1a1e2e !important; border-color: #2a2f45 !important; color: #e2e4ed !important; }
    .app-nav { border-bottom: 1px solid #2a2f45 !important; }
    .app-nav a { color: #6c8cff !important; }
  </style>
</head>
<body>
  <div class="app-nav"></div>
  <div class="markdown-section">
    <h1>Loading...</h1>
  </div>
  <script src="//cdn.jsdelivr.net/npm/docsify@4/lib/docsify.min.js"></script>
  <script src="//cdn.jsdelivr.net/npm/docsify@4/lib/plugins/search.min.js"></script>
  <script src="//cdn.jsdelivr.net/npm/prismjs@1/components/prism-bash.min.js"></script>
  <script src="//cdn.jsdelivr.net/npm/prismjs@1/components/prism-yaml.min.js"></script>
  <script src="//cdn.jsdelivr.net/npm/prismjs@1/components/prism-python.min.js"></script>
  <script>
    window.$docsify = {
      repo: 'pain459/project_glasswing',
      loadSidebar: true,
      maxLevel: 3,
      subMaxLevel: 3,
      auto2top: true,
      search: {
        paths: 'auto',
        depth: 3,
        noData: 'No results',
        placeholder: 'Search wiki...',
      },
      alias: {
        '/.*/_sidebar': '/_sidebar.md',
      },
    }
  </script>
</body>
</html>
INDEX

# Nginx config for Docsify (history fallback + markdown MIME type)
RUN cat > /etc/nginx/conf.d/default.conf << 'NGINX'
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Include default nginx MIME types, then add .md mapping
    include /etc/nginx/mime.types;
    types {
        text/markdown md markdown;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
NGINX

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -qO- http://127.0.0.1:80/ || exit 1
