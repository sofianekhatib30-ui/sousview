# SousView

Ricette passo passo per Meta Ray-Ban Display: 261 ricette in 5 lingue (it, en, fr, es, de), 22 menù, lista della spesa, timer automatici.

- `index.html`: app (minificata), servita da Vercel insieme a `data/`, `icon.svg`, `.well-known/`.
- `data/`: dati generati (indice, albero categorie, menù, reparti spesa, ricette per lingua e sottocategoria).
- `source/app/`: sorgente leggibile dell'app e script di build.
- `source/recipes/`: ricette sorgente (`src/*.json`), specifiche e `build_data.py` che valida e genera `data/`.

`source/` e questo README non vengono pubblicati (vedi `.vercelignore`).
