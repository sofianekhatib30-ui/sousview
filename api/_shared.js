// Regole comuni di LookView: pulizia degli input, cambio valute, etichette di corrispondenza.
// Ricerca mondiale su qualsiasi negozio, come una ricerca per immagine: nessun filtro per paese o condizione.
export const CURRENCIES = ['EUR', 'GBP', 'USD', 'CHF'];
export const str = (v, max) => (typeof v === 'string' || typeof v === 'number' ? String(v).replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '');
export const normCode = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
export const normText = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
export const FIELDS = ['category', 'brand', 'model_name', 'product_code', 'barcode', 'colour', 'material', 'size', 'pattern', 'visible_text', 'store_price', 'store_name'];
export function cleanQuery(q) {
  const o = {};
  for (const f of FIELDS) { const v = str(q && q[f], f === 'visible_text' ? 160 : 60); if (v) o[f] = v; }
  if (o.store_price) { const n = parseFloat(o.store_price.replace(',', '.').replace(/[^0-9.]/g, '')); if (n > 0 && n < 1000000) o.store_price = String(Math.round(n * 100) / 100); else delete o.store_price; }
  if (o.barcode && !/^\d{8,14}$/.test(o.barcode.replace(/\s/g, ''))) delete o.barcode; else if (o.barcode) o.barcode = o.barcode.replace(/\s/g, '');
  return o;
}
// La pagina decide l'etichetta, non il modello: "identico" solo con un codice o un EAN che coincidono.
export function matchLabel(q, r) {
  const qCode = normCode(q.product_code), qEan = normCode(q.barcode), rCodes = [r.code, r.ean, r.title].map(normCode).join(' ');
  const hay = normText([r.brand, r.title].join(' '));
  const brandOk = !!q.brand && hay.includes(normText(q.brand));
  if (qEan && rCodes.includes(qEan)) return 'identical';
  if (qCode && qCode.length >= 4 && rCodes.includes(qCode)) return 'identical';
  const words = normText(q.model_name).split(' ').filter((w) => w.length > 1);
  if (brandOk && words.length && words.every((w) => hay.includes(w))) return 'same_model';
  return 'similar';
}
// Cambi BCE (base EUR), aggiornati una volta al giorno; in memoria per istanza.
let fx = { at: 0, rates: null };
const FALLBACK = { EUR: 1, USD: 1.08, GBP: 0.85, CHF: 0.95 };
export async function rates() {
  if (fx.rates && Date.now() - fx.at < 6 * 3600000) return fx.rates;
  try {
    const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 2500);
    const r = await fetch('https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml', { signal: ctl.signal });
    clearTimeout(tm);
    const xml = await r.text();
    const out = { EUR: 1 };
    for (const m of xml.matchAll(/currency=['"]([A-Z]{3})['"]\s+rate=['"]([0-9.]+)['"]/g)) out[m[1]] = parseFloat(m[2]);
    if (out.USD) { fx = { at: Date.now(), rates: out }; return out; }
  } catch (e) { /* uso i cambi di riserva */ }
  return fx.rates || FALLBACK;
}
export const convert = (v, from, to, rt) => {
  if (v == null || !rt[from] || !rt[to]) return null;
  return Math.round((v / rt[from]) * rt[to] * 100) / 100;
};
export async function readJson(req, max) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = []; let size = 0;
  for await (const c of req) { size += c.length; if (size > max) throw Object.assign(new Error('too_big'), { status: 413 }); chunks.push(c); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}
export const send = (res, status, obj) => { res.statusCode = status; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(obj)); };
export const PAIR_RE = /^[ACDEFGHJKMNPQRTUVWXY3479]{6}$/;
