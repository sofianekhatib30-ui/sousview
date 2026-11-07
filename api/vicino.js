// "Qui intorno" in qualunque città: monumenti, statue, chiese e palazzi vicini da Wikipedia (GeoSearch), con la loro posizione.
import { LANGS, getJson, send } from './_shared.js';
const SKIP = /^(via|viale|corso|vicolo|largo|stazione|fermata|linea|metropolitana|strada|street|road|avenue|rue|calle|straße|strasse|bahnhof|gare|station|hotel|albergo|ristorante|banca|ospedale|scuola|liceo|istituto|quartiere|municipio \d|zona|cap\b)/i;
export default async function handler(req, res) {
  const u = new URL(req.url, 'http://x');
  const lat = Number(u.searchParams.get('lat')), lon = Number(u.searchParams.get('lon'));
  const lang = LANGS.includes(u.searchParams.get('lang')) ? u.searchParams.get('lang') : 'en';
  if (!(Math.abs(lat) <= 90 && Math.abs(lon) <= 180) || (!lat && !lon)) return send(res, 400, { error: 'bad_position' });
  const q = (l) => getJson(`https://${l}.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&list=geosearch&gscoord=${lat.toFixed(5)}|${lon.toFixed(5)}&gsradius=600&gslimit=40&gsprimary=primary`, 4000);
  // Nella lingua dell'utente e nella lingua locale più probabile (italiano in Italia): i monumenti minori spesso hanno solo la voce locale.
  const langs = Array.from(new Set([lang, lat > 35 && lat < 47.5 && lon > 6 && lon < 19 ? 'it' : 'en']));
  const all = await Promise.all(langs.map(q));
  const seen = new Set(), out = [];
  all.forEach((d, i) => ((d && d.query && d.query.geosearch) || []).forEach((g) => {
    const k = Math.round(g.lat * 3000) + ':' + Math.round(g.lon * 3000);
    if (SKIP.test(g.title) || seen.has(k)) return;
    seen.add(k);
    out.push({ title: g.title, lang: langs[i], lat: g.lat, lon: g.lon, dist: Math.round(g.dist) });
  }));
  out.sort((a, b) => a.dist - b.dist);
  send(res, 200, { places: out.slice(0, 40) }, 'public, s-maxage=86400');
}
