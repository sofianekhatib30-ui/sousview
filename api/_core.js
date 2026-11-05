// CartView: la logica della casa. Funzioni pure sullo stato JSON di una casa (un file per casa nel Blob privato).
// La pagina è l'arbitro: ricalcola €/kg, controlla le somme degli scontrini, decide rincari, sconti falsi e "sgrammature".

export const CATS = ['spesa', 'casa', 'igiene', 'farmacia', 'animali', 'bollette', 'trasporti', 'ristoranti', 'svago', 'altro'];
export const SERVICES = ['luce', 'gas', 'acqua', 'internet', 'telefono', 'rifiuti', 'altro'];
export const CODE_RE = /^[ACDEFGHJKMNPQRTUVWXY3479]{8}$/;
const MAX = { obs: 6000, receipts: 600, bills: 300, tx: 3000, alerts: 60 };

export const str = (v, max) => (typeof v === 'string' || typeof v === 'number' ? String(v).replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '');
export const normText = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
export const num = (v) => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  let s = String(v == null ? '' : v).trim().replace(/[^\d,.\-]/g, '');
  if (!s) return null;
  if (s.includes(',') && s.includes('.')) s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  else s = s.replace(',', '.');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
};
const r2 = (n) => Math.round(n * 100) / 100;
const r3 = (n) => Math.round(n * 1000) / 1000;
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
export const cleanCat = (c) => { const x = normText(c); return CATS.includes(x) ? x : ({ alimentari: 'spesa', bevande: 'spesa', cibo: 'spesa', food: 'spesa', groceries: 'spesa', drinks: 'spesa', household: 'casa', pulizia: 'casa', persona: 'igiene', personal: 'igiene', cosmetica: 'igiene', pharmacy: 'farmacia', salute: 'farmacia', health: 'farmacia', pets: 'animali', bills: 'bollette', utenze: 'bollette', transport: 'trasporti', carburante: 'trasporti', fuel: 'trasporti', restaurants: 'ristoranti', bar: 'ristoranti', fun: 'svago', leisure: 'svago', abbonamenti: 'svago' }[x] || 'altro'); };
export const dayKey = (t, tz) => new Intl.DateTimeFormat('en-CA', { timeZone: tz || 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(t));
export const monthKey = (t, tz) => dayKey(t, tz).slice(0, 7);
// Date da scontrini e bollette: accetta AAAA-MM-GG, GG/MM/AAAA, GG-MM-AA.
export function parseDate(s, fallback) {
  const x = String(s || '').trim();
  let m = x.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3], 11);
  m = x.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})/);
  if (m) { const y = +m[3] < 100 ? 2000 + +m[3] : +m[3]; return Date.UTC(y, +m[2] - 1, +m[1], 11); }
  return fallback == null ? null : fallback;
}

// ---------- Formati e prezzo per unità ----------
// "500 g", "1,5 l", "6 x 1,5 l", "4x125g", "12 rotoli", "750ml" → valore in kg, l o pz.
export function parseSize(text) {
  const s = String(text || '').toLowerCase().replace(/,/g, '.');
  const U = { kg: ['kg', 1], g: ['kg', 0.001], gr: ['kg', 0.001], grammi: ['kg', 0.001], l: ['l', 1], lt: ['l', 1], litri: ['l', 1], litro: ['l', 1], ml: ['l', 0.001], cl: ['l', 0.01] };
  let m = s.match(/(\d+)\s*[x×*]\s*(\d+(?:\.\d+)?)\s*(kg|grammi|gr|g|litri|litro|lt|l|ml|cl)\b/);
  if (m) { const [u, f] = U[m[3]]; return { value: r3(+m[1] * +m[2] * f), unit: u, label: `${m[1]} x ${m[2]} ${m[3]}` }; }
  m = s.match(/(\d+(?:\.\d+)?)\s*(kg|grammi|gr|g|litri|litro|lt|l|ml|cl)\b/);
  if (m) { const [u, f] = U[m[2]]; return { value: r3(+m[1] * f), unit: u, label: `${m[1]} ${m[2]}` }; }
  m = s.match(/(\d+)\s*(pz|pezzi|rotoli|capsule|bustine|uova|pcs|pack)\b/);
  if (m) return { value: +m[1], unit: 'pz', label: `${m[1]} ${m[2]}` };
  return null;
}
export const unitPrice = (price, size) => (price > 0 && size && size.value > 0 ? r2(price / size.value) : null);

