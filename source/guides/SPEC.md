# FixView guide data — spec (shared by every guide writer)

FixView is a free hands-free DIY and repair app for Meta Ray-Ban Display glasses. The display is 600×600, monocular and additive (black is transparent), and shows ONE short step per screen while the user works with their hands. Every guide exists in 5 languages: it, en, fr, es, de. Users are in Italy, the UK, France, Spain, Germany and the USA.

`example.json` is a complete, valid guide. Read it first and match its tone, length and structure.

## Files
- `tree.json`: categories, step icons, topics, countries, PPE ids. Do not edit it.
- `src/<group>.json`: your file only: `{"group": "X", "guides": [GUIDE, ...]}`.
- Validate with `python3 build_data.py check src/<group>.json` until it prints OK.

## GUIDE fields
- `id`: kebab-case ascii, specific, unique (e.g. `sturare-lavandino`).
- `cat`: a category id from tree.json.
- `diff`: 1 easy (anyone), 2 medium (some practice), 3 demanding.
- `active`: hands-on minutes. `total`: total minutes including waiting (drying, curing, cooling). Integers.
- `risk`: 0 safe; 1 caution (tools, ladders, chemicals, hot water); 2 serious (mains electricity, bike/car brakes, blades, work at height); 3 professional only (gas, boilers, consumer unit/fuse box, new circuits) → a "pro card" (see below).
- `topic`: what the main hazard is, one of tree.json topics, or null. Required when risk ≥ 2. It drives the app's safety checklist (elec: power off and tested; height: ladder; vehicle: parked, engine off; blade: unplugged/spark plug off; gas; water; chem; power-tools).
- `allow`: per-country exceptions, `{"DE": "pro"}`. Values: `ok` (default, omit), `warn` (allowed but show a legal note), `pro` (the app shows "call a professional" instead of the steps in that country). Rules we follow:
  - Replacing a socket, switch or light fitting like-for-like on an existing circuit: `{"DE": "pro", "IT": "warn", "UK": "warn", "FR": "warn", "ES": "warn", "US": "warn"}`.
  - Anything on gas, boilers, consumer units or new circuits: risk 3 pro card everywhere.
  - Everything else: no `allow`.
- `ppe`: any of `gloves`, `glasses`, `mask`, `ears`. Only what's really needed.
- `tags`: `["emergency"]` for urgent home problems (blocked drain, leak, water to shut off, tripped breaker, gas smell). Otherwise `[]`.
- `months`: months when the job is most relevant in Europe (e.g. snow chains [11,12,1,2,3]); `[]` = any time.
- `tools`: `[{"k": "adjustable-wrench"}]` — things you use and keep. `mats`: `[{"k": "silicone-sealant", "q": 1, "u": ""}]` — things you consume or buy.
  - `k`: canonical English kebab-case key for the product; same thing → same key everywhere (`cloth`, `bucket`, `phillips-screwdriver`, `flat-screwdriver`, `drill`, `spirit-level`, `tape-measure`, `pencil`, `utility-knife`, `sandpaper`, `masking-tape`, `silicone-sealant`, `wall-plugs`, `screws`…).
  - `own: true` on everyday things most homes already have (cloth, bucket, old towel, scissors, basic screwdriver). The app lists them apart.
  - mats `q` + `u`: units `""` (pieces), `ml`, `l`, `g`, `kg`, `mm`, `cm`, `m`, `m2`. `q: null` = "as needed" with `u: ""`. Metric only: the app converts for US users.
  - 0–7 tools and 0–7 mats. Keep it honest and minimal.
- `steps`: 4–12 per guide (pro cards 3–6). Each step object:
  - `ic` (required): a pictogram from tree.json `icons` that shows the action (loosen, tighten, drill, measure, wait, clean, power-off, water-off, look, check…).
  - `timer`: seconds (10–172800) on every step where the user must WAIT: drying, curing, soaking, cooling, glue setting, letting water drain. Real times. Needs a label (below).
  - `bg: true` on a timed step whose waiting continues while the next steps happen (e.g. limescale remover soaking while you clean something else). The next step's text should say "Meanwhile…".
  - `check: true`: a mid-job checkpoint, a yes/no question the user verifies before going on ("Is the shelf level?"). Needs `checks` text. Put 1–3 checkpoints in most guides, at the moments where mistakes happen.
  - `warn`: 1 = a safety note shown on that step; 2 = blocking: the user must confirm before moving on (use for "power off and test", "engine off", "unplug"). Needs `warns` text.
- `tips`: the NUMBER of tips (0–3); texts go in i18n.
- `pro: true` only for risk 3 pro cards: 3–6 steps that tell the user what they CAN safely do (spot the problem, make it safe, what to tell the pro, what qualification to ask for), never how to do the job itself. No timers. Needs `why` text.

## i18n (each of it, en, fr, es, de)
- `title`: ≤ 42 chars, the way people search for it ("Sturare il WC", "Unblock a toilet", "Déboucher les WC", "Desatascar el váter", "Toilette verstopft").
- `intro`: ≤ 100 chars, one line: when you need this and what you get. No hype.
- `tools`, `mats`: names only, same order as the arrays. Use local product names (it "tassello", en-UK/US neutral "wall plug", fr "cheville", es "taco", de "Dübel").
- `steps`: one text per step, ≤ 140 chars. ONE concrete action, imperative, informal "tu/you/tu/tú/du" register. Readable at a glance with hands busy. Include the cue that tells the user they've done it right ("until it stops dripping"). No "Step 1:" prefixes.
- `labels`: one per step: a 1–16 char name for the timer ("Asciugatura", "Drying", "Séchage", "Secado", "Trocknen") on timed steps, `""` otherwise.
- `checks`: `{"<step index>": {"q": "≤90 chars yes/no question", "fix": "≤140 chars: what to do if the answer is no"}}`.
- `warns`: `{"<step index>": "≤110 chars"}`.
- `tips`: ≤ 120 chars each: a real trick, a variant, or "when to stop and call someone". No filler.
- `gate` (optional, 0–3 items, same count in every language, ≤ 80 chars): extra confirmations specific to this guide, asked before starting (e.g. "I have closed the water under the sink"). The app already adds the generic ones for the topic.
- `why` (pro cards only, ≤ 140 chars): why this is a job for a professional.

## Measurements in text
Write every measure in a step, check, warn or tip as a token: `[[6 mm]]`, `[[20 cm]]`, `[[2 m]]`, `[[10 m2]]`, `[[5 l]]`, `[[250 ml]]`, `[[2.2 bar]]`, `[[40 °C]]`, ranges `[[1-1.5 bar]]`. Decimal point, not comma. Units: mm cm m m2 l ml g kg bar °C. The app shows them metric or imperial and in the right number format. Keep the token identical in all 5 languages.

## Writing rules
- Write every guide yourself from practical knowledge. Do not copy text from iFixit, wikiHow, Instructables, manufacturers or any website or book.
- Each language must read as written by a native handy person, not translated word by word. Use the right local names (tapparella / roller shutter / volet roulant / persiana / Rollladen; WC flush mechanisms differ: describe generically, "the float or the fill valve").
- Be generic enough to work across countries: different socket types, radiator valves, tap styles. Say "usually" where models differ, and tell the user to check the product's manual where that matters.
- Safety first, never alarmist: say when to stop ("If the pipe is cracked, stop and call a plumber").
- Mains electricity steps always start with power off at the breaker and a voltage tester check (warn 2).
- No medical claims. Chemicals: never mix bleach with acids or ammonia; ventilate.
- Times and quantities must be realistic.
