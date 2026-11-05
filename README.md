# LookView

Web app per Meta Ray-Ban Display: guardi un prodotto qualsiasi e trovi dove costa meno in tutto il mondo (stesso prodotto o simili), dal prezzo più basso. 5 lingue (it, en, fr, es, de).

- `index.html` — app per gli occhiali (600×600, D-pad, strumenti WebMCP per Meta AI: find_product, read_results, save_result)
- `m.html` (servita come `/m`) — pagina telefono: foto del prodotto, risultati con link, salvati
- `api/cerca.js` — ricerca mondiale con Claude + web search (solo link restituiti davvero dalla ricerca), prezzi convertiti con i cambi BCE; serve `ANTHROPIC_API_KEY`
- `api/pair.js` — abbinamento occhiali ↔ telefono via codice di 6 caratteri (Vercel Blob privato)

Sorgenti e build: `source/app/build.py` nel workspace K Digital Solution.