// ---------- Stato ----------
export function emptyState(code) {
  return { v: 1, code, created: Date.now(), stores: {}, products: {}, aliases: {}, obs: [], receipts: [], bills: [], tx: [], budget: {}, alerts: [], current_store: null };
}
function storeId(st, name, city) {
  const n = str(name, 60);
  if (!n) return null;
  let id = 's:' + normText(n + (city ? ' ' + city : ''));
  // "Esselunga" senza città e un solo "Esselunga Monza" già noto: è lo stesso negozio.
  if (!st.stores[id] && !city) { const pre = id + ' '; const m = Object.keys(st.stores).filter((k) => k.startsWith(pre)); if (m.length === 1) id = m[0]; }
  if (!st.stores[id]) st.stores[id] = { id, name: n, city: str(city, 40), first: Date.now() };
  st.stores[id].last = Date.now();
  return id;
}
// Chiave del prodotto: parole ordinate, senza il formato, così "Spaghetti Barilla 500 g" e "Barilla" + "Spaghetti" coincidono.
const SIZE_RE = /(\d+\s*[x×*]\s*)?\d+(?:[.,]\d+)?\s*(kg|grammi|gr|g|litri|litro|lt|l|ml|cl|pz|pezzi|rotoli|capsule|bustine)\b/gi;
export const stripSize = (s) => String(s || '').replace(SIZE_RE, ' ').replace(/\s+/g, ' ').trim();
const baseKey = (brand, name) => Array.from(new Set(normText([brand, stripSize(name)].filter(Boolean).join(' ')).split(' ').filter(Boolean))).sort().join(' ');
function productId(st, { ean, brand, name, size, category }) {
  const e = String(ean || '').replace(/\D/g, '');
  const sizeKey = size ? `${size.value}${size.unit}` : '';
  const key = /^\d{8,14}$/.test(e) ? 'e:' + e : 'n:' + baseKey(brand, name) + '|' + sizeKey;
  if (key === 'n:|') return null;
  let p = st.products[key];
  if (!p) {
    p = st.products[key] = { id: key, ean: /^\d{8,14}$/.test(e) ? e : '', brand: str(brand, 40), name: str(stripSize(name) || name, 80), base: baseKey(brand, name), size: size || null, category: cleanCat(category || 'spesa') };
  } else {
    if (!p.name && name) p.name = str(name, 80);
    if (!p.brand && brand) p.brand = str(brand, 40);
    if (!p.size && size) p.size = size;
  }
  return key;
}
export const productLabel = (p) => p ? [p.brand && !normText(p.name).includes(normText(p.brand)) ? p.brand : '', p.name].filter(Boolean).join(' ') + (p.size ? ` ${p.size.label}` : '') : '';
const push = (arr, x, max) => { arr.push(x); if (arr.length > max) arr.splice(0, arr.length - max); };
function alert(st, type, payload) { push(st.alerts, { id: uid(), type, at: Date.now(), ...payload }, MAX.alerts); }

