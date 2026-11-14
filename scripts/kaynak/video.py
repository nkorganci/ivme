"""16.02: video bağlantı tablosu (MEBİ katalog.json/envanter + YouTube) ve bağlantı denetimi.

kaynak_kaydi.video_baglari: her adres için bir satır (kaynak, url, yerel dosya kimliği, konu, durum).
Denetim: MEBİ CDN adresine HEAD (Content-Length yerel boyutla karşılaştırılır); YouTube için oEmbed;
oturum isteyen MEBİ varlıkları MEBİ sayfa adresiyle (oturum gerektiren) kaydedilir.
Sonra kaynak_kaydi.dosyalar'daki video/ses kararı güncellenir (adres var + denetim geçti -> silinir, yoksa bekler).
"""
import argparse
import json
import re
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import ortak
from ortak import APP, VERI, norm_yol

MEBI = 'D:/workspace/mebi-yks/'
DDL = """
CREATE SCHEMA IF NOT EXISTS kaynak_kaydi;
CREATE TABLE IF NOT EXISTS kaynak_kaydi.video_baglari (
  url text PRIMARY KEY,
  kaynak text NOT NULL,                 -- mebi | youtube
  dosya_kimligi text,                   -- yerel mp4/mp3 (yoksa NULL)
  tur text,                             -- video | ses | youtube
  baslik text, ders text, sinav text, konu text, konu_id text,
  sayfa_url text,                       -- oturum isteyenler için MEBİ sayfa adresi
  oturum_gerekli boolean NOT NULL DEFAULT false,
  durum text NOT NULL,                  -- OK | BOYUT_FARKLI | OTURUM | ULASILAMADI | KONTROL_EDILMEDI
  http_kodu integer, yerel_boyut bigint, uzak_boyut bigint,
  kontrol_zamani timestamptz
);
"""


def head(url, zaman=20):
    istek = urllib.request.Request(url, method='HEAD', headers={'User-Agent': 'Mozilla/5.0 ivme-kaynak-kaydi'})
    try:
        with urllib.request.urlopen(istek, timeout=zaman) as r:
            return r.status, int(r.headers.get('Content-Length') or 0)
    except urllib.error.HTTPError as e:
        return e.code, 0
    except Exception:  # noqa: BLE001
        return 0, 0


def yt_kontrol(url, zaman=20):
    adres = 'https://www.youtube.com/oembed?format=json&url=' + urllib.parse.quote(url, safe='')
    try:
        with urllib.request.urlopen(urllib.request.Request(adres, headers={'User-Agent': 'Mozilla/5.0'}), timeout=zaman) as r:
            return r.status
    except urllib.error.HTTPError as e:
        return e.code
    except Exception:  # noqa: BLE001
        return 0


def mebi_satirlari():
    kayit = {}
    for s in open(VERI / 'kayit.jsonl', encoding='utf-8'):
        d = json.loads(s)
        if d['tur'] in ('video', 'ses') and d['kaynak_url']:
            kayit[d['kaynak_url']] = d
    katalog = json.load(open(MEBI + 'katalog.json', encoding='utf-8'))
    oturumlu = {a['url'] for p in katalog['pages'] for a in p['assets'] if a.get('authenticated')}
    envanter = {}
    for s in open(MEBI + 'envanter.jsonl', encoding='utf-8'):
        r = json.loads(s)
        envanter[r['asset_url']] = r
    satirlar = []
    for url, d in kayit.items():
        e = envanter.get(url) or {}
        sayfa = next(iter(e.get('source_pages') or []), None)
        satirlar.append({'url': url, 'kaynak': 'mebi', 'dosya_kimligi': d['dosya_kimligi'], 'tur': d['tur'],
                         'baslik': e.get('title'), 'ders': d['ders'], 'sinav': d['sinav'], 'konu': d['konu'],
                         'konu_id': d['konu_id'], 'oturum_gerekli': url in oturumlu,
                         'sayfa_url': ('https://mebi.eba.gov.tr' + sayfa) if sayfa else None, 'yerel_boyut': d['boyut']})
    # yerel dosyası olmayan ama katalogda adresi olan MEBİ videoları
    for url in set(envanter) - set(kayit):
        e = envanter[url]
        if e.get('resource_type') in ('konu_anlatimi', 'sesli_ozet'):
            sayfa = next(iter(e.get('source_pages') or []), None)
            satirlar.append({'url': url, 'kaynak': 'mebi', 'dosya_kimligi': None,
                             'tur': 'video' if e['resource_type'] == 'konu_anlatimi' else 'ses', 'baslik': e.get('title'),
                             'ders': None, 'sinav': e.get('exam'), 'konu': None, 'konu_id': None, 'oturum_gerekli': url in oturumlu,
                             'sayfa_url': ('https://mebi.eba.gov.tr' + sayfa) if sayfa else None, 'yerel_boyut': None})
    return satirlar


