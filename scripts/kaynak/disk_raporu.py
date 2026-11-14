"""16.02: gerçek disk raporu. Sabit bağlantıları (aynı dosya birden çok yolda) tek sayar.

Çıktı: veri/kaynak-kayit/disk-raporu.json (özet) ve veri/kaynak-kayit/dosyalar.jsonl (her fiziksel dosya
için bir satır: kimlik, boyut, bağlantı sayısı, tüm yollar). Dosya içeriği okunmaz, hiçbir şey silinmez/taşınmaz.
"""
import argparse
import json
import os
import sys
import time
from collections import defaultdict
from pathlib import Path

APP = Path(__file__).resolve().parents[2]
WS = APP.parent                                   # D:\workspace\ivme
KOKLER = {                                        # ad -> yol
    'Kaynaklar': WS / 'Kaynaklar',
    'mebi-yks': WS.parent / 'mebi-yks',
    'uygulama/veri': APP / 'veri',
    'yedekler': WS / 'yedekler',
    'pipeline': WS / 'pipeline',
    'veri-hatti': WS / 'veri-hatti',
    'icerik': WS / 'icerik',
    'uygulama/kod': APP,                          # veri/ hariç; node_modules, target, dist ayrı sayılır
}
KOD_HARIC = {'veri', 'node_modules', 'target', 'target-tests', 'dist', '.git'}
GIB = 1024 ** 3


def yuru(kok, ad):
    """(yol, stat) üretir; uygulama/kod için ağır klasörleri ayrı ada alır."""
    yigin = [kok]
    while yigin:
        klasor = yigin.pop()
        try:
            girdiler = list(os.scandir(klasor))
        except OSError:
            continue
        for g in girdiler:
            try:
                if g.is_symlink():
                    continue
                if g.is_dir(follow_symlinks=False):
                    if ad == 'uygulama/kod' and Path(klasor) == kok and g.name in KOD_HARIC:
                        continue
                    yigin.append(g.path)
                elif g.is_file(follow_symlinks=False):
                    yield g.path, os.stat(g.path)
            except OSError:
                continue