// ---------- Prezzo a scaffale ----------
export function recordPrice(st, input, now) {
  now = now || Date.now();
  const price = num(input.price);
  if (!(price > 0 && price < 100000)) return { error: 'price' };
  const name = str(input.product_name, 80);
  if (!name && !input.ean) return { error: 'product' };
  let sid = storeId(st, input.store_name, input.store_city);
  if (!sid && st.current_store && now - st.current_store.at < 4 * 3600000) sid = st.current_store.id;
  if (!sid) return { error: 'store' };
  st.current_store = { id: sid, at: now };
  const size = parseSize(input.size_text) || parseSize(name);
  const pid = productId(st, { ean: input.ean, brand: input.brand, name, size, category: input.category });
  const p = st.products[pid];
  const computed = unitPrice(price, p.size);
  const shown = num(input.unit_price);
  const unit = p.size ? p.size.unit : (['kg', 'l', 'pz'].includes(input.unit) ? input.unit : null);
  const up = computed != null ? computed : (shown > 0 ? r2(shown) : null);
  const ref = num(input.reference_price);
  const prev = st.obs.filter((o) => o.p === pid);
  const o = { id: uid(), p: pid, s: sid, at: now, price: r2(price), up, unit, promo: str(input.promo_text, 60), ref: ref > price ? r2(ref) : null, loyalty: num(input.loyalty_price) || null, src: str(input.source, 20) || 'shelf' };
  push(st.obs, o, MAX.obs);
  const res = { obs_id: o.id, product: productLabel(p), store: st.stores[sid].name, price: o.price, unit_price: up, unit, alerts: [] };
  // Il cartellino dice un €/kg diverso da quello che torna dai conti?
  if (computed != null && shown > 0 && Math.abs(shown - computed) / computed > 0.05) res.unit_check = { shown: r2(shown), computed };
  const sameStore = prev.filter((x) => x.s === sid).sort((a, b) => b.at - a.at)[0];
  if (sameStore) { const d = r2(o.price - sameStore.price); res.last = { price: sameStore.price, at: sameStore.at, diff: d, pct: Math.round((d / sameStore.price) * 1000) / 10 }; }
  // Il più basso negli altri negozi, ultimi 90 giorni (ultimo prezzo per negozio).
  const latestByStore = {};
  prev.filter((x) => x.s !== sid && now - x.at < 90 * 86400000).forEach((x) => { if (!latestByStore[x.s] || latestByStore[x.s].at < x.at) latestByStore[x.s] = x; });
  const best = Object.values(latestByStore).sort((a, b) => a.price - b.price)[0];
  if (best) res.best = { store: st.stores[best.s].name, price: best.price, at: best.at, cheaper: best.price < o.price - 0.004 };
  // Sconto falso (Omnibus): prezzo barrato più alto del minimo che hai visto qui negli ultimi 30 giorni.
  if (o.ref) {
    const min30 = prev.filter((x) => x.s === sid && now - x.at < 30 * 86400000).reduce((m, x) => Math.min(m, x.price), Infinity);
    if (min30 < o.ref - 0.009) { res.alerts.push({ type: 'fake_discount', ref: o.ref, min30: r2(min30) }); alert(st, 'fake_discount', { product: res.product, store: res.store, ref: o.ref, min30: r2(min30) }); }
  }
  // Sgrammatura: stesso prodotto in un formato più grande costava meno al kg/litro.
  if (p.size && up != null) {
    const bigger = Object.values(st.products).filter((q) => q.id !== pid && q.base === p.base && q.size && q.size.unit === p.size.unit && q.size.value > p.size.value);
    for (const q of bigger) {
      const lastQ = st.obs.filter((x) => x.p === q.id && x.up != null).sort((a, b) => b.at - a.at)[0];
      if (lastQ && lastQ.up < up * 0.97) { const a = { type: 'shrink', was: q.size.label, now: p.size.label, was_up: lastQ.up, now_up: up }; res.alerts.push(a); alert(st, 'shrink', { product: res.product, ...a }); break; }
    }
  }
  if (res.last && res.last.pct >= 5) alert(st, 'price_up', { product: res.product, store: res.store, from: res.last.price, to: o.price, pct: res.last.pct });
  return res;
}

export function undoObs(st, id) { const i = st.obs.findIndex((o) => o.id === id); if (i >= 0) st.obs.splice(i, 1); return { removed: i >= 0 }; }

