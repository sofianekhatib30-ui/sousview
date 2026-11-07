// Abbinamento occhiali e telefono: preferiti e diario delle tappe, legati a un codice di 6 caratteri.
import { put, get } from '@vercel/blob';
import { PAIR_RE, readJson, send, str } from './_shared.js';
const path = (c) => `guida/${c}/diario.json`;
async function load(c) { const r = await get(path(c), { access: 'private', useCache: false }).catch(() => null); if (!r || r.statusCode !== 200) return null; return JSON.parse(await new Response(r.stream).text()); }
const save = (c, d) => put(path(c), JSON.stringify(d), { access: 'private', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true });
const cleanStory = (st) => st && typeof st === 'object' ? { title: str(st.title, 140), author: str(st.author, 80), date: str(st.date, 40), where: str(st.where, 120), short: str(st.short, 700), story: str(st.story, 2200), author_life: str(st.author_life, 2200), anecdotes: (Array.isArray(st.anecdotes) ? st.anecdotes : []).slice(0, 5).map((a) => ({ text: str(a.text, 600), source: /^https?:\/\//.test(String(a.source || '')) ? str(a.source, 400) : '' })), look_for: (Array.isArray(st.look_for) ? st.look_for : []).slice(0, 4).map((x) => str(x, 200)), sources: (Array.isArray(st.sources) ? st.sources : []).slice(0, 8).map((x) => ({ title: str(x.title, 120), url: /^https?:\/\//.test(String(x.url || '')) ? str(x.url, 400) : '' })) } : null;
const clean = (it) => ({ ref: str(it.ref, 40), kind: ['found', 'story'].includes(it.kind) ? it.kind : 'place', title: str(it.title, 100), subtitle: str(it.subtitle, 100), text: str(it.text, 1500), story: it.kind === 'story' ? cleanStory(it.story) : undefined, url: /^https:\/\//.test(String(it.url || '')) ? str(it.url, 300) : '', qid: /^Q\d+$/.test(String(it.qid || '')) ? it.qid : '', lat: Number(it.lat) || null, lon: Number(it.lon) || null, city: str(it.city, 20), at: Date.now() });
export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const u = new URL(req.url, 'http://x'), code = String(u.searchParams.get('code') || '');
      if (!PAIR_RE.test(code)) return send(res, 400, { error: 'bad_code' });
      // L'ultimo racconto chiesto dal telefono: gli occhiali lo aspettano qui.
      if (u.searchParams.get('what') === 'ultimo') { const r = await get(`guida/${code}/ultimo.json`, { access: 'private', useCache: false }).catch(() => null); return send(res, 200, r && r.statusCode === 200 ? JSON.parse(await new Response(r.stream).text()) : { at: 0 }); }
      return send(res, 200, (await load(code)) || { saved: [], visits: [] });
    }
    if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return send(res, 405, { error: 'method' }); }
    const b = await readJson(req, 60000);
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
