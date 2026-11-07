#!/usr/bin/env python3
"""Validate and build SousView recipe data.

  python3 build_data.py check src/A.json [src/B.json ...]   validate (prints OK or errors)
  python3 build_data.py build OUTDIR [--only src/A.json ...] write OUTDIR/data/... and print sha1/size
"""
import json, sys, os, glob, hashlib, re

HERE = os.path.dirname(os.path.abspath(__file__))
TREE = json.load(open(os.path.join(HERE, 'tree.json'), encoding='utf-8'))
LANGS = TREE['langs']
SUBS = {c['id']: {s['id'] for s in c['subs']} for c in TREE['cats']}
UNITS = {'g', 'ml', 'tbsp', 'tsp', 'pinch', ''}
DIET = {'veg', 'vegan', 'gf', 'lf'}
METHODS = {m['id'] for m in TREE.get('methods', [])}
TIPK = {'twist', 'pair', 'secret', 'spice', 'leftover'}
TAGS = {'nonna', 'comfort', 'party', 'kids', 'healthy', 'festive', 'budget'}
# Singolare e plurale dei nomi contati senza unità ("1 cipolla", "2 cipolle"): forms.json, per lingua.
_FP = os.path.join(HERE, 'forms.json')
FORMS = json.load(open(_FP, encoding='utf-8')) if os.path.exists(_FP) else {}
# Proteina principale per i filtri della cucina: carne, pollame, pesce (dalle chiavi degli ingredienti).
P_POULTRY = re.compile(r'^(chicken(?!-broth|-stock)|whole-chicken|turkey|duck|ground-chicken)')
P_FISH = re.compile(r'^(mackerel|sea-bream|bream|hake|catfish|seafood|mixed-seafood|squid|cuttlefish|fish-fillet|white-fish|monkfish|trout|halibut|sea-bass|prawns|king-prawns|mussels|anchov|canned-tuna|tuna|clams|mussels|octopus|salmon|sardines|shrimp|prawn|squid|soaked-stockfish|stockfish|cod|sushi-grade|swordfish|white-fish|whole-sea-bass|sea-bass|whole-sole|sole|crab|scallop|lobster)')
P_MEAT = re.compile(r'^(beef(?!-broth)|minced-(beef|pork|lamb|meat)|lamb|mutton|goat|ground-(beef|pork|lamb|veal|meat)|pork|lamb|veal|bacon|smoked-bacon|pancetta|guanciale|prosciutto|cooked-ham|ham($|-)|salami|smoked-sausage|sausage|chorizo|bolognese|mortadella|speck|nduja)')
def proteins(r):
    if 'veg' in r.get('diet', []) or 'vegan' in r.get('diet', []): return []
    ks = [x.get('k') or '' for x in r['ingredients']] + [x.get('make') or '' for x in r['ingredients']]
    out = []
    if any(P_MEAT.match(k) or k == 'ragu-bolognese' for k in ks): out.append('meat')
    if any(P_POULTRY.match(k) for k in ks): out.append('poultry')
    if any(P_FISH.match(k) for k in ks): out.append('fish')
    return out
ID_RE = re.compile(r'^[a-z0-9]+(-[a-z0-9]+)*$')
BASES = {'impasto-pizza', 'impasto-pasta-uovo', 'pasta-frolla', 'pasta-brisee', 'brodo-vegetale', 'brodo-pollo',
         'sugo-pomodoro', 'ragu-bolognese', 'pesto-genovese', 'besciamella', 'maionese', 'piadina', 'gnocchi-patate', 'dashi'}


def load(path):
    d = json.load(open(path, encoding='utf-8'))
    return d.get('recipes', [])


