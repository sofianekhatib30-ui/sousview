# LookView

Web app per Meta Ray-Ban Display: guardi un prodotto in negozio e trovi online lo stesso (o simili) con i prezzi a confronto. 5 lingue (it, en, fr, es, de).

- `index.html` — app per gli occhiali (600×600, D-pad, strumenti WebMCP per Meta AI: find_product, read_results, refine_results, save_result)
- `m.html` (servita come `/m`) — pagina telefono: foto del prodotto, risultati con link, salvati
- `api/cerca.js` — ricerca con Claude + web search limitata a negozi fidati per paese; serve `ANTHROPIC_API_KEY`
- `api/pair.js` — abbinamento occhiali ↔ telefono via codice di 6 caratteri (Vercel Blob privato)

Sorgenti e build: `source/app/build.py` nel workspace K Digital Solution.