// Cerca un prodotto tra quelli già visti: ultimo prezzo per negozio, i più bassi prima.
export function lookup(st, query, limit) {
  const q = normText(query).split(' ').filter((w) => w.length > 1);
  if (!q.length) return [];
  const scored = Object.values(st.products).map((p) => {
    const hay = normText(productLabel(p) + ' ' + p.ean);
    const hit = q.filter((w) => hay.includes(w)).length;
    return { p, score: hit / q.length };
  }).filter((x) => x.score >= 0.6).sort((a, b) => b.score - a.score).slice(0, limit || 3);
  return scored.map(({ p }) => {
    const by = {};
    st.obs.filter((o) => o.p === p.id).forEach((o) => { if (!by[o.s] || by[o.s].at < o.at) by[o.s] = o; });
    const prices = Object.values(by).sort((a, b) => a.price - b.price).slice(0, 4).map((o) => ({ store: st.stores[o.s] ? st.stores[o.s].name : '', price: o.price, unit_price: o.up, unit: o.unit, at: o.at }));
    return { id: p.id, product: productLabel(p), prices };
  });
}
export function history(st, pid) {
  const p = st.products[pid];
  if (!p) return null;
  return { id: pid, product: productLabel(p), category: p.category, obs: st.obs.filter((o) => o.p === pid).sort((a, b) => b.at - a.at).slice(0, 60).map((o) => ({ id: o.id, store: st.stores[o.s] ? st.stores[o.s].name : '', price: o.price, unit_price: o.up, unit: o.unit, at: o.at, src: o.src, promo: o.promo })) };
}

// ---------- Scontrini ----------
export function checkReceipt(r) {
  const lines = r.lines || [];
  const sum = r2(lines.reduce((s, l) => s + (num(l.total) || 0) - Math.abs(num(l.discount) || 0), 0));
  const total = num(r.total);
  return { sum, total, ok: total != null && lines.length > 0 && Math.abs(sum - total) <= 0.02, diff: total == null ? null : r2(total - sum) };
}
export function cleanLines(lines) {
  return (Array.isArray(lines) ? lines : []).slice(0, 150).map((l) => {
    const qty = num(l.qty) > 0 ? num(l.qty) : 1;
    const total = num(l.total);
    const unit = l.unit === 'kg' ? 'kg' : 'pz';
    let up = num(l.unit_price);
    if (!(up > 0) && total != null) up = r2(total / qty);
    return { raw: str(l.raw, 60), name: str(l.name || l.raw, 80), brand: str(l.brand, 40), size_text: str(l.size_text, 30), qty: r3(qty), unit, unit_price: up > 0 ? r2(up) : null, total: total != null ? r2(total) : null, discount: Math.abs(num(l.discount) || 0) ? r2(Math.abs(num(l.discount))) : 0, category: cleanCat(l.category || 'spesa') };
  }).filter((l) => (l.name || l.category === 'farmacia') && l.total != null);
}
export function saveReceipt(st, input, now) {
  now = now || Date.now();
  const sid = storeId(st, input.store_name, input.store_city);
  if (!sid) return { error: 'store' };
  const total = num(input.total);
  if (!(total > 0)) return { error: 'total' };
  const at = parseDate(input.date, now);
  const lines = cleanLines(input.lines);
  const chk = checkReceipt({ lines, total });
  const r = { id: uid(), s: sid, at, total: r2(total), pay: str(input.payment, 20), doc: str(input.doc_number, 30), lottery: str(input.lottery_code, 12), lines: [], status: lines.length ? (chk.ok ? 'ok' : 'check') : 'total_only', src: str(input.source, 20) || 'phone' };
  const chain = normText(st.stores[sid].name).split(' ')[0];
  const priceAlerts = [];
  for (const l of lines) {
    // Farmacia: per privacy si tiene solo l'importo, non cosa si è comprato.
    if (l.category === 'farmacia') { r.lines.push({ ...l, raw: '', name: '', brand: '', size_text: '', p: null }); continue; }
    // Ricorda la descrizione abbreviata dell'insegna: la prossima volta lo stesso testo va allo stesso prodotto.
    const ak = chain + ':' + normText(l.raw || l.name);
    let pid = st.aliases[ak];
    if (!pid || !st.products[pid]) {
      const size = parseSize(l.size_text) || parseSize(l.name) || parseSize(l.raw);
      pid = productId(st, { brand: l.brand, name: l.name, size: l.unit === 'kg' ? { value: 1, unit: 'kg', label: '1 kg' } : size, category: l.category });
      if (pid) st.aliases[ak] = pid;
    }
    const line = { ...l, p: pid || null };
    r.lines.push(line);
    if (pid && l.unit_price) {
      const net = l.discount && l.qty ? r2((l.total - l.discount) / l.qty) : l.unit_price;
      const res = recordPrice(st, { store_name: st.stores[sid].name, product_name: st.products[pid].name, brand: st.products[pid].brand, size_text: st.products[pid].size ? st.products[pid].size.label : '', price: net, source: 'receipt', category: l.category }, at);
      if (res.last && res.last.pct >= 5) priceAlerts.push({ product: res.product, pct: res.last.pct });
    }
  }
  push(st.receipts, r, MAX.receipts);
  return { receipt_id: r.id, status: r.status, check: chk, rises: priceAlerts };
}
// Scontrino detto da Meta AI: righe "descrizione;quantità;prezzo" separate da "|".
export function parseItemsText(text) {
  return String(text || '').split('|').map((x) => x.split(';').map((y) => y.trim())).filter((a) => a[0]).map(([d, q, p]) => {
    const qn = num(q), pn = num(p);
    const kg = /kg/i.test(q || '');
    return { raw: d, name: d, qty: qn > 0 ? qn : 1, unit: kg ? 'kg' : 'pz', total: pn, category: 'spesa' };
  }).filter((l) => l.total != null);
}

