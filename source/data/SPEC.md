# LiftView exercise texts — spec

LiftView is a free gym and workout app for Meta Ray-Ban Display glasses (600×600 display, read at a glance between sets). Every exercise exists in it, en, fr, es, de.

`exercise_base.json` lists every exercise: id, movement pattern, equipment, kind (load = with weight, bw = bodyweight reps, time = held/timed), unilateral, muscles. You write only the texts for the ids you are given, in `src/<group>.json`:

```json
{"group": "A", "exercises": {
  "back-squat": {
    "it": {"n": "Squat con bilanciere", "al": ["Back squat", "Squat"], "cues": ["Bilanciere sui trapezi, piedi larghi come le spalle", "Scendi con la schiena dritta finché le cosce sono parallele"], "err": "Ginocchia che cadono verso l'interno: spingile in fuori"},
    "en": {...}, "fr": {...}, "es": {...}, "de": {...}
  }
}}
```

- `n` (2–32 chars): the name people use in a gym in that country. Keep English names where that's what gym-goers actually say there (it: "Hip thrust", "Leg press", "Lat machine"; de: "Kniebeuge", "Bankdrücken", "Kreuzheben"; fr: "Développé couché", "Soulevé de terre"; es: "Sentadilla", "Press de banca", "Peso muerto").
- `al` (0–4 aliases, 2–32 chars each): other names people search or say in that language, including the English gym name if it is commonly used. Used for voice and search.
- `cues` (exactly 2, 8–70 chars each): the two key form cues, imperative, informal "tu/you/tu/tú/du". Short enough to read in one glance. Neutral and safe: no medical, weight-loss or results claims.
- `err` (8–80 chars): the most common mistake and how to fix it.
- Write natively in each language like a personal trainer from that country, not a word-by-word translation. Do not copy text from websites or books.
- For timed exercises (kind "time"), cues describe the position to hold or the movement to repeat.
- For unilateral exercises, mention doing both sides where useful.

Validate with: `python3 check_ex.py src/<group>.json <comma-separated ids>` until it prints OK.
