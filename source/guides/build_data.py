#!/usr/bin/env python3
"""FixView guide data: validator and builder.

  python3 build_data.py check src/A.json [src/B.json ...]   validate files (default: all of src/)
  python3 build_data.py build OUTDIR                        write OUTDIR/data/... from every src/*.json
"""
import json, os, re, sys, glob

HERE = os.path.dirname(os.path.abspath(__file__))
TREE = json.load(open(os.path.join(HERE, 'tree.json'), encoding='utf-8'))
LANGS = ['it', 'en', 'fr', 'es', 'de']
CATS = {c['id'] for c in TREE['cats']}
ICONS = set(TREE['icons'])
TOPICS = set(TREE['topics'])
COUNTRIES = set(TREE['countries'])
PPE = set(TREE['ppe'])
TAGS = set(TREE['tags'])
MAT_UNITS = {'', 'ml', 'l', 'g', 'kg', 'mm', 'cm', 'm', 'm2'}
TOKEN_UNITS = {'mm', 'cm', 'm', 'm2', 'l', 'ml', 'g', 'kg', 'bar', '°C'}
TOKEN_RE = re.compile(r'\[\[([^\]]*)\]\]')
TOKEN_OK = re.compile(r'^(\d+(?:\.\d+)?)(?:[-–](\d+(?:\.\d+)?))? ?(mm|cm|m2|m|ml|l|kg|g|bar|°C)$')
ID_RE = re.compile(r'^[a-z0-9]+(?:-[a-z0-9]+)*$')
KEY_RE = re.compile(r'^[a-z0-9]+(?:-[a-z0-9]+)*$')


def shown(s):
    """Text as displayed (tokens rendered metric), for length checks."""
    return TOKEN_RE.sub(lambda m: m.group(1).replace('.', ','), s)


def check_text(errs, where, s, lo, hi):
    if not isinstance(s, str):
        errs.append(f'{where}: must be a string'); return
    n = len(shown(s))
    if n < lo or n > hi:
        errs.append(f'{where}: {n} chars, must be {lo}-{hi}: {s!r}')
    if s != s.strip():
        errs.append(f'{where}: leading/trailing spaces')
    for tok in TOKEN_RE.findall(s):
        if not TOKEN_OK.match(tok.strip()):
            errs.append(f'{where}: bad measure token [[{tok}]] (use e.g. [[6 mm]], [[2.5 bar]], [[20-25 cm]], units {sorted(TOKEN_UNITS)})')
    if '[[' in TOKEN_RE.sub('', s) or ']]' in TOKEN_RE.sub('', s):
        errs.append(f'{where}: unbalanced [[ ]]')


