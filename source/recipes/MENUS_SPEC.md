# SousView curated menus — spec

File: `/home/claude/sousview-data/menus.json` → `{"menus": [MENU, ...]}`. Written by the menu curator only after all recipes exist.

MENU:
```json
{
  "id": "domenica-dalla-nonna",
  "courses": [ {"role": "antipasto", "id": "<recipe id>"}, {"role": "primo", "id": "..."}, ... ],
  "drinks":  [ {"role": "aperitivo", "id": "<recipe id from bevande/cocktail>"} ],   // optional, 0-2
  "diet": ["veg"],            // flags true for EVERY course (veg/vegan/gf/lf), computed honestly
  "months": [],               // when it makes most sense; [] = all year
  "i18n": { "it": {
      "title": "Domenica dalla nonna",           // ≤ 40 chars
      "intro": "…",                               // ≤ 140 chars: the idea of the evening
      "wine": "…",                                // ≤ 160 chars: wine / drink pairing by style and region (no brands), e.g. "Un Chianti Classico giovane, servito a 16 °C"; for alcohol-free menus suggest a non-alcoholic pairing
      "plan": ["…", "…"]                         // 3–6 lines, each ≤ 120 chars: the cook's game plan in order (what the day before, what first, what last-minute)
  }, "en": {…}, "fr": {…}, "es": {…}, "de": {…} }
}
```
- Roles: aperitivo, antipasto, primo, secondo, contorno, dolce, piatto-unico, colazione, bevanda.
- Every recipe id must exist. The validator checks this.
- A menu has 3 to 6 courses.
