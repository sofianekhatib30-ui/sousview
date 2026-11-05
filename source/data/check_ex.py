#!/usr/bin/env python3
"""Validate LiftView exercise texts: python3 check_ex.py src/A.json [ids-file-part]"""
import json, sys
LANGS = ['it', 'en', 'fr', 'es', 'de']
base = {e['id']: e for e in json.load(open('exercise_base.json'))}
def check(path, want=None):
    errs = []
    doc = json.load(open(path, encoding='utf-8'))
    ex = doc.get('exercises', {})
    if want:
        missing = [i for i in want if i not in ex]
        if missing: errs.append(f'missing ids: {missing}')
    for i, x in ex.items():
        if i not in base: errs.append(f'{i}: unknown id'); continue
        for L in LANGS:
            y = x.get(L)
            w = f'{i}[{L}]'
            if not isinstance(y, dict): errs.append(f'{w} missing'); continue
            if set(y) - {'n', 'al', 'cues', 'err'}: errs.append(f'{w} unknown keys')
            n = y.get('n', '')
            if not (2 <= len(n) <= 32): errs.append(f'{w}.n must be 2-32 chars: {n!r}')
            al = y.get('al', [])
            if not isinstance(al, list) or len(al) > 4 or any(not isinstance(a, str) or not (2 <= len(a) <= 32) for a in al): errs.append(f'{w}.al must be 0-4 strings of 2-32 chars')
            cues = y.get('cues', [])
            if not isinstance(cues, list) or len(cues) != 2 or any(not isinstance(c, str) or not (8 <= len(c) <= 70) for c in cues): errs.append(f'{w}.cues must be exactly 2 strings of 8-70 chars: {cues!r}')
            e = y.get('err', '')
            if not isinstance(e, str) or not (8 <= len(e) <= 80): errs.append(f'{w}.err must be 8-80 chars: {e!r}')
    return errs, len(ex)
if __name__ == '__main__':
    want = None
    if len(sys.argv) > 2: want = sys.argv[2].split(',')
    errs, n = check(sys.argv[1], want)
    if errs:
        print(f'{len(errs)} problem(s):'); [print(' -', e) for e in errs[:60]]; sys.exit(1)
    print(f'OK: {n} exercises')
