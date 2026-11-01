"""Matematik konu listesindeki bir ders için video kanıt görevi iskeleti kurar (TAS-11 hattı).

    python scripts/video-konu-gorevi.py <ders-kimliği> [video-kimliği ...]

Video verilmezse scripts/matematik-konu-listesi.json içindeki ilk PL1 ve ilk PL2 videosu
seçilir (en çok üç). Süreler veri/video-hatti/listeler/tam/<liste>.txt dosyasından okunur
(yt-dlp --flat-playlist çıktısı: kimlik|süre|başlık). Var olan görev ve ipucu dosyası
korunur; yalnız eksikler yazılır. İndirme için: python scripts/ivme.py video edin <görev> --erisim
"""
import json
import re
import sys
from pathlib import Path

APP = Path(__file__).resolve().parents[1]
LISTS = APP / 'veri/video-hatti/listeler/tam'
def topic_for(lesson):
    """Dersin katalog kimlikleriyle eşleşen kontrollü sözlük konusunu seçer (video-protips.py aynı kuralı denetler)."""
    text = (APP / f'frontend/src/learn/content/dersler/{lesson}.ders').read_text(encoding='utf-8')
    categories = set(re.search(r'^kategori:\s*(.+)$', text, re.M).group(1).split())
    taxonomy = json.loads((APP / 'backend/src/main/resources/content-taxonomy.json').read_text(encoding='utf-8'))['categories']
    matches = [c['id'] for c in taxonomy if 'subtopic' not in c['id'] and set(c.get('canonicalTopicIds') or [c['id']]) & categories]
    words = set(lesson.split('-'))
    # Anlamca en yakın konu: ders kimliğiyle ortak sözcük sayısı, sonra TYT konusu, sonra genel 'problemler'.
    matches.sort(key=lambda m: (-len(words & set(re.split('[.-]', m))), not m.startswith('tyt.matematik.'),
                                m != 'tyt.matematik.problemler', len(m)))
    return matches[0] if matches else None

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
    topic_id = topic_for(lesson) if topic else None
    if topic is None or topic_id is None:
        print(f'{lesson}: konu listesinde ya da kontrollü sözlükte eşleşen konu yok', file=sys.stderr)
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
            'schema': 'video-evidence-v1', 'id': task_id, 'topicId': topic_id,
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
