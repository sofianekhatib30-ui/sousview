# SousView recipe data — spec (shared by every recipe writer)

SousView is a free cooking app for Meta Ray-Ban Display glasses. The display is 600×600 and shows one step per screen. Every recipe exists in 5 languages: it, en, fr, es, de.

## Files
- `tree.json`: categories, subcategories and filters with their names. Do not edit it.
- `src/<group>.json`: one source file per writer group. You write only your own file.
- `build_data.py`: validator and builder.
  - Run `python3 build_data.py check src/<group>.json` until it prints OK.
  - `python3 build_data.py build OUTDIR` writes `OUTDIR/data/...` for every source present.

## Source file format (`src/<group>.json`)
```json
{"group": "A", "recipes": [ RECIPE, ... ]}
```
RECIPE:
```json
{
  "id": "pasta-e-broccoli",            // kebab-case, ascii, unique across ALL groups (prefix nothing; just make it specific)
  "cat": "primi", "sub": "pasta",      // ids from tree.json
  "servings": 2,                       // 1..12 (cocktails/drinks usually 1)
  "minutes": 30,                       // total time incl. waiting, integer
  "diff": 1,                           // 1 easy, 2 medium, 3 demanding
  "kcal": 520,                         // per serving, realistic estimate, integer (drinks too)
  "diet": ["veg"],                     // any of: veg, vegan, gf, lf. vegan ⇒ also veg and lf. gf only if truly gluten-free with normal ingredients. lf = no milk/cheese/butter/cream/yogurt.
  "tags": ["nonna"],                   // any of: nonna, comfort, party, kids, healthy, festive, budget. "nonna" = traditional homestyle Italian or regional classic.
  "months": [10,11,12,1,2,3],          // months the key fresh ingredient is in season in Italy; [] = all year
  "origin": "IT",                      // ISO-3166 alpha-2 of the dish's origin
  "alcohol": false,                    // true only for drinks containing alcohol
  "ingredients": [ {"q": 160, "u": "g"}, {"q": 1, "u": ""}, {"q": null, "u": ""} ],
  "steps": [ {}, {"timer": 300}, {} ],  // timer in seconds (10..14400) on steps that involve waiting/cooking; omit otherwise
  "i18n": {
    "it": {"title": "Pasta e broccoli", "intro": "…", "ing": ["pasta corta", "spicchio d'aglio", "sale e pepe"], "steps": ["…","…","…"], "labels": ["", "Broccoli", ""]},
    "en": {…}, "fr": {…}, "es": {…}, "de": {…}
  }
}
```
Rules
- `ingredients[i]` (quantity and unit) pairs with `i18n.<lang>.ing[i]`, the name only, with no quantity.
- `steps[j]` pairs with `i18n.<lang>.steps[j]` and with `labels[j]`.
  - A label is required (1–16 chars, e.g. "Pasta", "Forno") when the step has a timer, and must be "" when it doesn't.
- Units, exactly as written: `g`, `ml`, `tbsp`, `tsp`, `pinch`, `""` (pieces, counted).
  - `q: null` means "to taste", and its unit must be `""`.
  - Use grams/ml, not cups or oz.
  - Use realistic quantities for the stated servings.
- Title: max 40 chars, the dish's real name in that language (keep well-known Italian/foreign names when that's what people say: "Carbonara", "Tiramisù", "Pad thai").
- Intro: one line, max 90 chars, what makes it good, no hype words.
- Steps:
  - 4–12 per recipe, each one concrete action.
  - Max 150 chars each, imperative mood, informal "tu" register in every language (it: "Scola", fr: "Égoutte", es: "Escurre", de: "Gieß … ab").
  - Include temperatures in °C and doneness cues ("finché è dorata").
- Timers: put one on every step where the cook waits (boiling, baking, resting, marinating, chilling). The timer value must be the real time. The `minutes` total must be ≥ the sum of timers/60.
- Translations must read as written by a native cook, not translated word by word. Use local ingredient names (e.g. en "heavy cream", de "Sahne", fr "crème entière", es "nata").
- Write every recipe yourself from cooking knowledge. Do not copy text from websites or books.
- Safety:
  - Cook chicken/pork through.
  - Mention raw-egg risk only where relevant (tiramisù: use very fresh eggs).
  - No medical or diet claims.
- Variety:
  - At least 40% of your recipes vegetarian, at least 20% vegan, and some naturally gluten-free.
  - Mix Italian classics (including regional "della nonna" dishes) with world dishes (Japan, Thailand, India, Mexico, Morocco, France, Spain, Greece, Middle East, USA, Korea, China, Germany…).
  - Spread across seasons.
  - No two recipes that are near-duplicates.

## Homemade or store-bought (added 2 Nov, 20:05) — IMPORTANT
Some ingredients can be bought ready or made at home. Mark these with `"make": "<base-id>"` on the ingredient, e.g. `{"q": 400, "u": "g", "make": "impasto-pasta-uovo"}`. The app then asks "Store-bought or homemade?". If the user picks homemade, it runs the base recipe's steps first, scaled by servings, and then the dish's own steps.
- The only allowed base ids, which are written by GROUP F (or B for gnocchi):
  - `impasto-pizza`: pizza dough. Servings = number of pizzas.
  - `impasto-pasta-uovo`: fresh egg pasta dough. Servings 4 = about 400 g.
  - `pasta-frolla`, `pasta-brisee`, `brodo-vegetale`, `brodo-pollo`.
  - `sugo-pomodoro`, `ragu-bolognese`, `pesto-genovese`, `besciamella`, `maionese`.
  - `piadina`: flatbreads.
  - `gnocchi-patate`: written by GROUP B in primi/fresca, as plain potato gnocchi with butter and sage.
