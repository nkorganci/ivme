"""Matematik konu listesindeki bir ders için video kanıt görevi iskeleti kurar (TAS-11 hattı).

    python scripts/video-konu-gorevi.py <ders-kimliği> [video-kimliği ...]

Video verilmezse scripts/matematik-konu-listesi.json içindeki ilk PL1 ve ilk PL2 videosu
seçilir (en çok üç). Süreler veri/video-hatti/listeler/tam/<liste>.txt dosyasından okunur
(yt-dlp --flat-playlist çıktısı: kimlik|süre|başlık). Var olan görev ve ipucu dosyası
korunur; yalnız eksikler yazılır. İndirme için: python scripts/ivme.py video edin <görev> --erisim
"""
import json
import sys
from pathlib import Path

APP = Path(__file__).resolve().parents[1]
LISTS = APP / 'veri/video-hatti/listeler/tam'
TOPICS = {
    'temel-kavramlar': 'tyt.matematik.temel-kavramlar', 'sayi-basamaklari': 'tyt.matematik.sayi-basamaklari',
    'bolme-bolunebilme': 'tyt.matematik.bolme-ve-bolunebilme', 'ebob-ekok': 'tyt.matematik.ebob-ve-ekok',
    'rasyonel-sayilar': 'tyt.matematik.rasyonel-sayilar', 'birinci-derece-denklemler': 'tyt.matematik.birinci-dereceden-denklemler',
    'esitsizlikler': 'tyt.matematik.basit-esitsizlikler', 'mutlak-deger': 'tyt.matematik.mutlak-deger',
    'uslu-ifadeler': 'tyt.matematik.uslu-sayilar', 'koklu-ifadeler': 'tyt.matematik.koklu-sayilar',
    'carpanlara-ayirma': 'tyt.matematik.carpanlara-ayirma', 'oran-oranti': 'tyt.matematik.oran-ve-oranti',
    'sayi-kesir-problemleri': 'tyt.matematik.sayi-ve-kesir-problemleri', 'yas-isci-problemleri': 'tyt.matematik.yas-problemleri',
    'yuzde-karisim': 'tyt.matematik.karisim-problemleri', 'kar-zarar': 'tyt.matematik.yuzde-k-r-ve-zarar-problemleri',
    'hareket-problemleri': 'tyt.matematik.hareket-problemleri', 'grafik-rutin-olmayan': 'tyt.matematik.rutin-olmayan-problemler',
    'veri-grafikleri': 'tyt.matematik.veri-ve-istatistik', 'merkezi-egilim': 'tyt.matematik.veri-ve-istatistik',
    'onermeler': 'tyt.matematik.mantik', 'kosullu-onerme': 'tyt.matematik.mantik',
    'kumeler-temel': 'tyt.matematik.kumeler', 'kume-islemleri': 'tyt.matematik.kumeler-kartezyen-carpim',
    'fonksiyon-kavrami': 'tyt.matematik.fonksiyonlara-giris', 'fonksiyon-grafikleri': 'tyt.matematik.fonksiyonlara-giris',
    'bileske-ters': 'tyt.matematik.fonksiyonlara-giris', 'polinom-islemleri': 'tyt.matematik.polinomlar',
    'sayma-permutasyon': 'tyt.matematik.permutasyon', 'kombinasyon': 'tyt.matematik.kombinasyon',
    'olasilik': 'tyt.matematik.olasilik', 'binom': 'tyt.matematik.binom-acilimi',
}
PLAYLIST_FILES = {'PL1': 'PLYh67QmhXVyA.txt', 'PL2': 'PLVoSZ0D0CB3qkytIGl01_CAPZuKgaMbxw.txt'}
NOTE = ('Kullanıcının seçtiği herkese açık TYT kampı oynatma listesinden yerel eğitim/içerik inceleme. '
        'Lisans devri veya yeniden yayın izni iddiası değildir; medya Git dışında kalır.')


def durations():
    found = {}
    for key, name in PLAYLIST_FILES.items():
        path = LISTS / name
        if not path.is_file():
            continue
        for line in path.read_text(encoding='utf-8').splitlines():
            parts = line.split('|', 2)
            if len(parts) == 3 and parts[1].isdigit():
                found[parts[0]] = (int(parts[1]), key, parts[2])
    return found


def main(argv):
    if not argv:
        print(__doc__)
        return 2
    lesson, chosen = argv[0], argv[1:]
    spec = json.loads((APP / 'scripts/matematik-konu-listesi.json').read_text(encoding='utf-8'))
    topic = next((k for k in spec['konular'] if k['id'] == lesson), None)
    if topic is None or lesson not in TOPICS:
        print(f'{lesson}: konu listesinde veya konu eşlemesinde yok', file=sys.stderr)
        return 1
    if not chosen:
        chosen = [v for key in ('PL1', 'PL2') for v in topic['videolar'][key][:1]]
    if not 1 <= len(chosen) <= 3:
        print('1–3 video gerekli', file=sys.stderr)
        return 1
    known = durations()
    missing = [v for v in chosen if v not in known]
    if missing:
        print('Süre bulunamadı (listeyi yenile): ' + ', '.join(missing), file=sys.stderr)
        return 1
    task_id = f'{lesson}-video'
    task_path = APP / 'video-hatti/gorevler' / f'{task_id}.json'
    hints_path = APP / 'video-hatti/ipuclari' / f'{task_id}.json'
    if not task_path.exists():
        playlist_key = known[chosen[0]][1]
        playlist = spec['oynatmaListeleri'][playlist_key]
        task = {
            'schema': 'video-evidence-v1', 'id': task_id, 'topicId': TOPICS[lesson],
            'playlist': {'providerId': 'youtube-playlist:' + playlist['url'].split('list=')[1], 'url': playlist['url'],
                         'selection': 'Konu listesindeki ' + lesson + ' videoları: ' +
                                      '; '.join(f'{v} ({known[v][1]}: {known[v][2]})' for v in chosen) +
                                      '. Başlık konu adayıdır; içerik kanıtı altyazı ve karelerdir.'},
            'sources': [{'providerId': 'youtube:' + v, 'usage': {'status': 'PROCESSING_ALLOWED', 'note': NOTE},
                         'media': f'veri/video-hatti/medya/{v}.mp4', 'transcript': f'veri/video-hatti/medya/{v}.tr.json3',
                         'frameSeconds': [], 'durationSeconds': known[v][0], 'transcriptOrigin': 'PUBLIC_AUTO_CAPTIONS'}
                        for v in chosen],
            'hints': f'video-hatti/ipuclari/{task_id}.json',
            'lesson': f'frontend/src/learn/content/dersler/{lesson}.ders',
            'verificationTests': [f'testler/video-ipucu-{lesson}-test.py'],
        }
        task_path.write_text(json.dumps(task, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
    if not hints_path.exists():
        hints_path.write_text('[]\n', encoding='utf-8', newline='\n')
    print(json.dumps({'task': task_id, 'videos': chosen}, ensure_ascii=False))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
