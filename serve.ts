// serve.ts — a tiny static server for playing the game locally.
//
//   node serve.ts        then open http://localhost:8080
//
// It serves this repository's game/ folder and nothing else, with the
// two content types the game needs (.html and .js as a module). The
// grader never runs this file; it exists so a person can play the exact
// files that were entered, offline, in a desktop browser.

import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('./game/', import.meta.url));
const port = Number(process.env.PORT ?? 8080);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const path = normalize(join(root, url.pathname === '/' ? 'index.html' : url.pathname));
    if (!path.startsWith(root)) throw new Error('outside the game folder');
    const body = await readFile(path);
    res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found');
  }
});

server.listen(port, () => {
  process.stdout.write(`Starshard Arena at http://localhost:${port}\n`);
});