// ---------- Bollette ----------
export function saveBill(st, input, now) {
  now = now || Date.now();
  const amount = num(input.amount);
  if (!(amount > 0)) return { error: 'amount' };
  const service = SERVICES.includes(normText(input.service)) ? normText(input.service) : 'altro';
  const b = { id: uid(), provider: str(input.provider, 40), service, from: parseDate(input.period_from), to: parseDate(input.period_to), amount: r2(amount), due: parseDate(input.due_date), cons: num(input.consumption), cons_unit: str(input.consumption_unit, 8), unit_cost: num(input.unit_cost), offer: str(input.offer_name, 60), paid: !!input.paid, at: now };
  if (b.cons > 0 && !(b.unit_cost > 0)) b.unit_cost = r3(b.amount / b.cons);
  const prev = st.bills.filter((x) => x.service === b.service && normText(x.provider) === normText(b.provider)).sort((a, c) => (c.to || c.at) - (a.to || a.at))[0];
  push(st.bills, b, MAX.bills);
  const res = { bill_id: b.id, due: b.due, amount: b.amount };
  if (prev) {
    const days = (x) => (x.from && x.to ? Math.max(1, (x.to - x.from) / 86400000) : null);
    const dNow = days(b), dPrev = days(prev);
    res.prev = { amount: prev.amount, diff: r2(b.amount - prev.amount) };
    if (dNow && dPrev) res.prev.per_day_pct = Math.round(((b.amount / dNow) / (prev.amount / dPrev) - 1) * 1000) / 10;
  }
  return res;
}
export function billPaid(st, id, paid) { const b = st.bills.find((x) => x.id === id); if (b) b.paid = paid !== false; return { ok: !!b }; }

