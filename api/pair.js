// Abbinamento occhiali e telefono: preferiti e diario delle tappe, legati a un codice di 6 caratteri.
import { put, get } from '@vercel/blob';
import { PAIR_RE, readJson, send, str } from './_shared.js';
const path = (c) => `guida/${c}/diario.json`;
async function load(c) { const r = await get(path(c), { access: 'private', useCache: false }).catch(() => null); if (!r || r.statusCode !== 200) return null; return JSON.parse(await new Response(r.stream).text()); }
const save = (c, d) => put(path(c), JSON.stringify(d), { access: 'private', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true });
const clean = (it) => ({ ref: str(it.ref, 40), kind: it.kind === 'found' ? 'found' : 'place', title: str(it.title, 100), subtitle: str(it.subtitle, 100), text: str(it.text, 1500), url: /^https:\/\//.test(String(it.url || '')) ? str(it.url, 300) : '', qid: /^Q\d+$/.test(String(it.qid || '')) ? it.qid : '', lat: Number(it.lat) || null, lon: Number(it.lon) || null, city: str(it.city, 20), at: Date.now() });
export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const code = String(new URL(req.url, 'http://x').searchParams.get('code') || '');
      if (!PAIR_RE.test(code)) return send(res, 400, { error: 'bad_code' });
      return send(res, 200, (await load(code)) || { saved: [], visits: [] });
    }
    if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return send(res, 405, { error: 'method' }); }
    const b = await readJson(req, 30000);
    const code = String(b.code || '');
    if (!PAIR_RE.test(code)) return send(res, 400, { error: 'bad_code' });
    const d = (await load(code)) || { saved: [], visits: [] };
    if (b.action === 'save' && b.item) { const it = clean(b.item); if (!it.title) return send(res, 400, { error: 'bad_item' }); d.saved = [it].concat(d.saved.filter((x) => !(x.ref && x.ref === it.ref) && x.title !== it.title)).slice(0, 200); }
    else if (b.action === 'unsave') { const ref = str(b.ref, 100); d.saved = d.saved.filter((x) => x.ref !== ref && x.title !== ref); }
    else if (b.action === 'visit' && b.item) { const it = clean(b.item); const day = new Date().toISOString().slice(0, 10); if (!d.visits.some((v) => v.ref === it.ref && new Date(v.at).toISOString().slice(0, 10) === day)) d.visits = [it].concat(d.visits).slice(0, 500); }
    else return send(res, 400, { error: 'bad_action' });
    await save(code, d);
    return send(res, 200, d);
  } catch (e) { return send(res, e.status || 500, { error: 'server' }); }
}
