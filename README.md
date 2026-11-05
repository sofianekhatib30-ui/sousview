# GuideView

Web app per Meta Ray-Ban Display + pagina telefono: guida a piedi a mani libere. Guardi un monumento e scopri cosa hai davanti (posizione del telefono + bussola degli occhiali, niente fotocamera), con testo breve, racconto di 2 minuti e approfondimento da Wikipedia citato. Tour a piedi con freccia. 5 lingue (it, en, fr, es, de). Città della demo: Milano e Monza.

- `index.html`: app occhiali (600x600, D-pad, strumenti WebMCP: explain_what_i_see, whats_in_front_of_me, tell_me_more, start_walking_tour, save_place)
- `m.html` (servita come `/m`): preferiti, diario e guida della città sul telefono
- `data/<lingua>.json`: tappe e tour
- `api/wiki.js`, `api/cerca.js`, `api/coord.js`: Wikipedia e Wikidata (fonti aperte, sempre citate)
- `api/pair.js`: abbinamento occhiali e telefono (Vercel Blob privato)
