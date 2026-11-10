// Minimal static server for sudokUI (self-hosted, no Cloudflare).
// Serves dist/ and renders /p/<puzzle> and /daily/<date> share pages from
// share.tpl, mirroring what the Cloudflare Worker does (worker/index.ts).
// The daily global-stats API and telemetry are Cloudflare-specific (D1 /
// Analytics Engine) and are not available here; the app still plays fully.
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, normalize, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { shareParamsOf, renderSharePage } from './src/content/share.ts';
import dailies from './src/content/dailies.json' with { type: 'json' };

const ROOT = fileURLToPath(new URL('./dist', import.meta.url));
const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? '0.0.0.0';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
};

let shareTpl = null;
async function getShareTpl() {
  if (!shareTpl) shareTpl = await readFile(join(ROOT, 'share.tpl'), 'utf8');
  return shareTpl;
}

function isSharePath(pathname) {
  // /p/<81 cells> or /daily/<date>, under any language root (en, nb, es)
  return /^\/(?:(?:nb|es)\/)?(?:p\/[0-9.]{81}\/?|daily\/\d{4}-\d{2}-\d{2}\/?)?$/.test(pathname);
}

async function serveFile(res, filePath) {
  const s = await stat(filePath).catch(() => null);
  if (!s || !s.isFile()) return false;
  const ext = extname(filePath).toLowerCase();
  res.writeHead(200, { 'content-type': MIME[ext] ?? 'application/octet-stream' });
  res.end(await readFile(filePath));
  return true;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
    const pathname = decodeURIComponent(url.pathname);

    // Share pages: render from share.tpl (like the Worker)
    if (isSharePath(pathname)) {
      const params = shareParamsOf({ pathname, search: url.search }, dailies);
      if (params) {
        const tpl = await getShareTpl();
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        res.end(renderSharePage(tpl, params));
        return;
      }
    }

    // Static files
    const safe = normalize(pathname).replace(/^(\.\.[/\\])+/, '');
    let filePath = join(ROOT, safe);
    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403); res.end('forbidden'); return;
    }

    if (await serveFile(res, filePath)) return;

    // Directory → index.html
    if (await serveFile(res, join(filePath, 'index.html'))) return;

    // 404 page for anything that is not a file, not a share page, and not
    // an app route (the app shell is only for the home/share/daily routes).
    const notFound = join(ROOT, '404.html');
    res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
    res.end(await readFile(notFound));
  } catch (err) {
    console.error(err);
    res.writeHead(500); res.end('internal error');
  }
});

server.listen(PORT, HOST, () => {
  console.log(`sudokUI server listening on http://${HOST}:${PORT}`);
});
