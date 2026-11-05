// Lettura e scrittura dello stato di una casa nel Blob privato.
import { put, get } from '@vercel/blob';
import { emptyState } from './_core.js';
const path = (code) => `casa/${code}/stato.json`;
export async function load(code) {
  const r = await get(path(code), { access: 'private', useCache: false }).catch(() => null);
  if (!r || r.statusCode !== 200) return null;
  return JSON.parse(await new Response(r.stream).text());
}
export const loadOrNew = async (code) => (await load(code)) || emptyState(code);
export const save = (st) => put(path(st.code), JSON.stringify(st), { access: 'private', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true });
export async function readJson(req, max) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = []; let size = 0;
  for await (const c of req) { size += c.length; if (size > max) throw Object.assign(new Error('too_big'), { status: 413 }); chunks.push(c); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}
export const send = (res, status, obj) => { res.statusCode = status; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(obj)); };
