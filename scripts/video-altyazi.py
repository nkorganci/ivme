"""Video protip hazırlığı için altyazı (json3) okuma araçları; yalnız yerel dosyaları okur.

    python scripts/video-altyazi.py metin <video-id> [bas_sn] [bit_sn]   # ~30 sn'lik zaman damgalı satırlar
    python scripts/video-altyazi.py puf <video-id> [pencere_sn] [en_cok] # "dikkat/tuzak/püf/ÖSYM…" çevresi
    python scripts/video-altyazi.py alinti <video-id> <bas> <bit> "<alıntı>"  # hattın alıntı denetimiyle aynı birleşim
    python scripts/video-altyazi.py kare <video-id> <sn>...              # veri/gecici/kare/<id>-<sn>.jpg (ffmpeg)

Altyazı otomatik metindir; formülleri kareden doğrula. Alıntı denetimi scripts/video_hatti.py ile aynı kuralı
kullanır: aralıkla kesişen olayların metni boşlukla birleştirilir ve alıntı bu metinde birebir aranır.
"""
import json
import re
import subprocess
import sys
from pathlib import Path

APP = Path(__file__).resolve().parents[1]
MEDIA = APP / 'veri/video-hatti/medya'
KEY = re.compile(r'püf|dikkat|tuzak|pratik|kısa yol|kısayol|taktik|ösym|çıkmış|unutma|aman|hata yap|yanlış yap|'
                 r'kesinlikle|özel durum|not al|altını çiz|çok önemli|sakın|kafa karış', re.I)


def events(vid):
    data = json.loads((MEDIA / f'{vid}.tr.json3').read_text(encoding='utf-8'))
    for e in data.get('events', []):
        if e.get('segs') and 'tStartMs' in e and 'dDurationMs' in e:
            text = ''.join(s.get('utf8', '') for s in e['segs']).replace('\n', ' ').strip()
            if text:
                yield e['tStartMs'] / 1000, (e['tStartMs'] + e['dDurationMs']) / 1000, text


def stamp(t):
    return f'{int(t // 60):02d}:{int(t % 60):02d}'


def main(argv):
    if len(argv) < 2:
        print(__doc__)
        return 2
    command, vid, rest = argv[0], argv[1], argv[2:]
    if command == 'metin':
        a = float(rest[0]) if rest else 0
        b = float(rest[1]) if len(rest) > 1 else 1e9
        buf, start = [], None
        for t, _, text in events(vid):
            if a <= t <= b:
                start = t if start is None else start
                buf.append(text)
                if t - start >= 30:
                    print(f'[{stamp(start)}] ' + ' '.join(buf))
                    buf, start = [], None
        if buf:
            print(f'[{stamp(start)}] ' + ' '.join(buf))
    elif command == 'puf':
        win = float(rest[0]) if rest else 45
        most = int(rest[1]) if len(rest) > 1 else 14
        ev = list(events(vid))
        hits = [t for t, _, x in ev if KEY.search(x)]
        spans = []
        for t in hits:
            if spans and t - win <= spans[-1][1]:
                spans[-1][1] = t + win
            else:
                spans.append([max(0, t - win / 3), t + win])
        spans.sort(key=lambda s: -sum(1 for h in hits if s[0] <= h <= s[1]))
        for a, b in sorted(spans[:most]):
            print(f'\n### [{stamp(a)}–{stamp(b)}] ({int(a)}–{int(b)} sn)\n' + ' '.join(x for t, _, x in ev if a <= t <= b))
    elif command == 'alinti':
        a, b, quote = float(rest[0]), float(rest[1]), rest[2]
        joined = ' '.join(x for s, e, x in events(vid) if s < b and e > a)
        print('ALINTI VAR' if quote in joined else 'ALINTI YOK')
        return 0 if quote in joined else 1
    elif command == 'kare':
        out = APP / 'veri/gecici/kare'
        out.mkdir(parents=True, exist_ok=True)
        for t in rest:
            target = out / f'{vid}-{t}.jpg'
            subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-ss', t, '-i', str(MEDIA / f'{vid}.mp4'),
                            '-frames:v', '1', '-vf', 'scale=900:-2', str(target)], check=True)
            print(target.relative_to(APP))
    else:
        print(__doc__)
        return 2
    return 0


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.exit(main(sys.argv[1:]))
