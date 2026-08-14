'use strict';

/*
 * Local dev server — lets the whole app run with plain Node, no Vercel needed:
 *
 *     node news/server.js
 *     → open http://localhost:3000
 *
 * It serves the static files in this folder and answers /api/news using the
 * exact same handler Vercel uses in production, so what you test locally is
 * what ships.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const apiHandler = require('../api/news');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/api/news') {
    return apiHandler(req, res);
  }

  let filePath = path.join(ROOT, url.pathname === '/' ? 'index.html' : url.pathname);
  // Prevent path traversal outside the served folder.
  if (!filePath.startsWith(ROOT)) {
    res.statusCode = 403;
    return res.end('Forbidden');
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.statusCode = 404;
      return res.end('Not found');
    }
    res.setHeader('Content-Type', MIME[path.extname(filePath)] || 'application/octet-stream');
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`News Brief running at http://localhost:${PORT}`);
});
