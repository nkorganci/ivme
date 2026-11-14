"""16.03: onaylı kuru listedeki dosyaları (tüm sabit bağlantı yollarıyla) siler.

Girdi: veri/kaynak-kayit/kuru-liste/<kategori>.csv (dosya_kimligi = dev:ino) ve disk raporu dosyalar.jsonl.
Güvenlik: her yol silmeden önce yeniden denetlenir (var mı, aynı inode mu, aynı boyut mu);
tekrar dosya kategorisinde 'kalan' kopyanın en az bir yolu diskte durmalıdır.
Varsayılan kuru çalışır; --uygula gerçekten siler. Günlük: veri/kaynak-kayit/silme-gunlugu.jsonl.
"""
import argparse
import csv
import json
import os
import re
import time
from pathlib import Path

VERI = Path(__file__).resolve().parents[2] / 'veri' / 'kaynak-kayit'


def yukle_yollar():
    harita = {}
    for satir in open(VERI / 'dosyalar.jsonl', encoding='utf-8'):
        d = json.loads(satir)
        harita[f"{d['dev']}:{d['ino']}"] = d
    return harita


def ana(a):
    harita = yukle_yollar()
    liste = list(csv.DictReader(open(VERI / 'kuru-liste' / f'{a.kategori}.csv', encoding='utf-8')))
    silinecek_kimlik = {r['dosya_kimligi'] for r in liste}
    gunluk = open(VERI / 'silme-gunlugu.jsonl', 'a', encoding='utf-8') if a.uygula else None
    ozet = {'dosya': 0, 'yol': 0, 'bayt': 0, 'atlandi': 0, 'yol_yok': 0}
    for r in liste:
        kid = r['dosya_kimligi']
        d = harita.get(kid)
        if not d:
            ozet['atlandi'] += 1
            continue
        kalan = re.search(r'kalan: ([\d:]+)', r['gerekce'])
        if a.kategori == 'tekrar-dosya':
            k = kalan.group(1) if kalan else None
            kd = harita.get(k) if k else None
            if not kd or k in silinecek_kimlik or not any(os.path.exists(y) for y in kd['yollar']):
                ozet['atlandi'] += 1
                continue
        # tüm yolları önce denetle: biri bile farklıysa dosyaya dokunma
        mevcut = []
        uygun = True
        for y in d['yollar']:
            try:
                st = os.stat(y)
            except FileNotFoundError:
                ozet['yol_yok'] += 1
                continue
            if st.st_size != d['boyut'] or st.st_ino != d['ino']:
                uygun = False
                break
            mevcut.append(y)
        if not uygun:
            ozet['atlandi'] += 1
            continue
        if not mevcut:
            ozet['atlandi'] += 1
            continue
        for y in mevcut:
            if a.uygula:
                try:
                    os.remove(y)
                except FileNotFoundError:  # aynı yol başka kayıtla zaten silindi
                    ozet['yol_yok'] += 1
                    continue
            ozet['yol'] += 1
        ozet['dosya'] += 1
        ozet['bayt'] += d['boyut']
        if gunluk:
            gunluk.write(json.dumps({'z': time.strftime('%Y-%m-%dT%H:%M:%S'), 'kategori': a.kategori, 'kimlik': kid,
                                     'boyut': d['boyut'], 'yollar': mevcut}, ensure_ascii=False) + '\n')
    ozet['GiB'] = round(ozet['bayt'] / 2 ** 30, 2)
    print(('SİLİNDİ ' if a.uygula else 'KURU ') + a.kategori, ozet)


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('kategori', choices=['video-ses', 'tekrar-dosya'])
    p.add_argument('--uygula', action='store_true')
    ana(p.parse_args())
