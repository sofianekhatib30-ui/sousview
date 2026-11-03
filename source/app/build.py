"""Minify SousView into ./dist. dist holds the app files only (no recipe data: data/ is built and deployed separately)."""
import re, subprocess, shutil, hashlib, os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
SRC = '/home/claude/sousview'
APP_FILES = ['icon.svg', 'vercel.json', '.well-known/meta-wearables-manifest.json']

src = open(SRC + '/index.html', encoding='utf-8').read()
m = re.search(r'<script>(.*)</script>', src, re.S)
open('app.js', 'w', encoding='utf-8').write(m.group(1))
js = subprocess.run(['node_modules/.bin/terser', 'app.js', '-c', 'passes=2', '-m', '--format', 'quote_style=1,ascii_only=false'],
                    capture_output=True, text=True, check=True).stdout.strip()

head, tail = src[:m.start()], src[m.end():]
css = re.search(r'<style>(.*)</style>', head, re.S).group(1)
css_min = re.sub(r'/\*.*?\*/', '', css, flags=re.S)
css_min = re.sub(r'\s+', ' ', css_min)
css_min = re.sub(r'\s*([{};,>])\s*', r'\1', css_min)
css_min = re.sub(r'(?<=[{;])\s*([a-z-]+)\s*:\s*', r'\1:', css_min)  # only "prop: value", never selectors like "button :focus"
css_min = css_min.replace(';}', '}').strip()
head = head.replace(css, css_min)
# Collapse whitespace between tags only outside the script, so template strings in JS stay untouched.
head = re.sub(r'>\s+<', '><', head)
tail = re.sub(r'>\s+<', '><', tail)
html = head + '<script>' + js + '</script>' + tail

if os.path.isdir('dist'): shutil.rmtree('dist')
os.makedirs('dist/.well-known')
open('dist/index.html', 'w', encoding='utf-8').write(html)
for f in APP_FILES:
    shutil.copy(SRC + '/' + f, 'dist/' + f)
print('source', len(src.encode()), 'bytes -> index.html', len(html.encode()), 'bytes')
for root, _, files in os.walk('dist'):
    for f in sorted(files):
        p = os.path.join(root, f)
        d = open(p, 'rb').read()
        print(os.path.relpath(p, 'dist'), len(d), hashlib.sha1(d).hexdigest())
