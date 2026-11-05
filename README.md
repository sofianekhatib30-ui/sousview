# LiftView

La scheda di palestra sugli occhiali Meta Ray-Ban Display: serie, ripetizioni, carichi e recuperi a colpo d'occhio, in 5 lingue (it, en, fr, es, de). Nessuna fotocamera, dati solo sul dispositivo.

- `index.html` (minificata), `data/`, `sw.js`, `icon.svg`, `.well-known/`: quello che Vercel pubblica.
- `source/app/`: sorgente leggibile e `build.py` (rigenera tutto in `dist/`).
- `source/data/`: `exercise_base.json` (66 esercizi), `src/A.json` e `src/B.json` (testi in 5 lingue), `programs.json` (9 schede), `SPEC.md`, `check_ex.py`.

## Carica la tua scheda
- `carica.html`: pagina per telefono/computer. Si carica un PDF, una foto o il testo della scheda del personal trainer, si controlla e si ottiene un codice di 6 cifre.
- `api/leggi.js`: legge la scheda con Claude (serve `ANTHROPIC_API_KEY` nelle variabili d'ambiente del progetto Vercel; `LIFTVIEW_MODEL` opzionale). Senza chiave la pagina passa alla scrittura a mano.
- `api/scheda.js`: salva la scheda nell'archivio Vercel Blob privato `liftview-schede` (fra1) e la restituisce con il codice.
- Sugli occhiali: Schede → Carica la tua scheda → codice, oppure "Ehi Meta, carica la scheda 123456".