def validate(g, errs, seen):
    gid = g.get('id', '?')
    w = f'[{gid}]'
    if not isinstance(gid, str) or not ID_RE.match(gid):
        errs.append(f'{w} id must be kebab-case ascii')
    if gid in seen:
        errs.append(f'{w} duplicate id (also in {seen[gid]})')
    if g.get('cat') not in CATS:
        errs.append(f'{w} cat must be one of {sorted(CATS)}')
    pro = bool(g.get('pro', False))
    if g.get('diff') not in (1, 2, 3):
        errs.append(f'{w} diff must be 1, 2 or 3')
    a, t = g.get('active'), g.get('total')
    if not (isinstance(a, int) and isinstance(t, int) and 1 <= a <= t <= 2880):
        errs.append(f'{w} active/total must be integers, 1 <= active <= total <= 2880 (minutes)')
    risk = g.get('risk')
    if risk not in (0, 1, 2, 3):
        errs.append(f'{w} risk must be 0-3')
    if pro and risk != 3:
        errs.append(f'{w} a pro card must have risk 3')
    if risk == 3 and not pro:
        errs.append(f'{w} risk 3 guides must be pro cards ("pro": true): no do-it-yourself steps')
    topic = g.get('topic')
    if topic is not None and topic not in TOPICS:
        errs.append(f'{w} topic must be null or one of {sorted(TOPICS)}')
    if risk is not None and risk >= 2 and topic is None:
        errs.append(f'{w} risk >= 2 needs a topic (it drives the safety checklist)')
    allow = g.get('allow', {})
    if not isinstance(allow, dict) or any(k not in COUNTRIES or v not in ('ok', 'warn', 'pro') for k, v in allow.items()):
        errs.append(f'{w} allow must map countries {sorted(COUNTRIES)} to ok|warn|pro')
    for p in g.get('ppe', []):
        if p not in PPE:
            errs.append(f'{w} ppe {p!r} not in {sorted(PPE)}')
    for tg in g.get('tags', []):
        if tg not in TAGS:
            errs.append(f'{w} tag {tg!r} not in {sorted(TAGS)}')
    months = g.get('months', [])
    if not isinstance(months, list) or any(not isinstance(m, int) or m < 1 or m > 12 for m in months):
        errs.append(f'{w} months must be a list of 1-12')

    def items(kind):
        lst = g.get(kind, [])
        if not isinstance(lst, list):
            errs.append(f'{w} {kind} must be a list'); return []
        for i, it in enumerate(lst):
            if not isinstance(it, dict) or not KEY_RE.match(str(it.get('k', ''))):
                errs.append(f'{w} {kind}[{i}] needs "k": canonical english kebab-case key')
                continue
            if kind == 'mats':
                q, u = it.get('q'), it.get('u', '')
                if u not in MAT_UNITS:
                    errs.append(f'{w} mats[{i}] unit {u!r} not in {sorted(MAT_UNITS)}')
                if q is not None and not (isinstance(q, (int, float)) and q > 0):
                    errs.append(f'{w} mats[{i}] q must be a positive number or null')
                if q is None and u:
                    errs.append(f'{w} mats[{i}] q null ("as needed") needs u ""')
            if 'own' in it and not isinstance(it['own'], bool):
                errs.append(f'{w} {kind}[{i}] own must be true/false')
        return lst
    tools, mats = items('tools'), items('mats')

    steps = g.get('steps', [])
    lo, hi = (3, 6) if pro else (4, 12)
    if not isinstance(steps, list) or not (lo <= len(steps) <= hi):
        errs.append(f'{w} needs {lo}-{hi} steps'); steps = steps if isinstance(steps, list) else []
    timer_sum = 0
    for j, s in enumerate(steps):
        if not isinstance(s, dict):
            errs.append(f'{w} steps[{j}] must be an object'); continue
        if s.get('ic') not in ICONS:
            errs.append(f'{w} steps[{j}].ic {s.get("ic")!r} not in icons list of tree.json')
        tm = s.get('timer')
        if tm is not None:
            if pro:
                errs.append(f'{w} pro cards have no timers')
            if not isinstance(tm, int) or not (10 <= tm <= 172800):
                errs.append(f'{w} steps[{j}].timer must be integer seconds 10-172800')
            else:
                timer_sum += tm
        if s.get('bg') and tm is None:
            errs.append(f'{w} steps[{j}] bg needs a timer')
        if s.get('warn') not in (None, 1, 2):
            errs.append(f'{w} steps[{j}].warn must be 1 or 2 if present')
        if 'check' in s and s['check'] is not True:
            errs.append(f'{w} steps[{j}].check must be true if present')
    if isinstance(t, int) and timer_sum / 60 > t + 0.5 and not any(s.get('bg') for s in steps if isinstance(s, dict)):
        errs.append(f'{w} total ({t} min) is shorter than the sum of timers ({timer_sum // 60} min)')
    tips = g.get('tips', 0)
    if not isinstance(tips, int) or not (0 <= tips <= 3):
        errs.append(f'{w} "tips" must be the number of tips, 0-3')

    i18n = g.get('i18n', {})
    for L in LANGS:
        x = i18n.get(L)
        wl = f'{w}[{L}]'
        if not isinstance(x, dict):
            errs.append(f'{wl} missing'); continue
        check_text(errs, f'{wl}.title', x.get('title'), 3, 42)
        check_text(errs, f'{wl}.intro', x.get('intro'), 10, 100)
        for kind, lst in (('tools', tools), ('mats', mats)):
            names = x.get(kind, [])
            if not isinstance(names, list) or len(names) != len(lst):
                errs.append(f'{wl}.{kind} must have {len(lst)} names (same order as {kind})')
            else:
                for i, n in enumerate(names):
                    check_text(errs, f'{wl}.{kind}[{i}]', n, 2, 48)
        st = x.get('steps', [])
        if not isinstance(st, list) or len(st) != len(steps):
            errs.append(f'{wl}.steps must have {len(steps)} texts')
        else:
            for j, s in enumerate(st):
                check_text(errs, f'{wl}.steps[{j}]', s, 8, 140)
        labels = x.get('labels', [])
        if not isinstance(labels, list) or len(labels) != len(steps):
            errs.append(f'{wl}.labels must have {len(steps)} entries ("" when the step has no timer)')
        else:
            for j, lb in enumerate(labels):
                has = isinstance(steps[j], dict) and steps[j].get('timer') is not None
                if has:
                    check_text(errs, f'{wl}.labels[{j}]', lb, 1, 16)
                elif lb != '':
                    errs.append(f'{wl}.labels[{j}] must be "" (no timer on that step)')
        checks = x.get('checks', {})
        want = {str(j) for j, s in enumerate(steps) if isinstance(s, dict) and s.get('check')}
        if not isinstance(checks, dict) or set(checks) != want:
            errs.append(f'{wl}.checks keys must be exactly {sorted(want, key=int)} (steps with "check": true)')
        else:
            for k, c in checks.items():
                if not isinstance(c, dict):
                    errs.append(f'{wl}.checks[{k}] must be {{"q": ..., "fix": ...}}'); continue
                check_text(errs, f'{wl}.checks[{k}].q', c.get('q'), 8, 90)
                check_text(errs, f'{wl}.checks[{k}].fix', c.get('fix'), 8, 140)
        warns = x.get('warns', {})
        want = {str(j) for j, s in enumerate(steps) if isinstance(s, dict) and s.get('warn')}
        if not isinstance(warns, dict) or set(warns) != want:
            errs.append(f'{wl}.warns keys must be exactly {sorted(want, key=int)} (steps with "warn")')
        else:
            for k, v in warns.items():
                check_text(errs, f'{wl}.warns[{k}]', v, 8, 110)
        tp = x.get('tips', [])
        if not isinstance(tp, list) or len(tp) != (tips if isinstance(tips, int) else 0):
            errs.append(f'{wl}.tips must have {tips} texts')
        else:
            for i, v in enumerate(tp):
                check_text(errs, f'{wl}.tips[{i}]', v, 8, 120)
        gate = x.get('gate', [])
        if not isinstance(gate, list) or len(gate) > 3:
            errs.append(f'{wl}.gate must be a list of 0-3 extra safety confirmations')
        else:
            for i, v in enumerate(gate):
                check_text(errs, f'{wl}.gate[{i}]', v, 8, 80)
        glen = len(x.get('gate', []) or [])
        if L != 'it' and isinstance(i18n.get('it'), dict) and glen != len(i18n['it'].get('gate', []) or []):
            errs.append(f'{wl}.gate must have the same count as it')
        if pro and 'why' not in x:
            errs.append(f'{wl}.why missing (one line: why this needs a professional)')
        if 'why' in x:
            check_text(errs, f'{wl}.why', x['why'], 10, 140)
        extra = set(x) - {'title', 'intro', 'tools', 'mats', 'steps', 'labels', 'checks', 'warns', 'tips', 'gate', 'why'}
        if extra:
            errs.append(f'{wl} unknown keys {sorted(extra)}')
    extra = set(g) - {'id', 'cat', 'diff', 'active', 'total', 'risk', 'topic', 'allow', 'ppe', 'tags', 'months', 'tools', 'mats', 'steps', 'tips', 'pro', 'i18n'}
    if extra:
        errs.append(f'{w} unknown keys {sorted(extra)}')


