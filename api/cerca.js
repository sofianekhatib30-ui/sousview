// "Cosa sto guardando?" fuori dall'elenco: Meta AI legge titolo/autore/didascalia, qui si cerca su Wikidata e si risponde col riassunto di Wikipedia.
import { LANGS, clip, extract, getJson, send, sitelink, str } from './_shared.js';
const hits = new Map();
function limited(ip) { const now = Date.now(); const h = (hits.get(ip) || []).filter((t) => now - t < 3600000); h.push(now); hits.set(ip, h); return h.length > 120; }
export default async function handler(req, res) {
  const u = new URL(req.url, 'http://x');
  const lang = LANGS.includes(u.searchParams.get('lang')) ? u.searchParams.get('lang') : 'en';
  const q = str(u.searchParams.get('q'), 120);
  const extra = str(u.searchParams.get('extra'), 120).toLowerCase();
  if (q.length < 2) return send(res, 400, { error: 'empty' });
  if (limited(String(req.headers['x-forwarded-for'] || 'x').split(',')[0])) return send(res, 429, { error: 'limit' });
  // Prima nella lingua dell'utente, poi in inglese e in italiano (le didascalie nei musei italiani sono spesso in italiano).
  const seen = new Set(), cands = [];
  for (const l of [lang, 'en', 'it']) {
    if (cands.length >= 6) break;
    const d = await getJson(`https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&limit=5&type=item&language=${l}&uselang=${lang}&search=${encodeURIComponent(q)}`, 3000);
    for (const x of (d && d.search) || []) if (!seen.has(x.id)) { seen.add(x.id); cands.push(x); }
  }
  if (!cands.length) return send(res, 404, { error: 'not_found' });
  // Se Meta AI ha letto anche autore o luogo, premia il candidato la cui descrizione li contiene.
  const words = extra.split(/[^a-zàèéìòù0-9]+/i).filter((w) => w.length > 3);
  const best = cands.map((c, i) => ({ c, s: (words.filter((w) => String(c.description || '').toLowerCase().includes(w)).length * 2) - i * 0.5 - (/disambigua|disambiguation|homonymie|desambiguación|Begriffsklärung/i.test(c.description || '') ? 10 : 0) })).sort((a, b) => b.s - a.s)[0].c;
  const sl = await sitelink(best.id, lang);
  if (!sl) return send(res, 200, { qid: best.id, title: best.label, description: best.description || '', text: '', url: `https://www.wikidata.org/wiki/${best.id}`, source: 'Wikidata', license: 'CC0' });
  const ex = await extract(sl.lang, sl.title, true);
  send(res, 200, { qid: best.id, lang: sl.lang, title: (ex && ex.title) || sl.label, description: sl.description || best.description || '', text: ex ? clip(ex.text, 1400) : '', url: ex ? ex.url : `https://www.wikidata.org/wiki/${best.id}`, source: 'Wikipedia', license: 'CC BY-SA 4.0' }, 'public, s-maxage=86400');
}