def ana(args):
    cikti = APP / 'veri/kaynak-kayit'
    cikti.mkdir(parents=True, exist_ok=True)
    baslangic = time.time()
    dosyalar = {}                                  # (dev, ino) -> dict
    kok_baglari = defaultdict(lambda: defaultdict(int))   # kök -> kimlik -> kökteki yol sayısı
    kok_gorunen = defaultdict(int)
    kok_sayi = defaultdict(int)
    kok_ek = defaultdict(lambda: defaultdict(lambda: [0, 0]))      # kök -> uzantı -> [dosya, görünen bayt]
    alt = defaultdict(lambda: [0, 0, 0])           # uygulama/veri alt klasörleri: [dosya, görünen, benzersiz]
    for ad, kok in KOKLER.items():
        if not kok.exists():
            print(f'atlandı (yok): {ad} {kok}', file=sys.stderr)
            continue
        for yol, st in yuru(str(kok), ad):
            kimlik = (st.st_dev, st.st_ino)
            kayit = dosyalar.get(kimlik)
            if kayit is None:
                kayit = dosyalar[kimlik] = {'dev': st.st_dev, 'ino': st.st_ino, 'boyut': st.st_size,
                                            'nlink': st.st_nlink, 'mtime': int(st.st_mtime), 'yollar': []}
            kayit['yollar'].append(yol)
            kok_baglari[ad][kimlik] += 1
            kok_gorunen[ad] += st.st_size
            kok_sayi[ad] += 1
            ek = os.path.splitext(yol)[1].lower() or '(yok)'
            kok_ek[ad][ek][0] += 1
            kok_ek[ad][ek][1] += st.st_size
            if ad == 'uygulama/veri':
                goreli = os.path.relpath(yol, kok).replace(chr(92), '/').split('/')
                anahtar = '/'.join(goreli[:2]) if len(goreli) > 2 else goreli[0] + ('' if len(goreli) == 1 else '/')
                alt[anahtar][0] += 1
                alt[anahtar][1] += st.st_size
    # Fiziksel (benzersiz) boyut: her kimlik bir kez. Bir kök silinirse boşalan: bütün bağlantıları o kökte olanlar.
    toplam_gorunen = sum(kok_gorunen.values())
    toplam_benzersiz = sum(k['boyut'] for k in dosyalar.values())
    kokler = {}
    for ad in KOKLER:
        if ad not in kok_baglari:
            continue
        benzersiz = sum(dosyalar[k]['boyut'] for k in kok_baglari[ad])
        sadece_burada = sum(dosyalar[k]['boyut'] for k, n in kok_baglari[ad].items() if dosyalar[k]['nlink'] <= n)
        paylasilan = sum(dosyalar[k]['boyut'] for k, n in kok_baglari[ad].items() if dosyalar[k]['nlink'] > n)
        kokler[ad] = {'dosya': kok_sayi[ad], 'benzersizDosya': len(kok_baglari[ad]),
                      'gorunenGiB': round(kok_gorunen[ad] / GIB, 2), 'benzersizGiB': round(benzersiz / GIB, 2),
                      'silinirseBosalanGiB': round(sadece_burada / GIB, 2),
                      'baskaYoldaDaDurduGiB': round(paylasilan / GIB, 2),
                      'uzantilar': {e: {'dosya': v[0], 'gorunenGiB': round(v[1] / GIB, 3)}
                                    for e, v in sorted(kok_ek[ad].items(), key=lambda x: -x[1][1])[:12]}}
    # Üç yolda tekrar eden dosya grupları: kaç fiziksel dosya birden çok kökte
    cok_yol = defaultdict(lambda: [0, 0])
    for k in dosyalar.values():
        koklerde = len(k['yollar'])
        if koklerde > 1:
            cok_yol[koklerde][0] += 1
            cok_yol[koklerde][1] += k['boyut'] * (koklerde - 1)
    rapor = {
        'olculdu': time.strftime('%Y-%m-%dT%H:%M:%S'), 'sureSn': round(time.time() - baslangic, 1),
        'toplam': {'gorunenGiB': round(toplam_gorunen / GIB, 2), 'gercekDiskGiB': round(toplam_benzersiz / GIB, 2),
                   'sabitBaglantidanTekrarGiB': round((toplam_gorunen - toplam_benzersiz) / GIB, 2),
                   'fizikselDosya': len(dosyalar), 'yolSayisi': sum(kok_sayi.values())},
        'kokler': kokler,
        'cokYollu': {f'{n} yol': {'fizikselDosya': v[0], 'tekrarGiB': round(v[1] / GIB, 2)} for n, v in sorted(cok_yol.items())},
        'uygulamaVeriAlt': {k: {'dosya': v[0], 'GiB': round(v[1] / GIB, 3)}
                            for k, v in sorted(alt.items(), key=lambda x: -x[1][1])[:60]},
        'not': 'gorunen = yol başına toplam; gerçekDisk = her fiziksel dosya bir kez; silinirseBosalan = kök silinirse '
               'diskte gerçekten boşalacak (bütün bağlantıları o kökte olan dosyalar).',
    }
    (cikti / 'disk-raporu.json').write_text(json.dumps(rapor, ensure_ascii=False, indent=2), encoding='utf-8')
    with open(cikti / 'dosyalar.jsonl', 'w', encoding='utf-8') as f:
        for k in dosyalar.values():
            f.write(json.dumps(k, ensure_ascii=False) + '\n')
    print(json.dumps(rapor['toplam'], ensure_ascii=False))
    for ad, v in kokler.items():
        print(f"{ad:16} dosya={v['dosya']:>7} görünen={v['gorunenGiB']:>8} GiB  gerçek={v['benzersizGiB']:>8}  silinirseBoşalan={v['silinirseBosalanGiB']:>8}")


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    ana(p.parse_args())