def load(paths):
    errs, seen, guides = [], {}, []
    for p in paths:
        try:
            doc = json.load(open(p, encoding='utf-8'))
        except Exception as e:
            errs.append(f'{p}: invalid JSON: {e}'); continue
        lst = doc.get('guides') if isinstance(doc, dict) else None
        if not isinstance(lst, list):
            errs.append(f'{p}: must be {{"group": "X", "guides": [...]}}'); continue
        for g in lst:
            validate(g, errs, seen)
            seen[g.get('id')] = os.path.basename(p)
            guides.append(g)
    return errs, guides


def main():
    if len(sys.argv) < 2 or sys.argv[1] not in ('check', 'build'):
        print(__doc__); sys.exit(2)
    allsrc = sorted(glob.glob(os.path.join(HERE, 'src', '*.json')))
    if sys.argv[1] == 'check':
        paths = sys.argv[2:] or allsrc
        # ids must be unique across all groups: validate the others silently for the seen map
        errs, guides = load(paths)
        if len(paths) < len(allsrc):
            others = [p for p in allsrc if os.path.abspath(p) not in {os.path.abspath(x) for x in paths}]
            _, og = load(others)
            mine = {g.get('id') for g in guides}
            for g in og:
                if g.get('id') in mine:
                    errs.append(f'[{g.get("id")}] id already used in another group')
        if errs:
            print(f'{len(errs)} problem(s):')
            for e in errs[:80]:
                print(' -', e)
            if len(errs) > 80:
                print(f' ... and {len(errs) - 80} more')
            sys.exit(1)
        print(f'OK: {len(guides)} guides')
        return
    out = os.path.join(sys.argv[2], 'data')
    errs, guides = load(allsrc)
    if errs:
        print('\n'.join(errs[:40])); sys.exit(1)
    os.makedirs(out, exist_ok=True)
    order = [c['id'] for c in TREE['cats']]
    guides.sort(key=lambda g: (order.index(g['cat']), g.get('pro', False), g['diff'], g['id']))
    index = []
    for g in guides:
        index.append({
            'id': g['id'], 'c': g['cat'], 'd': g['diff'], 'a': g['active'], 'm': g['total'], 'r': g['risk'],
            'tp': g.get('topic'), 'al': g.get('allow', {}), 'p': 1 if g.get('pro') else 0,
            'tg': g.get('tags', []), 'mo': g.get('months', []),
            't': {L: g['i18n'][L]['title'] for L in LANGS},
            'i': {L: g['i18n'][L]['intro'] for L in LANGS},
        })
    json.dump(index, open(os.path.join(out, 'index.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    json.dump(TREE, open(os.path.join(out, 'tree.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    for L in LANGS:
        os.makedirs(os.path.join(out, L), exist_ok=True)
        for c in order:
            lst = []
            for g in guides:
                if g['cat'] != c:
                    continue
                x = g['i18n'][L]
                lst.append({
                    'id': g['id'], 'cat': c, 'diff': g['diff'], 'active': g['active'], 'total': g['total'],
                    'risk': g['risk'], 'topic': g.get('topic'), 'allow': g.get('allow', {}), 'pro': bool(g.get('pro')),
                    'ppe': g.get('ppe', []), 'tags': g.get('tags', []), 'months': g.get('months', []),
                    'title': x['title'], 'intro': x['intro'], 'why': x.get('why', ''), 'gate': x.get('gate', []),
                    'tools': [{**it, 'n': x['tools'][i]} for i, it in enumerate(g.get('tools', []))],
                    'mats': [{**it, 'n': x['mats'][i]} for i, it in enumerate(g.get('mats', []))],
                    'steps': [{**s, 't': x['steps'][j], **({'label': x['labels'][j]} if s.get('timer') else {}),
                               **({'q': x['checks'][str(j)]['q'], 'fix': x['checks'][str(j)]['fix']} if s.get('check') else {}),
                               **({'w': x['warns'][str(j)]} if s.get('warn') else {})}
                              for j, s in enumerate(g['steps'])],
                    'tips': x.get('tips', []),
                })
            if lst:
                json.dump(lst, open(os.path.join(out, L, c + '.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    print(f'built {len(guides)} guides into {out}')


if __name__ == '__main__':
    main()
