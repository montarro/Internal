'use strict';

// Vercel serverless function: GET /api/news
//   ?categories=world,sports,tunisia   (comma-separated; optional)
//   &q=keyword                          (optional free-text filter)
//   &limit=120                          (optional)
//
// Also serves the category catalog at /api/news?meta=categories so the
// frontend never has to hard-code the list.

const { getNews, categoryList, channelList } = require('./_aggregator');

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  // Allow the static page to call this even if served from a different origin.
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const force = url.searchParams.get('refresh') === '1';
    // Let Vercel's edge cache hold the response briefly, unless the reader
    // explicitly asked for the latest (the refresh button).
    res.setHeader('Cache-Control', force ? 'no-store' : 's-maxage=300, stale-while-revalidate=600');

    const lang = url.searchParams.get('lang') || 'en';

    const meta = url.searchParams.get('meta');
    if (meta === 'categories') {
      res.statusCode = 200;
      res.end(JSON.stringify({ categories: categoryList(lang) }));
      return;
    }
    if (meta === 'channels') {
      res.statusCode = 200;
      res.end(JSON.stringify({ channels: channelList(lang) }));
      return;
    }
    const categories = (url.searchParams.get('categories') || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const q = url.searchParams.get('q') || '';
    const source = url.searchParams.get('source') || 'all';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '120', 10) || 120, 200);

    const data = await getNews({ categories, q, limit, lang, source, force });
    res.statusCode = 200;
    res.end(JSON.stringify(data));
  } catch (err) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'Failed to load news', detail: String(err && err.message || err) }));
  }
};
