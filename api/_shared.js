// Regole comuni di LookView: pulizia degli input, domini fidati per paese, etichette di corrispondenza.
export const COUNTRIES = ['IT', 'UK', 'FR', 'DE', 'ES', 'US'];
export const CURRENCY = { IT: 'EUR', FR: 'EUR', DE: 'EUR', ES: 'EUR', UK: 'GBP', US: 'USD' };
// Solo negozi ufficiali, grandi rivenditori, marketplace con protezione acquirenti e comparatori noti.
const COMMON = ['asos.com', 'zara.com', 'hm.com', 'mango.com', 'uniqlo.com', 'cos.com', 'nike.com', 'adidas.com', 'newbalance.com', 'levi.com', 'farfetch.com', 'mytheresa.com', 'vestiairecollective.com', 'decathlon.com', 'apple.com', 'samsung.com', 'ikea.com', 'lego.com'];
export const DOMAINS = {
  IT: ['zalando.it', 'amazon.it', 'ebay.it', 'aboutyou.it', 'yoox.com', 'vinted.it', 'zalando-lounge.it', 'footlocker.it', 'decathlon.it', 'mediaworld.it', 'unieuro.it', 'idealo.it', 'trovaprezzi.it', 'coin.it', 'rinascente.it', 'ovs.it', 'adidas.it', 'ikea.com'],
  UK: ['zalando.co.uk', 'amazon.co.uk', 'ebay.co.uk', 'johnlewis.com', 'next.co.uk', 'marksandspencer.com', 'selfridges.com', 'jdsports.co.uk', 'endclothing.com', 'vinted.co.uk', 'currys.co.uk', 'argos.co.uk', 'idealo.co.uk', 'pricerunner.com', 'adidas.co.uk', 'boots.com'],
  FR: ['zalando.fr', 'amazon.fr', 'ebay.fr', 'laredoute.fr', 'galerieslafayette.com', 'printemps.com', 'vinted.fr', 'fnac.com', 'darty.com', 'boulanger.com', 'idealo.fr', 'courir.com', 'adidas.fr', 'decathlon.fr', 'sephora.fr'],
  DE: ['zalando.de', 'amazon.de', 'ebay.de', 'aboutyou.de', 'otto.de', 'breuninger.com', 'vinted.de', 'mediamarkt.de', 'saturn.de', 'idealo.de', 'geizhals.de', 'snipes.com', 'adidas.de', 'decathlon.de', 'douglas.de'],
  ES: ['zalando.es', 'amazon.es', 'ebay.es', 'elcorteingles.es', 'vinted.es', 'pccomponentes.com', 'mediamarkt.es', 'idealo.es', 'adidas.es', 'decathlon.es', 'druni.es'],
  US: ['amazon.com', 'ebay.com', 'nordstrom.com', 'macys.com', 'target.com', 'walmart.com', 'bestbuy.com', 'zappos.com', 'ssense.com', 'poshmark.com', 'thredup.com', 'kohls.com', 'footlocker.com', 'dickssportinggoods.com', 'sephora.com']
};
export const domainsFor = (c) => Array.from(new Set((DOMAINS[c] || DOMAINS.IT).concat(COMMON)));
export const hostOk = (url, c) => {
  try {
    const h = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    if (!/^https?:$/.test(new URL(url).protocol)) return false;
    return domainsFor(c).some((d) => h === d || h.endsWith('.' + d));
  } catch (e) { return false; }
};
export const str = (v, max) => (typeof v === 'string' || typeof v === 'number' ? String(v).replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '');
export const normCode = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
export const normText = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
export const FIELDS = ['category', 'brand', 'model_name', 'product_code', 'barcode', 'colour', 'material', 'pattern', 'visible_text', 'store_price', 'currency', 'store_name', 'condition', 'country'];
export function cleanQuery(q) {
  const o = {};
  for (const f of FIELDS) { const v = str(q && q[f], f === 'visible_text' ? 160 : 60); if (v) o[f] = v; }
  if (o.store_price) { const n = parseFloat(o.store_price.replace(',', '.').replace(/[^0-9.]/g, '')); if (n > 0 && n < 100000) o.store_price = String(Math.round(n * 100) / 100); else delete o.store_price; }
  if (o.barcode && !/^\d{8,14}$/.test(o.barcode.replace(/\s/g, ''))) delete o.barcode; else if (o.barcode) o.barcode = o.barcode.replace(/\s/g, '');
  if (!['new', 'used', 'any'].includes(o.condition)) o.condition = 'any';
  if (!COUNTRIES.includes(o.country)) o.country = 'IT';
  return o;
}
// La pagina decide l'etichetta, non il modello: "identico" solo con un codice o un EAN che coincidono.
export function matchLabel(q, r) {
  const qCode = normCode(q.product_code), qEan = normCode(q.barcode), rCodes = [r.code, r.ean, r.title].map(normCode).join(' ');
  const brandOk = q.brand && normText(r.brand || r.title).includes(normText(q.brand));
  if (qEan && rCodes.includes(qEan)) return 'identical';
  if (qCode && qCode.length >= 4 && brandOk && rCodes.includes(qCode)) return 'identical';
  if (brandOk && q.model_name && normText(r.title).includes(normText(q.model_name).split(' ')[0])) return 'same_model';
  return 'similar';
}
export async function readJson(req, max) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = []; let size = 0;
  for await (const c of req) { size += c.length; if (size > max) throw Object.assign(new Error('too_big'), { status: 413 }); chunks.push(c); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}
export const send = (res, status, obj) => { res.statusCode = status; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(obj)); };
export const PAIR_RE = /^[ACDEFGHJKMNPQRTUVWXY3479]{6}$/;