- Use `make` wherever the dish uses one of those as an ingredient: lasagne, tagliatelle, ravioli, every pizza, crostata, quiche, risotto (broth), soups, pasta al pesto/ragù, etc.
- Write the dish's own steps so they work with the store-bought version, and give the store-bought cue in the step, e.g. "Cuoci la pasta fresca 2–3 minuti (se comprata, segui la confezione)" or "Stendi l'impasto (anche quello pronto del banco frigo) …".
- Do not repeat the base's preparation inside the dish.
- Base recipes are normal recipes in their own subcategory (basi/impasti, basi/sughi, basi/salse, forno/pane, primi/fresca). Their servings must match how they are used.

## Tips (added 2 Nov, 20:05) — IMPORTANT
Each recipe may have 0–3 tips, only where they truly add something. Most dishes deserve 1–3; a plain base or a simple drink may have none.
- Structure: `"tips": [{"k": "pair", "link": "salsa-verde"}, {"k": "spice"}]`. Each language gets a matching `"tips": ["…", "…"]` in its i18n block, with the same count and order.
- k is one of:
  - `twist`: a variant or swap, e.g. "Con la salsiccia sbriciolata diventa un piatto unico";
  - `pair`: a sauce, side or drink to serve with it;
  - `secret`: a cook's trick that really makes the difference;
  - `spice`: herbs or spices to add;
  - `leftover`: storing, reheating or using leftovers.
- `link` is optional. It is the id of another SousView recipe the tip points to, so the app can open it.
  - Use it only for ids you know exist: your own recipes or the canonical bases.
  - For other groups' dishes, write the tip without a link.
- Text: 5–120 chars per language. Make it concrete and specific to this dish, with no generic filler like "enjoy!". Write it as natively in each language as the steps.

## Cooking methods and background timers (added 2 Nov, 20:10) — IMPORTANT
### Methods (oven, air fryer, grill, bbq, pressure cooker…)
When a dish can realistically be cooked in more than one way, list the methods with the default first, and give per-step alternatives with their own times.
- Method ids come from `tree.json` "methods": oven, airfryer, pan, pot, pressure, grill, bbq, steam, microwave, slow, wok, fry.
- Example: roast potatoes ["oven","airfryer"]; chicken thighs ["oven","airfryer","bbq"]; steak ["pan","grill","bbq"]; chickpeas/beans/ragù ["pot","pressure"] or ["pot","slow"]; fried items ["fry","airfryer","oven"]; steamed veg ["steam","microwave","pot"].
- Recipe: `"methods": ["oven", "airfryer"]`.
- Step: `"alt": {"airfryer": {"timer": 1080}}`. Use `{}` if that method changes the text but needs no timer. Only steps that actually differ get `alt`.
- Text: in each language add `"alt": {"<step index>": {"airfryer": "Cuoci in friggitrice ad aria a 190 °C per 18 minuti, scuotendo il cestello a metà."}}`.
  - Keys must match the structure exactly.
  - Each text is max 150 chars, with temperature and time.
- An alternative with a timer requires the default step to have a timer too; the label is reused.
- Apply this wherever it makes sense: most meat, fish, vegetables, potatoes, legumes, fried food, some bakes and grains. Don't force it on pasta, cocktails or desserts that only work one way.
- The `minutes` total refers to the default method.
### Background timers
By default, when the cook moves to the next step, the timer of the step they leave is closed: they finished early, or it's done.
- Mark `"bg": true` on a timed step whose cooking keeps going while the next steps happen. Examples: "Butta la pasta" followed by "Intanto prepara il condimento"; dough rising while you prep; a roast in the oven while you make the sauce.
- Those timers stay in the top bar until they ring.
- The following step's text should make the parallelism explicit ("Intanto…").

## Shopping key on every ingredient (added 2 Nov, 20:12) — IMPORTANT, REQUIRED
The app builds shopping lists for a recipe or a whole menu. It merges the same ingredient across dishes and groups items by supermarket aisle. For that, EVERY ingredient needs `"k"`: a canonical English kebab-case key for the product you'd buy.
- Example: `{"q": 2, "u": "", "k": "garlic"}`.
- The same product must get the same key everywhere, even when the name differs: "spicchio d'aglio" and "aglio tritato" both → `garlic`.
- Be specific where it matters for shopping:
  - `extra-virgin-olive-oil` vs `sunflower-oil`;
  - `parmigiano-reggiano`, `pecorino-romano`;
  - `spaghetti`, `short-pasta`, `egg-tagliatelle`;
  - `canned-tomatoes`, `tomato-passata`, `fresh-tomatoes`;
  - `chicken-breast`, `ground-beef`;
  - `lemon`, `lemon-juice` → `lemon` (you buy lemons);
  - `water` for water;
  - `salt`, `black-pepper`.
- For a base with `make`, use the base's product key, e.g. `fresh-egg-pasta`, `pizza-dough`, `vegetable-broth`, `tomato-sauce`, `bechamel`.
- The validator now requires it. Add it to the recipes you've already written.

## base_steps (added 2 Nov, 20:30)
A base recipe that ends with serving or saucing steps, which must not run when it is used as the "homemade" phase of another dish, sets `"base_steps": N`. Only its first N steps are used as a base; standalone, the whole recipe is shown. Example: gnocchi-patate → 6, which stops after shaping the gnocchi.
