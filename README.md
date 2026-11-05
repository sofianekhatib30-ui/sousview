# CartView

Web app per Meta Ray-Ban Display + pagina telefono: le spese di casa. Guardi il cartellino e sai subito se costa più dell'ultima volta o meno in un altro negozio; scontrini, bollette, estratti conto, budget e scadenze. 5 lingue (it, en, fr, es, de).

- `index.html`: app occhiali (600x600, D-pad, strumenti WebMCP: record_shelf_price, lookup_product, record_receipt, record_bill, get_spending_summary, get_due_bills)
- `m.html` (servita come `/m`): gestionale della casa sul telefono
- `api/casa.js`: tutte le operazioni sulla casa (codice di 8 caratteri, stato in Vercel Blob privato)
- `api/leggi.js`: lettura di cartellini, scontrini, bollette ed estratti conto PDF con Claude; serve `ANTHROPIC_API_KEY`
- `api/_core.js`: logica (prezzo al kg/litro, rincari, sconti falsi, sgrammature, controllo somme, budget)
