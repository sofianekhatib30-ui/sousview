# GuideView

Web app per Meta Ray-Ban Display + pagina telefono: guardi un quadro, una statua o un monumento e ascolti tutta la sua storia (cos'è, la storia, la vita dell'autore, curiosità vere, cosa guardare), con le fonti. Si parte da una foto col telefono o da ciò che Meta AI legge sulla didascalia. In città, "Qui intorno" usa posizione e bussola per i monumenti davanti a te, in qualunque città. Tour a piedi a Milano e Monza. 5 lingue (it, en, fr, es, de). Città della demo: Milano e Monza.

- `index.html`: app occhiali (600x600, D-pad, strumenti WebMCP: explain_what_i_see, whats_in_front_of_me, tell_me_more, start_walking_tour, save_place)
- `m.html` (servita come `/m`): preferiti, diario e guida della città sul telefono
- `data/<lingua>.json`: tappe e tour
- `api/opera.js`: riconoscimento e racconto a capitoli con Claude (visione + ricerca web, solo fonti uscite dalla ricerca, cache nel Blob); serve `ANTHROPIC_API_KEY`
- `api/vicino.js`: monumenti vicini da Wikipedia in qualunque città
- `api/wiki.js`, `api/cerca.js`, `api/coord.js`: Wikipedia e Wikidata (fonti aperte, sempre citate)
- `api/pair.js`: abbinamento occhiali e telefono (Vercel Blob privato)
