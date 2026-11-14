"""Konu paketi hazırlığı: aday soru görsellerini kod etiketli tabakalara dizer (soru tipi incelemesi için).

Kullanım: python scripts/konu/soru_tabakasi.py <aday-sorular.json> <çıktı klasörü> [--adet 4] [--genislik 760]
Salt okunur; soru bankasını değiştirmez.
"""
import argparse
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

KOK = Path(__file__).resolve().parents[2] / 'veri' / 'resimler-pilot'


def ana(a):
    sorular = json.load(open(a.girdi, encoding='utf-8'))
    cikti = Path(a.cikti)
    cikti.mkdir(parents=True, exist_ok=True)
    try:
        yazi = ImageFont.truetype('arial.ttf', 22)
    except OSError:
        yazi = ImageFont.load_default()
    dizin = []
    for i in range(0, len(sorular), a.adet):
        grup = sorular[i:i + a.adet]
        kareler = []
        for s in grup:
            g = Image.open(KOK / s['image']).convert('RGB')
            oran = a.genislik / g.width
            g = g.resize((a.genislik, max(1, round(g.height * oran))))
            kare = Image.new('RGB', (a.genislik, g.height + 34), 'white')
            kare.paste(g, (0, 34))
            ImageDraw.Draw(kare).text((6, 4), f"{s['code']}  [{s['answer']}]", fill=(180, 0, 0), font=yazi)
            kareler.append(kare)
        sutun = a.sutun
        satirlar = [kareler[j:j + sutun] for j in range(0, len(kareler), sutun)]
        yuk = sum(max(k.height for k in sat) for sat in satirlar)
        tabaka = Image.new('RGB', (a.genislik * sutun + 10, yuk + 10 * len(satirlar)), (120, 120, 120))
        y = 0
        for sat in satirlar:
            for j, k in enumerate(sat):
                tabaka.paste(k, (j * (a.genislik + 10), y))
            y += max(k.height for k in sat) + 10
        ad = f'tabaka-{i // a.adet + 1:03}.png'
        tabaka.save(cikti / ad)
        dizin.append({'tabaka': ad, 'kodlar': [s['code'] for s in grup], 'boyut': tabaka.size})
    json.dump(dizin, open(cikti / 'dizin.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(len(dizin), 'tabaka;', max(d['boyut'][1] for d in dizin), 'en yüksek')


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('girdi')
    p.add_argument('cikti')
    p.add_argument('--adet', type=int, default=4)
    p.add_argument('--genislik', type=int, default=760)
    p.add_argument('--sutun', type=int, default=2)
    ana(p.parse_args())