def validate(recipes, where, seen):
    errs = []
    for n, r in enumerate(recipes):
        rid = r.get('id', f'#{n}')
        e = lambda m: errs.append(f'{where}:{rid}: {m}')
        if not ID_RE.match(str(r.get('id', ''))): e('bad id')
        if rid in seen: e(f'duplicate id (also in {seen[rid]})')
        seen[rid] = where
        if r.get('cat') not in SUBS: e('bad cat'); continue
        if r.get('sub') not in SUBS[r['cat']]: e('bad sub for cat')
        for k, lo, hi in (('servings', 1, 12), ('minutes', 1, 1440), ('diff', 1, 3), ('kcal', 0, 2500)):
            v = r.get(k)
            if not isinstance(v, int) or not lo <= v <= hi: e(f'{k} must be int {lo}..{hi}')
        diet = r.get('diet', [])
        if not isinstance(diet, list) or not set(diet) <= DIET: e('bad diet')
        if 'vegan' in diet and not {'veg', 'lf'} <= set(diet): e('vegan needs veg and lf')
        if not isinstance(r.get('tags', []), list) or not set(r.get('tags', [])) <= TAGS: e('bad tags')
        m = r.get('months', [])
        if not isinstance(m, list) or any(not isinstance(x, int) or not 1 <= x <= 12 for x in m): e('bad months')
        if not re.match(r'^[A-Z]{2}$', str(r.get('origin', ''))): e('bad origin')
        if not isinstance(r.get('alcohol', False), bool): e('alcohol must be bool')
        ing = r.get('ingredients', []); st = r.get('steps', [])
        if not 1 <= len(ing) <= 30: e('ingredients count')
        if not 3 <= len(st) <= 14: e('steps count 3..14')
        for i, x in enumerate(ing):
            if x.get('u') not in UNITS: e(f'ing {i} bad unit {x.get("u")!r}')
            q = x.get('q')
            if q is None:
                if x.get('u') != '': e(f'ing {i} q null needs unit ""')
            elif not isinstance(q, (int, float)) or q <= 0: e(f'ing {i} bad q')
            if set(x) - {'q', 'u', 'make', 'k'}: e(f'ing {i} unknown keys')
            if not ID_RE.match(str(x.get('k', ''))): e(f'ing {i} needs "k" (canonical english kebab-case shopping key, e.g. "garlic")')
            if 'make' in x:
                if not ID_RE.match(str(x['make'])): e(f'ing {i} bad make id')
                elif x['make'] not in BASES: e(f'ing {i} make must be one of the canonical base ids in SPEC.md')
        tsum = 0
        for j, s in enumerate(st):
            if 'timer' in s:
                t = s['timer']
                if not isinstance(t, int) or not 10 <= t <= 14400: e(f'step {j} bad timer')
                else: tsum += t
            if set(s) - {'timer', 'bg', 'alt'}: e(f'step {j} unknown keys')
            if s.get('bg') and 'timer' not in s: e(f'step {j} bg needs timer')
            if 'bg' in s and s['bg'] is not True: e(f'step {j} bg must be true or absent')
            if 'alt' in s:
                if not isinstance(s['alt'], dict) or not s['alt']: e(f'step {j} alt must be a non-empty object')
                else:
                    for mk, mv in s['alt'].items():
                        if mk not in r.get('methods', [])[1:]: e(f'step {j} alt method {mk} must be in methods (not the first/default)')
                        if not isinstance(mv, dict) or set(mv) - {'timer'}: e(f'step {j} alt {mk} must be {{}} or {{"timer": n}}')
                        elif 'timer' in mv and (not isinstance(mv['timer'], int) or not 10 <= mv['timer'] <= 14400): e(f'step {j} alt {mk} bad timer')
                        elif 'timer' in mv and 'timer' not in s: e(f'step {j} alt {mk} has timer but default step has none (give the default step a timer too, or none on both)')
        if isinstance(r.get('minutes'), int) and r['minutes'] * 60 < tsum: e(f'minutes {r["minutes"]} < timers {tsum // 60}')
        if 'base_steps' in r and (not isinstance(r['base_steps'], int) or not 1 <= r['base_steps'] < len(st)): e('base_steps must be int 1..len(steps)-1')
        meth = r.get('methods', [])
        if not isinstance(meth, list) or len(meth) == 1 or len(set(meth)) != len(meth) or not set(meth) <= METHODS: e(f'methods must be absent/[] or 2+ distinct of {sorted(METHODS)} (first = default)')
        if len(meth) >= 2 and not any(meth[1] in s.get('alt', {}) for s in st): e('methods listed but no step has alt variants')
        tips = r.get('tips', [])
        if not isinstance(tips, list) or len(tips) > 3: e('tips must be a list of max 3')
        else:
            for k, tp in enumerate(tips):
                if not isinstance(tp, dict) or tp.get('k') not in TIPK or set(tp) - {'k', 'link'}: e(f'tip {k} bad (k in {sorted(TIPK)}, optional link)')
                elif 'link' in tp and not ID_RE.match(str(tp['link'])): e(f'tip {k} bad link id')
        tr = r.get('i18n', {})
        for L in LANGS:
            t = tr.get(L)
            if not t: e(f'missing {L}'); continue
            if not 2 <= len(t.get('title', '')) <= 40: e(f'{L} title length')
            if not 5 <= len(t.get('intro', '')) <= 90: e(f'{L} intro length {len(t.get("intro", ""))}')
            if len(t.get('ing', [])) != len(ing): e(f'{L} ing count {len(t.get("ing", []))} != {len(ing)}')
            if len(t.get('steps', [])) != len(st): e(f'{L} steps count')
            if len(t.get('labels', [])) != len(st): e(f'{L} labels count')
            for j, s in enumerate(t.get('steps', [])):
                if not 3 <= len(s) <= 150: e(f'{L} step {j} length {len(s)}')
            for j, lab in enumerate(t.get('labels', [])):
                if j < len(st):
                    has = 'timer' in st[j]
                    if has and not 1 <= len(lab) <= 16: e(f'{L} label {j} needed (1..16 chars)')
                    if not has and lab: e(f'{L} label {j} must be empty')
            alt_t = t.get('alt', {})
            want = {str(j): set(s.get('alt', {})) for j, s in enumerate(st) if s.get('alt')}
            got = {k: set(v) for k, v in alt_t.items()} if isinstance(alt_t, dict) else {}
            if want != got: e(f'{L} alt texts must match steps alt exactly: want {want}, got {got}')
            else:
                for k, v in alt_t.items():
                    for mk, txt in v.items():
                        if not isinstance(txt, str) or not 3 <= len(txt) <= 150: e(f'{L} alt {k}.{mk} length')
            if isinstance(tips, list):
                tt = t.get('tips', [])
                if len(tt) != len(tips): e(f'{L} tips count {len(tt)} != {len(tips)}')
                for j, x in enumerate(tt):
                    if not isinstance(x, str) or not 5 <= len(x) <= 120: e(f'{L} tip {j} length (5..120)')
            for j, s in enumerate(t.get('ing', [])):
                if not s or len(s) > 60: e(f'{L} ing {j} name')
    return errs


