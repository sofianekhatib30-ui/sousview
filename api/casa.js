// CartView: tutte le operazioni sulla casa (occhiali e telefono). La casa è identificata da un codice di 8 caratteri.
import * as C from './_core.js';
import { load, loadOrNew, save, readJson, send } from './_store.js';
const WRITE = new Set(['price', 'undo', 'receipt', 'bill', 'bill_paid', 'tx', 'budget', 'remove']);
export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return send(res, 405, { error: 'method' }); }
  let b;
  try { b = await readJson(req, 1500000); } catch (e) { return send(res, 413, { error: 'too_big' }); }
  const code = String(b.code || '');
  if (!C.CODE_RE.test(code)) return send(res, 400, { error: 'bad_code' });
  const op = String(b.op || 'get');
  let tz = 'Europe/Rome';
  try { if (b.tz) { new Intl.DateTimeFormat('en', { timeZone: b.tz }); tz = b.tz; } } catch (e) { /* fuso non valido: Roma */ }
  try {
    const st = WRITE.has(op) ? await loadOrNew(code) : ((await load(code)) || C.emptyState(code));
    let result = null;
    switch (op) {
      case 'get': break;
      case 'price': result = C.recordPrice(st, b.input || {}); break;
      case 'undo': result = C.undoObs(st, String(b.id || '')); break;
      case 'lookup': result = C.lookup(st, String(b.query || ''), 3); break;
      case 'product': result = C.history(st, String(b.id || '')); break;
      case 'receipt': result = C.saveReceipt(st, b.input || {}); break;
      case 'bill': result = C.saveBill(st, b.input || {}); break;
      case 'bill_paid': result = C.billPaid(st, String(b.id || ''), b.paid); break;
      case 'tx': result = C.importTx(st, b.list); break;
      case 'budget': result = C.setBudget(st, b.input || {}); break;
      case 'remove': result = C.remove(st, String(b.kind || ''), String(b.id || '')); break;
      case 'lists': result = C.lists(st); break;
      default: return send(res, 400, { error: 'bad_op' });
    }
    if (result && result.error) return send(res, 422, { error: result.error });
    if (WRITE.has(op)) await save(st);
    return send(res, 200, { ok: true, result, view: C.view(st, Date.now(), tz) });
  } catch (e) { return send(res, 500, { error: 'server' }); }
}