// ---------- Movimenti dall'estratto conto ----------
// Categoria dalla descrizione del movimento, per gli estratti conto senza categoria.
const RULES = [
  ['bollette', /\b(enel|edison|a2a|hera|iren|eni plenitude|plenitude|sorgenia|acea|engie|illumia|octopus|tim|vodafone|windtre|wind tre|iliad|fastweb|sky wifi|ho mobile|very mobile|kena|acqua|brianzacque|bolletta)\b/],
  ['spesa', /\b(esselunga|coop|conad|carrefour|lidl|eurospin|md|aldi|iper|ipercoop|pam|penny|famila|tigros|bennet|despar|crai|unes|sigma|naturasi|il gigante|simply|supermercato|market|alimentari|panificio|macelleria)\b/],
  ['farmacia', /\b(farmacia|parafarmacia|ottica)\b/],
  ['trasporti', /\b(eni|enilive|q8|ip|tamoil|esso|shell|api|carburante|trenord|trenitalia|italo|atm|autostrade|telepass|uber|taxi|freenow|parcheggio|easypark)\b/],
  ['ristoranti', /\b(bar|caffe|ristorante|trattoria|pizzeria|osteria|sushi|mcdonald|burger king|kfc|deliveroo|just eat|glovo|starbucks)\b/],
  ['svago', /\b(netflix|spotify|disney|prime video|amazon prime|dazn|now tv|cinema|steam|playstation|xbox|nintendo|apple com bill|google play|palestra)\b/],
  ['casa', /\b(ikea|leroy merlin|brico|obi|mediaworld|unieuro|euronics|expert|maisons du monde|tedi|action)\b/],
  ['animali', /\b(zooplus|arcaplanet|maxi zoo|veterinari|veterinario)\b/],
  ['igiene', /\b(acqua e sapone|tigota|douglas|sephora|kiko|profumeria)\b/]
];
export const guessCat = (desc) => { const d = normText(desc); for (const [c, re] of RULES) if (re.test(d)) return c; return 'altro'; };
export function importTx(st, list, now) {
  now = now || Date.now();
  let added = 0, dup = 0, matched = 0;
  const seen = new Set(st.tx.map((t) => t.key));
  for (const x of (Array.isArray(list) ? list : []).slice(0, 2000)) {
    const amount = num(x.amount);
    const at = parseDate(x.date);
    if (amount == null || !at) continue;
    const desc = str(x.description, 90);
    const key = `${dayKey(at)}|${r2(amount)}|${normText(desc).slice(0, 40)}`;
    if (seen.has(key)) { dup++; continue; }
    seen.add(key);
    const given = x.category ? cleanCat(x.category) : 'altro';
    const t = { id: uid(), key, at, amount: r2(amount), desc, cat: given !== 'altro' ? given : guessCat(desc), match: null };
    // Un pagamento già registrato come scontrino o bolletta non si conta due volte.
    if (amount < 0) {
      const a = Math.abs(t.amount);
      const rc = st.receipts.find((r) => Math.abs(r.total - a) <= 0.01 && Math.abs(r.at - at) <= 3 * 86400000 && !st.tx.some((y) => y.match === 'r:' + r.id));
      const bl = !rc && st.bills.find((b) => Math.abs(b.amount - a) <= 0.01 && b.due && Math.abs(b.due - at) <= 15 * 86400000 && !st.tx.some((y) => y.match === 'b:' + b.id));
      if (rc) t.match = 'r:' + rc.id; else if (bl) { t.match = 'b:' + bl.id; bl.paid = true; }
      if (t.match) matched++;
    }
    push(st.tx, t, MAX.tx); added++;
  }
  return { added, dup, matched };
}

export function setBudget(st, input) {
  const out = {};
  for (const c of CATS) { const v = num(input && input[c]); if (v > 0) out[c] = r2(v); }
  const tot = num(input && input.total);
  if (tot > 0) out.total = r2(tot);
  st.budget = out;
  return { budget: out };
}
export function remove(st, kind, id) {
  const k = { receipt: 'receipts', bill: 'bills', tx: 'tx', obs: 'obs' }[kind];
  if (!k) return { removed: false };
  const i = st[k].findIndex((x) => x.id === id);
  if (i < 0) return { removed: false };
  const [gone] = st[k].splice(i, 1);
  if (kind === 'receipt') st.tx.forEach((t) => { if (t.match === 'r:' + gone.id) t.match = null; });
  if (kind === 'bill') st.tx.forEach((t) => { if (t.match === 'b:' + gone.id) t.match = null; });
  return { removed: true };
}

