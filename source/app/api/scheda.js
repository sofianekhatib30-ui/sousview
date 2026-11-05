// Salva una scheda e la restituisce con un codice di 6 cifre, per passarla dal telefono agli occhiali.
import { put, get, head } from '@vercel/blob';
import { randomInt } from 'node:crypto';
import library from './_library.js';
import { cleanProgram, libraryIndex, readJson, send } from './_shared.js';
const ids = libraryIndex(library);
export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const code = String((req.query && req.query.code) || new URL(req.url, 'http://x').searchParams.get('code') || '');
      if (!/^\d{6}$/.test(code)) return send(res, 400, { error: 'bad_code' });
      const r = await get(`schede/${code}.json`, { access: 'private' });
      if (!r || r.statusCode !== 200) return send(res, 404, { error: 'not_found' });
      const text = await new Response(r.stream).text();
      return send(res, 200, JSON.parse(text));
    }
    if (req.method === 'POST') {
      const body = await readJson(req, 60000);
      const program = cleanProgram(body && body.program, ids);
      if (!program) return send(res, 400, { error: 'empty_program' });
      for (let i = 0; i < 8; i++) {
        const code = String(randomInt(0, 1000000)).padStart(6, '0');
        const exists = await head(`schede/${code}.json`).catch(() => null);
        if (exists) continue;
        await put(`schede/${code}.json`, JSON.stringify({ v: 1, at: Date.now(), program }), { access: 'private', contentType: 'application/json', addRandomSuffix: false });
        return send(res, 200, { code });
      }
      return send(res, 503, { error: 'busy' });
    }
    res.setHeader('Allow', 'GET, POST');
    return send(res, 405, { error: 'method' });
  } catch (e) {
    return send(res, e.status || 500, { error: e.status === 413 ? 'too_big' : 'server' });
  }
}