def per_lang(r, L):
    t = r['i18n'][L]
    out = {k: r[k] for k in ('id', 'cat', 'sub', 'servings', 'minutes', 'diff', 'kcal', 'diet', 'tags', 'months', 'origin')}
    if r.get('alcohol'): out['alcohol'] = True
    if r.get('methods'): out['methods'] = r['methods']
    if r.get('base_steps'): out['base_steps'] = r['base_steps']
    out['title'] = t['title']; out['intro'] = t['intro']
    def forms(x, name):
        f = FORMS.get(L, {}).get(name) if x['q'] is not None and not x['u'] else None
        return {'f': f} if f and f[0] != f[1] else {}
    out['ing'] = [{'q': x['q'], 'u': x['u'], 'n': t['ing'][i], 'k': x.get('k'), **forms(x, t['ing'][i]), **({'make': x['make']} if x.get('make') else {})} for i, x in enumerate(r['ingredients'])]
    out['steps'] = []
    for j, s in enumerate(r['steps']):
        o = {'t': t['steps'][j]}
        if 'timer' in s: o['timer'] = s['timer']; o['label'] = t['labels'][j]
        if s.get('bg'): o['bg'] = True
        if s.get('alt'):
            o['alt'] = {mk: {'t': t['alt'][str(j)][mk], **({'timer': mv['timer']} if 'timer' in mv else {})} for mk, mv in s['alt'].items()}
        out['steps'].append(o)
    if r.get('tips'):
        out['tips'] = [{**tp, 't': t['tips'][k]} for k, tp in enumerate(r['tips'])]
    return out


def sha(p):
    b = open(p, 'rb').read()
    return hashlib.sha1(b).hexdigest(), len(b)


