// Regole comuni: la forma di una scheda e la sua pulizia. Tutto ciò che arriva da fuori viene ripulito qui.
export const PATTERNS = ['squat', 'hinge', 'lunge', 'bench', 'pushup', 'press', 'pullup', 'row', 'curl', 'triceps', 'raise', 'plank', 'crunch', 'bridge', 'calf', 'jump', 'stretch', 'machine', 'dip'];
export const EQUIP = ['barbell', 'dumbbell', 'machine', 'cable', 'kettlebell', 'bodyweight', 'band'];
const str = (v, max) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max) : '');
const int = (v, lo, hi, def) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : def; };
const num = (v, lo, hi) => { const n = Number(v); return Number.isFinite(n) && n >= lo && n <= hi ? Math.round(n * 100) / 100 : null; };
const normName = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
export function libraryIndex(library) {
  const ids = new Set(library.map((x) => x.id));
  const byName = new Map();
  library.forEach((x) => [x.en, x.it, x.fr, x.es, x.de].forEach((n) => { const k = normName(n); if (k && !byName.has(k)) byName.set(k, x.id); }));
  return { has: (id) => ids.has(id), byName };
}
export function cleanProgram(p, libraryIds) {
  if (!p || typeof p !== 'object') return null;
  const days = (Array.isArray(p.days) ? p.days : []).slice(0, 7).map((d, di) => {
    const items = (Array.isArray(d && d.items) ? d.items : []).slice(0, 20).map((it) => {
      if (!it || typeof it !== 'object') return null;
      const name = str(it.name, 40);
      const ex = typeof it.ex === 'string' && libraryIds.has(it.ex) ? it.ex : (libraryIds.byName && libraryIds.byName.get(normName(name))) || null;
      if (!ex && !name) return null;
      const secs = int(it.seconds, 0, 600, 0);
      let lo = int(it.reps_min, 0, 100, 0), hi = int(it.reps_max, 0, 100, 0);
      if (!lo && hi) lo = hi; if (!hi && lo) hi = lo;
      if (hi < lo) [lo, hi] = [hi, lo];
      const kind = ['load', 'bw', 'time'].includes(it.kind) ? it.kind : secs && !lo ? 'time' : 'load';
      return {
        ex, name: name || null,
        pattern: PATTERNS.includes(it.pattern) ? it.pattern : 'machine',
        equipment: EQUIP.includes(it.equipment) ? it.equipment : kind === 'load' ? 'dumbbell' : 'bodyweight',
        kind,
        sets: int(it.sets, 1, 12, 3),
        reps_min: kind === 'time' ? null : lo || 10, reps_max: kind === 'time' ? null : hi || lo || 10,
        seconds: kind === 'time' ? secs || 30 : null,
        rest_seconds: int(it.rest_seconds, 0, 600, 90),
        weight_kg: num(it.weight_kg, 0.5, 500),
        note: str(it.note, 90) || null,
        superset: typeof it.superset === 'string' && /^[A-Za-z0-9]{1,3}$/.test(it.superset.trim()) ? it.superset.trim().toUpperCase() : null
      };
    }).filter(Boolean);
    return { name: str(d && d.name, 30) || `Day ${String.fromCharCode(65 + di)}`, items };
  }).filter((d) => d.items.length);
  if (!days.length) return null;
  return { name: str(p.name, 34) || 'My program', notes: str(p.notes, 240) || null, per_week: int(p.per_week, 1, 7, Math.min(days.length, 4)), days };
}
export async function readJson(req, max) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = []; let size = 0;
  for await (const c of req) { size += c.length; if (size > max) throw Object.assign(new Error('too_big'), { status: 413 }); chunks.push(c); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}
export const send = (res, status, obj) => { res.statusCode = status; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(obj)); };
