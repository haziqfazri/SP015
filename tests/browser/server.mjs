import { createServer } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const port = Number(process.env.PLAYWRIGHT_PORT ?? 4173);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PLAYWRIGHT_PORT must be an integer from 1 to 65535');
export const origin = `http://127.0.0.1:${port}`;
const root = fileURLToPath(new URL('../../', import.meta.url)).replace(/\/$/, '');
const types = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.ico': 'image/x-icon',
  '.ttf': 'font/ttf', '.woff': 'font/woff', '.woff2': 'font/woff2', '.pdf': 'application/pdf',
};

// Both mounts read the same checkout. No copies, rewrites to application files,
// build step, directory listings, or third-party server package are needed.
export async function serve(request, response) {
  const send = (status, body, headers = {}) => {
    response.writeHead(status, { 'Cache-Control': 'no-store', ...headers });
    response.end(request.method === 'HEAD' ? undefined : body);
  };
  if (!['GET', 'HEAD'].includes(request.method)) return send(405, 'Method not allowed');
  try {
    const url = new URL(request.url, origin);
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === '/SP015') return send(308, '', { Location: `/SP015/${url.search}` });
    if (pathname.startsWith('/SP015/')) pathname = pathname.slice('/SP015'.length);
    if (pathname === '/__health') return send(200, 'sp015-playwright', { 'Content-Type': 'text/plain' });
    if (pathname.split('/').some((part) => part.startsWith('.'))) return send(403, 'Forbidden');
    let file = resolve(root, `.${pathname}`);
    if (file !== root && !file.startsWith(`${root}${sep}`)) return send(403, 'Forbidden');
    if ((await stat(file)).isDirectory()) {
      if (!url.pathname.endsWith('/')) return send(308, '', { Location: `${url.pathname}/${url.search}` });
      file = resolve(file, 'index.html');
    }
    file = await realpath(file);
    if (!file.startsWith(`${root}${sep}`)) return send(403, 'Forbidden');
    const body = await readFile(file);
    return send(200, body, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' });
  } catch (error) {
    return send(error instanceof URIError ? 400 : error.code === 'ENOENT' || error.code === 'ENOTDIR' ? 404 : 500, 'Unable to serve file');
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = createServer(serve);
  server.listen(port, '127.0.0.1', () => console.log(`Playwright server: ${origin} and ${origin}/SP015/`));
  process.on('SIGTERM', () => server.close(() => process.exit(0)));
}
