// Controllo dei dati: dai titoli di Wikipedia in italiano a QID e coordinate Wikidata (P625). Serve a verificare le tappe.
import { getJson, send, str } from './_shared.js';
export default async function handler(req, res) {
  const u = new URL(req.url, 'http://x');
  const titles = str(u.searchParams.get('titles'), 4000).split('|').map((x) => x.trim()).filter(Boolean).slice(0, 50);
  if (!titles.length) return send(res, 400, { error: 'empty' });
  const d = await getJson(`https://it.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&redirects=1&prop=pageprops|coordinates&ppprop=wikibase_item&titles=${encodeURIComponent(titles.join('|'))}`, 8000);
  const pages = (d && d.query && d.query.pages) || [];
  const redir = Object.fromEntries(((d && d.query && d.query.redirects) || []).map((r) => [r.to, r.from]));
  const norm = Object.fromEntries(((d && d.query && d.query.normalized) || []).map((r) => [r.to, r.from]));
  const out = pages.map((p) => ({ asked: norm[redir[p.title] || p.title] || redir[p.title] || p.title, title: p.title, qid: (p.pageprops || {}).wikibase_item || '', lat: p.coordinates ? p.coordinates[0].lat : null, lon: p.coordinates ? p.coordinates[0].lon : null, missing: !!p.missing }));
  send(res, 200, { out }, 'public, s-maxage=3600');
}