def main():
    if len(sys.argv) < 3: print(__doc__); sys.exit(1)
    cmd = sys.argv[1]
    if cmd == 'check':
        seen = {}; errs = []
        # check ids against every other source too
        others = [p for p in glob.glob(os.path.join(HERE, 'src', '*.json')) if os.path.abspath(p) not in map(os.path.abspath, sys.argv[2:])]
        for p in others:
            try:
                for r in load(p): seen[r.get('id')] = os.path.basename(p)
            except Exception: pass
        for p in sys.argv[2:]:
            recs = load(p); errs += validate(recs, os.path.basename(p), seen)
            print(f'{os.path.basename(p)}: {len(recs)} recipes')
        print('\n'.join(errs) if errs else 'OK'); sys.exit(1 if errs else 0)
    if cmd == 'build':
        out = sys.argv[2]
        only = sys.argv[sys.argv.index('--only') + 1:] if '--only' in sys.argv else None
        srcs = only or sorted(glob.glob(os.path.join(HERE, 'src', '*.json')))
        allrec = []; seen = {}; errs = []
        for p in srcs:
            recs = load(p); errs += validate(recs, os.path.basename(p), seen); allrec += recs
        if not only:
            ids = {r['id'] for r in allrec}
            miss = sorted({x['make'] for r in allrec for x in r['ingredients'] if x.get('make') and x['make'] not in ids})
            if miss: print('WARNING missing base recipes:', ', '.join(miss))
            badl = sorted({tp['link'] for r in allrec for tp in r.get('tips', []) if tp.get('link') and tp['link'] not in ids})
            if badl: print('WARNING tip links to missing recipes (link dropped):', ', '.join(badl))
            for r in allrec:
                for tp in r.get('tips', []):
                    if tp.get('link') in badl: tp.pop('link')
        if errs: print('\n'.join(errs)); sys.exit(1)
        d = os.path.join(out, 'data'); os.makedirs(d, exist_ok=True)
        written = []
        groups = {}
        for r in allrec: groups.setdefault(f"{r['cat']}-{r['sub']}", []).append(r)
        for key, recs in sorted(groups.items()):
            for L in LANGS:
                os.makedirs(os.path.join(d, L), exist_ok=True)
                p = os.path.join(d, L, key + '.json')
                json.dump([per_lang(r, L) for r in recs], open(p, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
                written.append(p)
        if not only:
            idx = [{'id': r['id'], 'c': r['cat'], 's': r['sub'], 'm': r['minutes'], 'k': r['kcal'], 'd': r['diet'], 'g': r.get('tags', []),
                    'mo': r.get('months', []), 'o': r['origin'], **({'p': proteins(r)} if proteins(r) else {}), **({'me': r['methods']} if r.get('methods') else {}), **({'a': 1} if r.get('alcohol') else {}),
                    't': {L: r['i18n'][L]['title'] for L in LANGS}} for r in allrec]
            p = os.path.join(d, 'index.json'); json.dump({'v': 1, 'r': idx}, open(p, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':')); written.append(p)
            mp = os.path.join(HERE, 'menus.json')
            if os.path.exists(mp):
                ids = {r['id'] for r in allrec}; roles = {'aperitivo','antipasto','primo','secondo','contorno','dolce','piatto-unico','colazione','bevanda'}
                menus = json.load(open(mp, encoding='utf-8'))['menus']; merr = []
                for m in menus:
                    me = lambda x: merr.append(f"menu {m.get('id')}: {x}")
                    if not 3 <= len(m.get('courses', [])) <= 6: me('3..6 courses')
                    for c in m.get('courses', []) + m.get('drinks', []):
                        if c.get('id') not in ids: me(f"unknown recipe {c.get('id')}")
                        if c.get('role') not in roles: me(f"bad role {c.get('role')}")
                    for L in LANGS:
                        t = m.get('i18n', {}).get(L) or {}
                        if not t: me(f'missing {L}'); continue
                        if not 2 <= len(t.get('title', '')) <= 40: me(f'{L} title')
                        if not 5 <= len(t.get('intro', '')) <= 140: me(f'{L} intro')
                        if not 5 <= len(t.get('wine', '')) <= 160: me(f'{L} wine')
                        if not 3 <= len(t.get('plan', [])) <= 6 or any(len(x) > 120 for x in t.get('plan', [])): me(f'{L} plan')
                if merr: print('\n'.join(merr)); sys.exit(1)
                p = os.path.join(d, 'menus.json'); json.dump({'menus': menus}, open(p, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':')); written.append(p)
            sp = os.path.join(HERE, 'shop.json')
            if os.path.exists(sp):
                shop = json.load(open(sp, encoding='utf-8'))
                aisles = {'produce', 'meat-fish', 'dairy-eggs', 'bakery-pasta', 'pantry', 'spices', 'frozen', 'drinks'}
                keys = {x['k'] for r in allrec for x in r['ingredients']}
                serr = [f'shop: missing key {k}' for k in sorted(keys - set(shop))]
                for k, v in shop.items():
                    if v.get('aisle') not in aisles: serr.append(f'shop {k}: bad aisle')
                    if set(v.get('n', {})) != set(LANGS): serr.append(f'shop {k}: names for all langs')
                if serr: print('\n'.join(serr[:40])); sys.exit(1)
                p = os.path.join(d, 'shop.json'); json.dump({k: shop[k] for k in sorted(keys)}, open(p, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':')); written.append(p)
            p = os.path.join(d, 'tree.json'); json.dump(TREE, open(p, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':')); written.append(p)
        for p in written:
            h, n = sha(p); print(os.path.relpath(p, out), n, h)
        print(f'{len(allrec)} recipes, {len(written)} files')


if __name__ == '__main__':
    main()