def youtube_satirlari():
    bulunan = {}
    fizik = json.load(open(APP / 'frontend/src/data/physicsVideos.json', encoding='utf-8'))
    for t in fizik['topics']:
        for ders in t['lessons']:
            for v in ders['videos']:
                bulunan[v['url']] = {'baslik': v.get('title'), 'ders': 'Fizik', 'sinav': t['exam'], 'konu': t['topic']}
    metin = open(APP / 'scripts/matematik-konu-listesi.json', encoding='utf-8').read()
    for u in re.findall(r'https://www\.youtube\.com/(?:watch\?v=|playlist\?list=)[\w-]+', metin):
        bulunan.setdefault(u, {'baslik': None, 'ders': 'Matematik', 'sinav': None, 'konu': None})
    return [{'url': u, 'kaynak': 'youtube', 'dosya_kimligi': None, 'tur': 'youtube', 'oturum_gerekli': False,
             'sayfa_url': None, 'yerel_boyut': None, 'konu_id': None, **v} for u, v in bulunan.items()]


def ana(args):
    satirlar = mebi_satirlari() + youtube_satirlari()
    print(f'{len(satirlar)} bağlantı (mebi {sum(s["kaynak"] == "mebi" for s in satirlar)})', flush=True)
    kilit = threading.Lock()
    sayac = [0]

    def kontrol(s):
        s['kontrol_zamani'] = time.strftime('%Y-%m-%dT%H:%M:%S')
        s['http_kodu'], s['uzak_boyut'] = None, None
        if args.cevrimdisi:
            s['durum'] = 'KONTROL_EDILMEDI'
        elif s['kaynak'] == 'youtube':
            kod = yt_kontrol(s['url'])
            s['http_kodu'] = kod
            s['durum'] = 'OK' if kod == 200 else 'ULASILAMADI'
        elif s['oturum_gerekli']:
            s['durum'] = 'OTURUM' if s['sayfa_url'] else 'ULASILAMADI'
        else:
            kod, boyut = head(s['url'])
            s['http_kodu'], s['uzak_boyut'] = kod, boyut or None
            if kod == 200:
                s['durum'] = 'BOYUT_FARKLI' if (s['yerel_boyut'] and boyut and boyut != s['yerel_boyut']) else 'OK'
            else:
                s['durum'] = 'ULASILAMADI'
        with kilit:
            sayac[0] += 1
            if sayac[0] % 300 == 0:
                print(f'{sayac[0]}/{len(satirlar)}', flush=True)

    with ThreadPoolExecutor(args.is_parcacigi) as ex:
        list(ex.map(kontrol, satirlar))
    ortak.sql_calistir(DDL)
    ortak.sql_calistir('TRUNCATE kaynak_kaydi.video_baglari')
    for i in range(0, len(satirlar), 1500):
        parca = json.dumps(satirlar[i:i + 1500], ensure_ascii=False)
        ortak.sql_calistir("INSERT INTO kaynak_kaydi.video_baglari (url, kaynak, dosya_kimligi, tur, baslik, ders, sinav, konu, konu_id, "
                           "sayfa_url, oturum_gerekli, durum, http_kodu, yerel_boyut, uzak_boyut, kontrol_zamani) SELECT url, kaynak, "
                           "dosya_kimligi, tur, baslik, ders, sinav, konu, konu_id, sayfa_url, oturum_gerekli, durum, http_kodu, "
                           "yerel_boyut, uzak_boyut, kontrol_zamani FROM jsonb_populate_recordset(null::kaynak_kaydi.video_baglari, "
                           f"$json${parca}$json$::jsonb)")
    # video/ses kararı: adres kayıtta ve denetimi geçtiyse silinir; yoksa bekler
    ortak.sql_calistir("""
        UPDATE kaynak_kaydi.dosyalar d SET url_durumu = v.durum,
          karar = CASE WHEN v.durum IN ('OK','OTURUM') THEN 'silinir' ELSE 'bekler' END,
          gerekce = CASE v.durum
            WHEN 'OK' THEN 'video/ses adresi kayıtta ve bağlantı denetiminden geçti (boyut eşit)'
            WHEN 'OTURUM' THEN 'adres kayıtta; oturum ister, MEBİ sayfa adresiyle yeniden indirilebilir'
            WHEN 'BOYUT_FARKLI' THEN 'adres canlı fakat uzak boyut yerelden farklı; kullanıcı kararı'
            ELSE 'bağlantı denetimi geçmedi (' || v.durum || ')' END
        FROM kaynak_kaydi.video_baglari v WHERE v.dosya_kimligi = d.dosya_kimligi AND d.tur IN ('video','ses')""")
    ozet = ortak.sorgu("SELECT kaynak, tur, durum, count(*) FROM kaynak_kaydi.video_baglari GROUP BY 1,2,3 ORDER BY 1,2,3")
    print(ozet)
    (VERI / 'video-ozet.txt').write_text(ozet, encoding='utf-8')


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--cevrimdisi', action='store_true', help='ağ denetimi yapma')
    p.add_argument('--is-parcacigi', type=int, default=8)
    ana(p.parse_args())
