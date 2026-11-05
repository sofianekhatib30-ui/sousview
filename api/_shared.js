// GuideView: utilità comuni. Wikipedia e Wikidata sono fonti aperte: si cita sempre la fonte (CC BY-SA / CC0).
export const LANGS = ['it', 'en', 'fr', 'es', 'de'];
export const PAIR_RE = /^[ACDEFGHJKMNPQRTUVWXY3479]{6}$/;
export const UA = { 'User-Agent': 'GuideView/1.0 (https://guideview.vercel.app; demo smart-glasses city guide)', 'Api-User-Agent': 'GuideView/1.0 (https://guideview.vercel.app)' };
export const str = (v, max) => (typeof v === 'string' || typeof v === 'number' ? String(v).replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '');
export const send = (res, status, obj, cache) => { res.statusCode = status; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', cache || 'no-store'); res.end(JSON.stringify(obj)); };
export async function getJson(url, ms) {
  const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), ms || 4000);
  try { const r = await fetch(url, { headers: UA, signal: ctl.signal }); if (!r.ok) return null; return await r.json(); } catch (e) { return null; } finally { clearTimeout(tm); }
}
export async function readJson(req, max) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = []; let size = 0;
  for await (const c of req) { size += c.length; if (size > max) throw Object.assign(new Error('too_big'), { status: 413 }); chunks.push(c); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}
// Taglia a fine frase, senza lasciare mezze parole.
export function clip(text, max) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max), i = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
  return i > max * 0.5 ? cut.slice(0, i + 1) : cut.replace(/\s+\S*$/, '') + '…';
}
// Da un QID Wikidata al titolo della voce Wikipedia nella lingua richiesta (con ripiego sull'inglese e l'italiano).
export async function sitelink(qid, lang) {
  const d = await getJson(`https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=sitelinks|descriptions|labels&ids=${encodeURIComponent(qid)}&sitefilter=${LANGS.map((l) => l + 'wiki').join('|')}&languages=${LANGS.join('|')}`);
  const e = d && d.entities && d.entities[qid];
  if (!e || !e.sitelinks) return null;
  for (const l of [lang, 'en', 'it']) { const s = e.sitelinks[l + 'wiki']; if (s) return { lang: l, title: s.title, label: (e.labels[lang] || e.labels[l] || {}).value || s.title, description: (e.descriptions[lang] || {}).value || '' }; }
  return null;
}
export async function extract(lang, title, intro) {
  const d = await getJson(`https://${lang}.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&redirects=1&prop=extracts&explaintext=1&exsectionformat=plain${intro ? '&exintro=1' : ''}&titles=${encodeURIComponent(title)}`);
  const p = d && d.query && d.query.pages && d.query.pages[0];
  if (!p || p.missing || !p.extract) return null;
  return { title: p.title, text: p.extract, url: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(p.title.replace(/ /g, '_'))}` };
}
