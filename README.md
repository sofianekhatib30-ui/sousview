# FixView

Riparazioni e fai-da-te passo passo per Meta Ray-Ban Display, a mani libere, in 5 lingue (it, en, fr, es, de).

- `index.html` (minificata), `data/`, `sw.js`, `icon.svg`, `.well-known/`: quello che Vercel pubblica.
- `source/app/`: sorgente leggibile dell'app e `build.py` (minifica e rigenera tutto in `dist/`).
- `source/guides/`: guide sorgente (`src/*.json`), `SPEC.md` con il formato, `tree.json`, `build_data.py` che valida e genera `data/`.

Aggiornare: modifica `source/`, poi `python3 source/app/build.py` e copia `dist/` nella radice del branch.

`source/` e questo README non vengono pubblicati (vedi `.vercelignore`).
