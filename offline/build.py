#!/usr/bin/env python3
"""Gera SGDM_Contingencia.html: um único arquivo que roda sem internet (fontes, ícones e banco local embutidos).
Uso: python3 build.py <pasta com node_modules de material-symbols e @fontsource/inter>"""
import re, sys, json, base64, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
fonts = pathlib.Path(sys.argv[1]) / 'node_modules'
b64 = lambda p: base64.b64encode(p.read_bytes()).decode()
html = (root / 'index.html').read_text()
# remove fontes/CDN/links externos
html = re.sub(r'<link rel="preconnect"[^>]*>\s*', '', html)
html = re.sub(r'<link href="https://fonts[^>]*>\s*', '', html)
html = re.sub(r'<script src="https://cdn[^>]*></script>\s*', '', html)
face = f"@font-face{{font-family:'Material Symbols Outlined';font-weight:100 700;src:url(data:font/woff2;base64,{b64(fonts/'material-symbols/material-symbols-outlined.woff2')}) format('woff2')}}"
for w in (400, 500, 600, 700):
    face += f"@font-face{{font-family:Inter;font-weight:{w};src:url(data:font/woff2;base64,{b64(fonts/f'@fontsource/inter/files/inter-latin-{w}-normal.woff2')}) format('woff2')}}"
css = (root / 'css/app.css').read_text()
html = re.sub(r'<link rel="stylesheet" href="css/app\.css[^"]*">', lambda m: f'<style>{face}\n{css}</style>', html)
cfg = (root / 'js/config.js').read_text()
anon = re.search(r"SUPABASE_ANON_KEY = '([^']+)'", cfg).group(1)
pre = f"<script>window.__SEED={json.dumps(json.load(open(root/'offline/seed.json')),ensure_ascii=False)};window.__ANON={json.dumps(anon)};</script><script>{(root/'offline/offline-shim.js').read_text()}</script>"
def inline(m):
    p = m.group(1)
    return f'<script>{(root/p).read_text()}</script>'
html = re.sub(r'<script src="(js/[a-z]+\.js)[^"]*"></script>', inline, html)
libs = ''.join(f'<script>{(fonts/p).read_text()}</script>' for p in ('jspdf/dist/jspdf.umd.min.js', 'jspdf-autotable/dist/jspdf.plugin.autotable.min.js'))
html = html.replace('<script>' + (root/'js/config.js').read_text(), pre + libs + '<script>' + (root/'js/config.js').read_text(), 1)
html = html.replace('<title>SGDM</title>', '<title>SGDM Contingência</title>')
html = html.replace('<div class="login-info">SGDM</div>', '<div class="login-info">SGDM · MODO CONTINGÊNCIA (sem internet)</div>')
assert 'cdn.jsdelivr' not in html and 'fonts.googleapis.com/css' not in html.split('<script>')[0]
out = root / 'offline/SGDM_Contingencia.html'
out.write_text(html)
print(out, round(out.stat().st_size / 1e6, 1), 'MB')
