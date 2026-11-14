"""16.02: Kaynaklar ve mebi-yks altındaki her fiziksel dosyanın SHA-256'sı (sabit bağlantı = tek okuma).

Girdi: veri/kaynak-kayit/dosyalar.jsonl (disk_raporu.py). Önbellek: hash-onbellek.jsonl; kimlik+boyut+mtime aynıysa
yeniden okunmaz, yarıda kalınca kaldığı yerden sürer. Dosya değiştirilmez.
"""
import hashlib
import json
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

APP = Path(__file__).resolve().parents[2]
VERI = APP / 'veri/kaynak-kayit'
KOKLER = ('/Kaynaklar/', '/mebi-yks/')


def norm(y):
    return y.replace(chr(92), '/')


def kaynak_dosyalar():
    for satir in open(VERI / 'dosyalar.jsonl', encoding='utf-8'):
        d = json.loads(satir)
        yollar = [y for y in d['yollar'] if any(k in norm(y) + '/' for k in KOKLER)]
        if yollar:
            d['kaynakYollar'] = yollar
            yield d


def sha256(yol):
    h = hashlib.sha256()
    with open(yol, 'rb') as f:
        for blok in iter(lambda: f.read(8 * 1024 * 1024), b''):
            h.update(blok)
    return h.hexdigest()


def ana():
    onbellek = {}
    yol = VERI / 'hash-onbellek.jsonl'
    if yol.exists():
        for s in open(yol, encoding='utf-8'):
            if s.strip():
                d = json.loads(s)
                onbellek[f"{d['dev']}:{d['ino']}"] = d
    isler = []
    for d in kaynak_dosyalar():
        k = f"{d['dev']}:{d['ino']}"
        o = onbellek.get(k)
        if o and o['boyut'] == d['boyut'] and o['mtime'] == d['mtime']:
            continue
        isler.append(d)
    toplam = sum(d['boyut'] for d in isler)
    print(f'okunacak: {len(isler)} dosya, {toplam / 1024 ** 3:.1f} GiB (önbellekte {len(onbellek)})', flush=True)
    kilit = threading.Lock()
    cikti = open(yol, 'a', encoding='utf-8')
    sayac = [0, 0]
    t0 = time.time()

    def is_yap(d):
        try:
            h = sha256(d['kaynakYollar'][0])
        except OSError as e:
            h = None
            hata = str(e)
        with kilit:
            satir = {'dev': d['dev'], 'ino': d['ino'], 'boyut': d['boyut'], 'mtime': d['mtime'], 'sha256': h}
            if h is None:
                satir['hata'] = hata
            cikti.write(json.dumps(satir) + '\n')
            cikti.flush()
            sayac[0] += 1
            sayac[1] += d['boyut']
            if sayac[0] % 500 == 0:
                print(f'{sayac[0]}/{len(isler)} {sayac[1] / 1024 ** 3:.1f}/{toplam / 1024 ** 3:.1f} GiB {time.time() - t0:.0f} sn', flush=True)

    with ThreadPoolExecutor(6) as ex:
        list(ex.map(is_yap, isler))
    print('bitti', sayac, f'{time.time() - t0:.0f} sn', flush=True)


if __name__ == '__main__':
    ana()
