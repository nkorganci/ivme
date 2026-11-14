"""16.03: emekli edilecek betik/testlerin güvenli kümesini hesaplar (canlı koddan erişilenler korunur)."""
import os
import re
import sys

APP = 'D:/workspace/ivme/uygulama'
os.chdir(APP)
BS = chr(92)
ref = {l.strip().replace(BS, '/') for l in open(sys.argv[1], encoding='utf-8') if l.strip()}
for d in ('scripts', 'testler'):
    for f in os.listdir(d):
        if f.startswith(('mebi_pratik2_', 'mebi-pratik2')) or f == 'mebi-main-bank-live.mjs' or f == 'yks-curriculum-import.mjs':
            ref.add(f'{d}/{f}')
ref |= {p for p in os.listdir('scripts') if False}
for f in os.listdir('scripts'):
    if f.startswith('yks') and f.endswith('.py'):
        ref.add('scripts/' + f)
for f in os.listdir('testler'):
    if f.startswith('yks') and f.endswith(('.py', '.mjs')):
        ref.add('testler/' + f)
ref.discard('testler/kalite-profilleri.json')
EXT = ('.py', '.mjs', '.js', '.java', '.bat', '.ps1', '.yml')
SKIP = ('node_modules', '.git', 'veri', '.m2', 'target', '__pycache__', 'Kaynaklar', 'dist', 'build')


def dosyalar():
    for kok in ('scripts', 'testler', 'backend/src', 'frontend/src', 'frontend/scripts', 'video-hatti'):
        for d, ds, fs in os.walk(kok):
            ds[:] = [x for x in ds if x not in SKIP]
            for f in fs:
                if f.endswith(EXT):
                    yield os.path.relpath(os.path.join(d, f)).replace(BS, '/')
    for f in os.listdir('.'):
        if f.endswith(EXT):
            yield f


tum = list(dosyalar())
icerik = {p: open(p, encoding='utf-8', errors='ignore').read() for p in tum}
ref = {p for p in ref if p in icerik or os.path.exists(p)}
for p in ref:
    icerik.setdefault(p, open(p, encoding='utf-8', errors='ignore').read())


def modul(p):
    return os.path.splitext(os.path.basename(p))[0]


ref_ad = [p for p in ref if p.startswith('scripts/') or p.startswith('testler/')]
ad_harita = {}
for r in ref_ad:
    ad_harita.setdefault(modul(r), []).append(r)
TOKEN = re.compile(r'[\w-]+')
jeton = {}


def jetonlar(p):
    if p not in jeton:
        jeton[p] = set(TOKEN.findall(icerik.get(p, '')))
    return jeton[p]


korunan = {p for p in tum if p not in ref}
KOK = {'scripts/yks_katalog_kontrol.py', 'scripts/yks_kaynak.py', 'testler/yks-maintenance-test.py', 'testler/yks-maintenance.test.mjs'}
kuyruk = list(korunan | KOK)
kor = set(kuyruk)
while kuyruk:
    p = kuyruk.pop()
    for j in jetonlar(p) & ad_harita.keys():
        for r in ad_harita[j]:
            if r not in kor and r != p:
                kor.add(r)
                kuyruk.append(r)
# paket dizinleri (yks_stages/*.py) birlikte korunur
for r in list(ref):
    if r.startswith('scripts/yks_stages/') and 'scripts/yks_birlestirme.py' in kor:
        kor.add(r)
emekli = sorted(r for r in ref if r not in kor and os.path.exists(r))
korunan_ref = sorted(r for r in ref if r in kor)
open(sys.argv[2], 'w', encoding='utf-8').write('\n'.join(emekli))
print('emekli', len(emekli), 'canlı hat nedeniyle korunan', len(korunan_ref))
print('\n'.join(korunan_ref[:60]))
