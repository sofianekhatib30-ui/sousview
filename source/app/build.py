"""Build LiftView into ../../dist: minified app + data."""
import re, subprocess, shutil, os, json
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
DATA = os.path.join(ROOT, 'source', 'data')
DIST = os.path.join(ROOT, 'dist')
src = open(os.path.join(HERE, 'index.html'), encoding='utf-8').read()
m = re.search(r'<script>(.*)</script>', src, re.S)
open(os.path.join(HERE, 'app.js'), 'w', encoding='utf-8').write(m.group(1))
js = subprocess.run(['npx', '--yes', 'terser', os.path.join(HERE, 'app.js'), '-c', 'passes=2', '-m', '--format', 'quote_style=1,ascii_only=false'], capture_output=True, text=True, check=True).stdout.strip()
os.remove(os.path.join(HERE, 'app.js'))
head, tail = src[:m.start()], src[m.end():]
css = re.search(r'<style>(.*)</style>', head, re.S).group(1)
c = re.sub(r'/\*.*?\*/', '', css, flags=re.S)
c = re.sub(r'\s+', ' ', c)
c = re.sub(r'\s*([{};,>])\s*', r'\1', c)
c = re.sub(r'(?<=[{;])\s*([a-z-]+)\s*:\s*', r'\1:', c).replace(';}', '}').strip()
head = re.sub(r'>\s+<', '><', head.replace(css, c))
tail = re.sub(r'>\s+<', '><', tail)
if os.path.isdir(DIST): shutil.rmtree(DIST)
os.makedirs(os.path.join(DIST, '.well-known')); os.makedirs(os.path.join(DIST, 'data'))
open(os.path.join(DIST, 'index.html'), 'w', encoding='utf-8').write(head + '<script>' + js + '</script>' + tail)
for f in ['icon.svg', 'vercel.json', 'sw.js', '.well-known/meta-wearables-manifest.json']:
    shutil.copy(os.path.join(HERE, f), os.path.join(DIST, f))
base = json.load(open(os.path.join(DATA, 'exercise_base.json')))
texts = {}
for g in ['A', 'B']:
    texts.update(json.load(open(os.path.join(DATA, 'src', g + '.json'), encoding='utf-8'))['exercises'])
assert set(texts) == {e['id'] for e in base}, 'missing exercise texts'
dump = lambda o, p: json.dump(o, open(os.path.join(DIST, 'data', p), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
dump(base, 'exercises.json')
dump(json.load(open(os.path.join(DATA, 'programs.json'), encoding='utf-8')), 'programs.json')
for L in ['it', 'en', 'fr', 'es', 'de']:
    dump({k: v[L] for k, v in texts.items()}, L + '.json')
print('index.html', os.path.getsize(os.path.join(DIST, 'index.html')), 'bytes; data ok')
