// Abbinamento occhiali ↔ telefono: ultimi risultati e prodotti salvati, legati a un codice di 6 caratteri.
import { put, get } from '@vercel/blob';
import { PAIR_RE, readJson, send, str } from './_shared.js';
async function readBlob(path) {
  const r = await get(path, { access: 'private', useCache: false }).catch(() => null);
  if (!r || r.statusCode !== 200) return null;
  return JSON.parse(await new Response(r.stream).text());
}
const write = (path, obj) => put(path, JSON.stringify(obj), { access: 'private', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true });
export default async function handler(req, res) {
  try {
    const url = new URL(req.url, 'http://x');
    if (req.method === 'GET') {
      const code = String(url.searchParams.get('code') || '');
      const what = url.searchParams.get('what') === 'saved' ? 'saved' : 'latest';
      if (!PAIR_RE.test(code)) return send(res, 400, { error: 'bad_code' });
      const data = await readBlob(`pair/${code}/${what}.json`);
      return send(res, 200, data || (what === 'saved' ? { items: [] } : { at: 0 }));
    }
    if (req.method === 'POST') {
      const body = await readJson(req, 20000);
      const code = String(body.code || '');
      if (!PAIR_RE.test(code)) return send(res, 400, { error: 'bad_code' });
      const cur = (await readBlob(`pair/${code}/saved.json`)) || { items: [] };
      if (body.action === 'save' && body.item) {
        const it = body.item;
        const num = (v) => (Number(v) >= 0 && v !== null && v !== '' ? Math.round(Number(v) * 100) / 100 : null);
        const item = { title: str(it.title, 120), store: str(it.store, 40), host: str(it.host, 80), url: str(it.url, 500), price: num(it.price), currency: str(it.currency, 3), price_local: num(it.price_local), currency_local: str(it.currency_local, 3), shipping_local: num(it.shipping_local), match: ['identical', 'same_model', 'similar'].includes(it.match) ? it.match : 'similar', condition: it.condition === 'used' ? 'used' : 'new', at: Date.now() };
        if (!/^https:\/\//.test(item.url)) return send(res, 400, { error: 'bad_item' });
        cur.items = [item].concat(cur.items.filter((x) => x.url !== item.url)).slice(0, 100);
      } else if (body.action === 'unsave') {
        cur.items = cur.items.filter((x) => x.url !== str(body.url, 500));
      } else return send(res, 400, { error: 'bad_action' });
      await write(`pair/${code}/saved.json`, cur);
      return send(res, 200, cur);
    }
    res.setHeader('Allow', 'GET, POST'); return send(res, 405, { error: 'method' });
  } catch (e) { return send(res, e.status || 500, { error: 'server' }); }
}