// ---------- Riepilogo: quello che vedono occhiali e telefono ----------
export function view(st, now, tz) {
  now = now || Date.now();
  const month = monthKey(now, tz);
  const inMonth = (t) => t && monthKey(t, tz) === month;
  const spent = Object.fromEntries(CATS.map((c) => [c, 0]));
  for (const r of st.receipts) {
    if (!inMonth(r.at)) continue;
    if (!r.lines.length) { spent.spesa += r.total; continue; }
    // Le righe danno la categoria; l'eventuale differenza col totale va alla categoria principale.
    let s = 0;
    for (const l of r.lines) { const v = (l.total || 0) - (l.discount || 0); spent[l.category] = (spent[l.category] || 0) + v; s += v; }
    if (Math.abs(r.total - s) > 0.02) spent.spesa += r.total - s;
  }
  for (const b of st.bills) if (inMonth(b.due || b.to || b.at)) spent.bollette += b.amount;
  for (const t of st.tx) if (t.amount < 0 && !t.match && inMonth(t.at)) spent[t.cat] = (spent[t.cat] || 0) - t.amount;
  const total = r2(Object.values(spent).reduce((a, b) => a + b, 0));
  const by_cat = CATS.map((c) => ({ cat: c, spent: r2(spent[c] || 0), limit: st.budget[c] || null })).filter((x) => x.spent > 0 || x.limit);
  // Rincari e cali: ultimo prezzo contro il precedente nello stesso negozio (180 giorni).
  const changes = [];
  const byKey = {};
  for (const o of st.obs) { const k = o.p + '@' + o.s; (byKey[k] = byKey[k] || []).push(o); }
  for (const list of Object.values(byKey)) {
    if (list.length < 2) continue;
    list.sort((a, b) => b.at - a.at);
    const [a, b] = list;
    if (now - a.at > 180 * 86400000 || b.price <= 0) continue;
    const pct = Math.round(((a.price - b.price) / b.price) * 1000) / 10;
    if (Math.abs(pct) >= 1) changes.push({ product: productLabel(st.products[a.p]), p: a.p, store: st.stores[a.s] ? st.stores[a.s].name : '', from: b.price, to: a.price, pct, at: a.at });
  }
  const rises = changes.filter((c) => c.pct > 0).sort((a, b) => b.pct - a.pct).slice(0, 8);
  const falls = changes.filter((c) => c.pct < 0).sort((a, b) => a.pct - b.pct).slice(0, 5);
  const day = 86400000, today = Date.parse(dayKey(now, tz) + 'T11:00:00Z');
  const due = st.bills.filter((b) => !b.paid && b.due).sort((a, b) => a.due - b.due).slice(0, 8).map((b) => ({ id: b.id, provider: b.provider, service: b.service, amount: b.amount, due: b.due, days: Math.round((b.due - today) / day) }));
  const receipts = st.receipts.slice().sort((a, b) => b.at - a.at).slice(0, 20).map((r) => ({ id: r.id, store: st.stores[r.s] ? st.stores[r.s].name : '', at: r.at, total: r.total, status: r.status, n: r.lines.length }));
  const recent = st.obs.slice().sort((a, b) => b.at - a.at).slice(0, 12).map((o) => ({ id: o.id, p: o.p, product: productLabel(st.products[o.p]), store: st.stores[o.s] ? st.stores[o.s].name : '', price: o.price, unit_price: o.up, unit: o.unit, at: o.at, src: o.src }));
  const stores = Object.values(st.stores).sort((a, b) => (b.last || 0) - (a.last || 0)).slice(0, 8).map((s) => s.name);
  const cur = st.current_store && now - st.current_store.at < 4 * 3600000 && st.stores[st.current_store.id] ? st.stores[st.current_store.id].name : null;
  return { code: st.code, month, total, budget_total: st.budget.total || null, by_cat, rises, falls, due, receipts, recent, stores, current_store: cur, alerts: st.alerts.slice(-6).reverse(), counts: { products: Object.keys(st.products).length, obs: st.obs.length, receipts: st.receipts.length, bills: st.bills.length, tx: st.tx.length } };
}
export function lists(st) {
  return {
    bills: st.bills.slice().sort((a, b) => (b.due || b.at) - (a.due || a.at)).slice(0, 60),
    tx: st.tx.slice().sort((a, b) => b.at - a.at).slice(0, 200).map((t) => ({ id: t.id, at: t.at, amount: t.amount, desc: t.desc, cat: t.cat, match: t.match })),
    receipts: st.receipts.slice().sort((a, b) => b.at - a.at).slice(0, 60).map((r) => ({ id: r.id, store: st.stores[r.s] ? st.stores[r.s].name : '', at: r.at, total: r.total, status: r.status, pay: r.pay, lines: r.lines.map((l) => ({ name: l.name, qty: l.qty, unit: l.unit, total: l.total, discount: l.discount, category: l.category })) })),
    budget: st.budget
  };
}
