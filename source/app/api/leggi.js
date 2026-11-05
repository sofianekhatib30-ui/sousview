// Legge una scheda di allenamento (PDF, foto o testo) con Claude e la restituisce strutturata.
// Serve la variabile d'ambiente ANTHROPIC_API_KEY nel progetto Vercel.
import library from './_library.js';
import { PATTERNS, EQUIP, cleanProgram, libraryIndex, readJson, send } from './_shared.js';
const ids = libraryIndex(library);
const MODEL = process.env.LIFTVIEW_MODEL || 'claude-sonnet-5-5';
const LIB = library.map((x) => `${x.id} = ${x.en} / ${x.it}`).join('\n');
const PROMPT = `You read a gym workout program written by a personal trainer (any language, possibly a photo of paper, a table, a PDF) and return it as JSON for a workout app.

Return ONLY a JSON object, no prose, with this shape:
{"name": string (short program name, max 34 chars; use the sheet's title or "Scheda di <trainer/client>" in the sheet's language),
 "notes": string|null (general notes from the trainer, max 240 chars),
 "per_week": number|null,
 "days": [{"name": string (as written: "Giorno A", "Monday", "Push", max 30 chars),
   "items": [{"ex": string|null (the matching id from the LIBRARY below, only if it is clearly the same exercise, else null),
     "name": string (the exercise name exactly as written on the sheet),
     "pattern": one of ${PATTERNS.join(', ')},
     "equipment": one of ${EQUIP.join(', ')},
     "kind": "load" (with weight) | "bw" (bodyweight reps) | "time" (held or timed),
     "sets": number, "reps_min": number|null, "reps_max": number|null (e.g. "4x8-10" → sets 4, 8, 10; "3x12" → 12, 12; "piramidale 12-10-8" → sets 3, 8, 12),
     "seconds": number|null (for timed work, e.g. plank 45"),
     "rest_seconds": number|null (recupero/rest/récup/descanso/Pause: 90", 1'30" = 90, 2' = 120),
     "weight_kg": number|null (if a load is written; convert lb to kg),
     "note": string|null (technique notes like tempo 3-1-1, RIR, "fermo 2 secondi", max 90 chars, in the sheet's language),
     "superset": string|null (same letter for exercises done back to back: "superserie", "SS", "A1/A2", "+")}]}]}

Rules: keep the order of the sheet. If the sheet has no days, put everything in one day. Do not invent exercises, sets or weights that are not on the sheet; use null when something is missing. If the document is not a workout program, return {"days": []}.

LIBRARY (id = English / Italian):
${LIB}`;
export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return send(res, 405, { error: 'method' }); }
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return send(res, 503, { error: 'no_key' });
  let body;
  try { body = await readJson(req, 4400000); } catch (e) { return send(res, 413, { error: 'too_big' }); }
  const { kind, data, media } = body || {};
  let content;
  if (kind === 'text' && typeof data === 'string' && data.trim()) content = [{ type: 'text', text: 'WORKOUT SHEET:\n' + data.slice(0, 20000) }];
  else if (kind === 'pdf' && typeof data === 'string') content = [{ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data } }];
  else if (kind === 'image' && typeof data === 'string' && /^image\/(jpeg|png|webp|gif)$/.test(media || '')) content = [{ type: 'image', source: { type: 'base64', media_type: media, data } }];
  else return send(res, 400, { error: 'bad_input' });
  content.push({ type: 'text', text: 'Convert this workout sheet to the JSON described. JSON only.' });
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: MODEL, max_tokens: 4000, system: PROMPT, messages: [{ role: 'user', content }] })
    });
    if (!r.ok) return send(res, 502, { error: 'ai_failed', status: r.status });
    const out = await r.json();
    const text = (out.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('');
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return send(res, 422, { error: 'not_a_program' });
    const program = cleanProgram(JSON.parse(m[0]), ids);
    if (!program) return send(res, 422, { error: 'not_a_program' });
    return send(res, 200, { program });
  } catch (e) {
    return send(res, 502, { error: 'ai_failed' });
  }
}
