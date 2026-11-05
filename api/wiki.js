// Livello "esperto": la voce di Wikipedia nella lingua scelta, citata con licenza. Nessun testo inventato.
import { LANGS, clip, extract, getJson, send, sitelink, str } from './_shared.js';
export default async function handler(req, res) {
  const u = new URL(req.url, 'http://x');
  let qid = str(u.searchParams.get('qid'), 16);
  const it = str(u.searchParams.get('it'), 120);
  const lang = LANGS.includes(u.searchParams.get('lang')) ? u.searchParams.get('lang') : 'en';
  // Senza QID si parte dal titolo della voce italiana.
  if (!/^Q\d{1,10}$/.test(qid) && it) {
    const d = await getJson(`https://it.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&redirects=1&prop=pageprops&ppprop=wikibase_item&titles=${encodeURIComponent(it)}`);
    const pg = d && d.query && d.query.pages && d.query.pages[0];
    qid = (pg && pg.pageprops && pg.pageprops.wikibase_item) || '';
  }
  if (!/^Q\d{1,10}$/.test(qid)) return send(res, 400, { error: 'bad_qid' });
  const sl = await sitelink(qid, lang);
  if (!sl) return send(res, 404, { error: 'not_found' }, 'public, s-maxage=3600');
  let ex = await extract(sl.lang, sl.title, false);
  if (!ex) return send(res, 404, { error: 'not_found' }, 'public, s-maxage=3600');
  // Testo pulito: via le intestazioni rimaste e le sezioni finali (note, bibliografia, collegamenti).
  let text = ex.text.split(/\n\s*(Note|Bibliografia|Voci correlate|Altri progetti|Collegamenti esterni|References|See also|External links|Further reading|Notes|Références|Liens externes|Voir aussi|Referencias|Enlaces externos|Véase también|Einzelnachweise|Literatur|Weblinks|Siehe auch)\s*\n/)[0];
  text = text.split('\n').map((x) => x.trim()).filter((x) => x.length > 60).join('\n');
  send(res, 200, { qid, lang: sl.lang, title: ex.title, text: clip(text, 2600), url: ex.url, source: 'Wikipedia', license: 'CC BY-SA 4.0' }, 'public, s-maxage=86400, stale-while-revalidate=604800');
}
