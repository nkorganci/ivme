"""16.02: kaynak kaydı. Her fiziksel dosya için TEK satır + bir karar (kalir / silinir / bekler).

Girdi : veri/kaynak-kayit/dosyalar.jsonl (disk_raporu.py), hash-onbellek.jsonl (hashle.py), mebi-yks/envanter.jsonl,
        PostgreSQL learning_catalog (pdf_sources, pdf_question_occurrences, current_categories).
Çıktı : PostgreSQL kaynak_kaydi.dosyalar, veri/kaynak-kayit/kayit.jsonl ve kayit-raporu.json.
Konu eşleme sırası: klasör / mebi sayfa kimliği (katalog.json) -> bge-m3 benzerliği -> gpt-oss:20b (yalnız kararsızlar).
Dosya silmez veya taşımaz; "silinir" yalnız 16.03'te kullanıcı onayıyla uygulanacak öneridir.
"""
import argparse
import json
import re
import sys
import time
from collections import Counter, defaultdict
from pathlib import Path

import ortak
from ortak import VERI, norm_yol, sade

MEBI = 'D:/workspace/mebi-yks/'
KAYNAKLAR = 'D:/workspace/ivme/Kaynaklar/'
DERS_ADI = {'cografya': 'Coğrafya', 'felsefe': 'Felsefe', 'fizik': 'Fizik', 'kimya': 'Kimya', 'biyoloji': 'Biyoloji',
            'tarih': 'Tarih', 'matematik': 'Matematik', 'geometri': 'Geometri', 'din': 'Din Kültürü',
            'turk dili ve edebiyati': 'Edebiyat', 'edebiyat': 'Edebiyat', 'turkce': 'Türkçe', 'psikoloji': 'Psikoloji',
            'sosyoloji': 'Sosyoloji', 'mantik': 'Mantık'}
GERI_ALINIR_UZANTI = {'.html', '.htm', '.js', '.css', '.json', '.txt', '.md', '.xml', '.png', '.jpg', '.jpeg', '.svg',
                      '.gif', '.webp', '.csv', '.tsv'}

DDL = """
CREATE SCHEMA IF NOT EXISTS kaynak_kaydi;
CREATE TABLE IF NOT EXISTS kaynak_kaydi.dosyalar (
  dosya_kimligi text PRIMARY KEY,           -- dev:ino (sabit bağlantılar tek satır)
  sha256 text,
  boyut bigint NOT NULL,
  uzanti text,
  tur text NOT NULL,                        -- video, ses, zip, html, konu_anlatimi, soru, karma, deneme, cikmis, kitap, cevap, mufredat, diger
  sinav text, ders text, unite text, konu text, konu_id text,
  konu_yontemi text,                        -- klasor | katalog | bge-m3 | gpt-oss | kapsam-disi | belirsiz
  konu_guven real,
  soru_sayisi integer NOT NULL DEFAULT 0,   -- bankada bu PDF'ye bağlı tekil soru
  soru_durumu text,                         -- TAM | KISMI | YOK | BILINMIYOR
  sayfa_sayisi integer,
  kaynak_url text, url_durumu text,         -- indirilebilir adres ve bağlantı denetimi sonucu
  yollar jsonb NOT NULL,
  karar text NOT NULL CHECK (karar IN ('kalir','silinir','bekler')),
  gerekce text NOT NULL,
  hedef text,                               -- 16.03 hedef klasörü
  siralama_puani real,
  kaydedildi timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS dosyalar_sha ON kaynak_kaydi.dosyalar (sha256);
CREATE INDEX IF NOT EXISTS dosyalar_karar ON kaynak_kaydi.dosyalar (karar, tur);
"""


def ders_bul(yollar, kayit):
    """Klasör / envanter kaydından ders adı (katalog Subject adı) ve sınav."""
    adaylar = []
    if kayit:
        adaylar.append(re.sub(r'\s*\(.*?\)\s*', '', kayit.get('lesson') or ''))
    for y in yollar:
        for parca in norm_yol(y).split('/'):
            adaylar.append(parca)
    sinav = None
    for y in yollar:
        p = norm_yol(y)
        if '/TYT' in p.upper() + '/' and not sinav:
            sinav = 'TYT'
        if '/AYT' in p.upper() + '/':
            sinav = 'AYT' if not sinav or sinav == 'AYT' else sinav
    if kayit and kayit.get('exam') in ('TYT', 'AYT'):
        sinav = kayit['exam']
    for a in adaylar:
        s = sade(a)
        if s in DERS_ADI:
            return DERS_ADI[s], sinav
        if s.startswith('din kulturu'):
            return 'Din Kültürü', sinav
    return None, sinav


def tur_bul(uzanti, yollar, kayit, kaynak):
    birlesik = sade(' '.join(norm_yol(y) for y in yollar))
    if uzanti == '.mp4':
        return 'video'
    if uzanti == '.mp3':
        return 'ses'
    if uzanti == '.zip':
        return 'zip'
    if uzanti in GERI_ALINIR_UZANTI:
        return 'html' if uzanti in ('.html', '.htm') else 'diger'
    if uzanti != '.pdf':
        return 'diger'
    if kaynak:
        bicim = {'TEST': 'soru', 'KONU_ANLATIMI': 'konu_anlatimi', 'KARMA': 'karma', 'CALISMA_REHBERI': 'kitap',
                 'CEVAP_ANAHTARI': 'cevap'}.get(kaynak['bicim'])
        if bicim:
            return bicim
    baslik = sade((kayit or {}).get('title', ''))
    if 'cikmis' in birlesik:
        return 'cikmis'
    if '/mufredat/' in norm_yol(' '.join(yollar)).lower():
        return 'mufredat'
    if 'deneme' in baslik or 'tarama' in birlesik or 'deneme' in birlesik:
        return 'deneme'
    if 'soru bankasi' in birlesik:
        return 'soru'
    if any(k in birlesik for k in ('konu ozet', 'konu anlatim', 'ders anlatim')) or 'konu ozet' in baslik:
        return 'konu_anlatimi'
    return 'kitap'


def yukle_dosyalar():
    hashler = {}
    for s in open(VERI / 'hash-onbellek.jsonl', encoding='utf-8'):
        d = json.loads(s)
        hashler[f"{d['dev']}:{d['ino']}"] = d.get('sha256')
    dosyalar = []
    for s in open(VERI / 'dosyalar.jsonl', encoding='utf-8'):
        d = json.loads(s)
        yollar = [norm_yol(y) for y in d['yollar'] if '/Kaynaklar/' in norm_yol(y) or '/mebi-yks/' in norm_yol(y)]
        if not yollar:
            continue
        k = f"{d['dev']}:{d['ino']}"
        dosyalar.append({'kimlik': k, 'boyut': d['boyut'], 'yollar': sorted(yollar), 'sha': hashler.get(k)})
    return dosyalar


def yukle_mebi():
    kayitlar = {}
    for s in open(MEBI.rstrip('/') + '/envanter.jsonl', encoding='utf-8'):
        r = json.loads(s)
        kayitlar[norm_yol(MEBI + r['local_path'])] = r
    # envanterde olmayan katalog.json varlıkları (adres + ad)
    katalog = json.load(open(MEBI + 'katalog.json', encoding='utf-8'))
    for sayfa in katalog['pages']:
        for a in sayfa['assets']:
            if not a.get('storage_path'):
                continue
            yol = norm_yol(MEBI + a['storage_path'])
            if yol not in kayitlar:
                kayitlar[yol] = {'asset_url': a['url'], 'title': a['name'], 'source_pages': [sayfa['url']],
                                 'hierarchies': [sayfa['path']], 'resource_type': None, 'lesson': None, 'exam': None}
    return kayitlar


def yukle_db():
    pdf = {}
    for s in ortak.sorgu("""SELECT source_sha256, content_format, coverage_state, coalesce(expected_questions,0), page_count
                            FROM learning_catalog.pdf_sources""").splitlines():
        sha, bicim, durum, beklenen, sayfa = s.split('|')
        pdf[sha] = {'bicim': bicim, 'durum': durum, 'beklenen': int(beklenen), 'sayfa': int(sayfa or 0)}
    bagli = {}
    for s in ortak.sorgu("""SELECT source_sha256, count(DISTINCT question_code) FROM learning_catalog.pdf_question_occurrences
                            WHERE status='LINKED' AND question_code IS NOT NULL GROUP BY 1""").splitlines():
        sha, n = s.split('|')
        bagli[sha] = int(n)
    konular = []
    satirlar = ortak.sorgu("""SELECT category_id, definition::text FROM learning_catalog.current_categories
                              WHERE definition->>'origin'='CURRICULUM' AND definition->>'selectable'='true'""").splitlines()
    for s in satirlar:
        kimlik, tanim = s.split('|', 1)
        d = json.loads(tanim)
        konular.append({'id': kimlik, 'sinav': d.get('exam'), 'ders': d.get('subject'), 'unite': d.get('unit') or '',
                        'konu': d.get('topic') or '', 'dugum': d.get('providerNodeId'),
                        'sayfa': (d.get('curriculumReference') or {}).get('url')})
    return pdf, bagli, konular


def konu_eslestir(ogeler, konular, llm_sinir):
    """ogeler: [{'anahtar','ders','sinav','metin'}] -> {'anahtar': (konu, yontem, guven)}"""
    if not ogeler:
        return {}
    kullanilabilir = [k for k in konular]
    metinler = [f"{k['ders']} {k['unite']} {k['konu']}" for k in kullanilabilir]
    print(f'bge-m3: {len(kullanilabilir)} konu, {len(ogeler)} dosya gömülüyor', flush=True)
    k_gom = ortak.gom(metinler)
    o_gom = ortak.gom([f"{o['ders'] or ''} {o['metin']}" for o in ogeler])
    import math

    def kosinus(a, b):
        return sum(x * y for x, y in zip(a, b)) / (math.sqrt(sum(x * x for x in a)) * math.sqrt(sum(y * y for y in b)) + 1e-9)

    sonuc, belirsiz = {}, []
    for o, v in zip(ogeler, o_gom):
        aday = []
        for k, kv in zip(kullanilabilir, k_gom):
            if o['ders'] and sade(k['ders']) != sade(o['ders']):
                continue
            if o['sinav'] and k['sinav'] and o['sinav'] != k['sinav']:
                continue
            aday.append((kosinus(v, kv), k))
        aday.sort(key=lambda x: -x[0])
        if not aday:
            sonuc[o['anahtar']] = (None, 'belirsiz', 0.0)
            continue
        ilk = aday[0][0]
        fark = ilk - (aday[1][0] if len(aday) > 1 else 0)
        if ilk >= 0.72 and fark >= 0.04:
            sonuc[o['anahtar']] = (aday[0][1], 'bge-m3', round(ilk, 3))
        else:
            belirsiz.append((o, aday[:5]))
    print(f'bge-m3 kesin: {len(sonuc)}, LLM adayı: {len(belirsiz)}', flush=True)
    for i, (o, aday) in enumerate(belirsiz):
        if i >= llm_sinir:
            sonuc[o['anahtar']] = (None, 'belirsiz', round(aday[0][0], 3))
            continue
        secenek = '\n'.join(f"{n + 1}. {k['unite']} / {k['konu']}" for n, (_, k) in enumerate(aday))
        istem = (f"Bir {o['ders'] or 'YKS'} ders kaynağı: \"{o['metin'][:300]}\".\nBu kaynak hangi konuya aittir?\n{secenek}\n"
                 "Yalnız numarayı yaz; hiçbiri uygun değilse 0 yaz.")
        try:
            yanit = ortak.http_json('/api/chat', {'model': 'gpt-oss:20b', 'stream': False, 'think': 'low',
                                                  'messages': [{'role': 'user', 'content': istem}],
                                                  'options': {'num_predict': 300, 'temperature': 0}}, 600)
            m = re.search(r'\d', yanit['message']['content'])
            secim = int(m.group()) if m else 0
        except Exception as e:  # noqa: BLE001
            print('llm hatası', e, file=sys.stderr)
            secim = 0
        if 1 <= secim <= len(aday):
            sonuc[o['anahtar']] = (aday[secim - 1][1], 'gpt-oss', round(aday[secim - 1][0], 3))
        else:
            sonuc[o['anahtar']] = (None, 'belirsiz', round(aday[0][0], 3))
        if (i + 1) % 25 == 0:
            print(f'gpt-oss {i + 1}/{min(len(belirsiz), llm_sinir)}', flush=True)
    return sonuc


def puan(satir):
    """Konu anlatımı sıralama puanı (kaba, belirleyici): resmî kaynak, sayfa, güncellik."""
    yol = ' '.join(satir['yollar']).lower()
    p = 0.0
    if 'ogm-materyal' in yol or '/mebi' in yol or 'meb' in yol:
        p += 3
    if 'konu ozet' in sade(yol) or 'konu özet' in yol:
        p += 1
    p += min((satir.get('sayfa_sayisi') or 0), 60) / 30
    yil = re.findall(r'20(1\d|2\d)', yol)
    if yil:
        p += (int(max(yil)) - 10) / 20
    if satir['uzanti'] == '.pdf' and satir['boyut'] < 50_000:
        p -= 2
    return round(p, 3)


def ana(args):
    t0 = time.time()
    dosyalar = yukle_dosyalar()
    mebi = yukle_mebi()
    pdf, bagli, konular = yukle_db()
    sayfa_konu = {}
    for k in konular:
        if k['sayfa']:
            sayfa_konu[k['sayfa'].split('mebi.eba.gov.tr')[-1]] = k
    print(f'{len(dosyalar)} dosya, {len(mebi)} mebi kaydı, {len(pdf)} pdf kaynağı, {len(konular)} konu', flush=True)

    satirlar = []
    for d in dosyalar:
        yollar = d['yollar']
        kayit = next((mebi[y] for y in yollar if y in mebi), None)
        uzanti = ('.' + yollar[0].rsplit('.', 1)[-1].lower()) if '.' in yollar[0].rsplit('/', 1)[-1] else ''
        kaynak = pdf.get(d['sha']) if d['sha'] else None
        tur = tur_bul(uzanti, yollar, kayit, kaynak)
        ders, sinav = ders_bul(yollar, kayit)
        soru = bagli.get(d['sha'], 0) if d['sha'] else 0
        if kaynak and kaynak['beklenen']:
            durum = 'TAM' if kaynak['durum'] == 'VERIFIED' else ('KISMI' if soru else 'YOK')
        elif soru:
            durum = 'KISMI'
        else:
            durum = 'YOK' if tur in ('soru', 'karma', 'deneme', 'cikmis') else None
        satirlar.append({
            'kimlik': d['kimlik'], 'sha': d['sha'], 'boyut': d['boyut'], 'uzanti': uzanti, 'tur': tur, 'yollar': yollar,
            'sinav': sinav, 'ders': ders, 'unite': None, 'konu': None, 'konu_id': None, 'yontem': None, 'guven': None,
            'soru': soru, 'durum': durum, 'sayfa_sayisi': (kaynak or {}).get('sayfa'),
            'url': (kayit or {}).get('asset_url'), 'url_durumu': None, '_kayit': kayit})

    # --- konu eşleme ---
    bekleyen = []
    for s in satirlar:
        if s['tur'] in ('html', 'diger', 'mufredat', 'cevap'):
            s['yontem'] = 'kapsam-disi'
            continue
        if not any('/YKS/' in y or '/mebi-yks/' in y or '/ogm-materyal/' in y or '/yks-cikmis' in y for y in s['yollar']):
            s['yontem'] = 'kapsam-disi'          # KPSS / LGS / yurt dışı: YKS konu ağacı dışında
            continue
        kayit = s['_kayit']
        bulundu = None
        if kayit:
            for sp in kayit.get('source_pages') or []:
                if sp in sayfa_konu:
                    bulundu = sayfa_konu[sp]
                    break
        if bulundu:
            s.update(unite=bulundu['unite'], konu=bulundu['konu'], konu_id=bulundu['id'], yontem='katalog', guven=1.0,
                     ders=bulundu['ders'], sinav=bulundu['sinav'])
            continue
        parcalar = [p for y in s['yollar'] for p in y.split('/')[-4:]]
        stem = re.sub(r'--[0-9a-f]{6,}.*$', '', s['yollar'][0].rsplit('/', 1)[-1].rsplit('.', 1)[0])
        stem = re.sub(r'^\d+\s*-\s*', '', stem)
        # klasör/ad tam eşleşmesi: yol parçalarından biri bir konu veya ünite adıyla aynıysa
        yerel = [k for k in konular if (not s['ders'] or sade(k['ders']) == sade(s['ders']))
                 and (not s['sinav'] or not k['sinav'] or k['sinav'] == s['sinav'])]
        adlar = {sade(p) for p in parcalar} | {sade(stem)}
        esles = [k for k in yerel if sade(k['konu']) and sade(k['konu']) in adlar]
        if len(esles) == 1:
            k = esles[0]
            s.update(unite=k['unite'], konu=k['konu'], konu_id=k['id'], yontem='klasor', guven=0.95)
            continue
        bekleyen.append({'anahtar': s['kimlik'], 'ders': s['ders'], 'sinav': s['sinav'],
                         'metin': ' / '.join(dict.fromkeys([*(sade(p) for p in parcalar[:-1]), stem]))})
    sonuc = konu_eslestir(bekleyen, konular, args.llm_sinir)
    by = {s['kimlik']: s for s in satirlar}
    for anahtar, (k, yontem, guven) in sonuc.items():
        s = by[anahtar]
        if k:
            s.update(unite=k['unite'], konu=k['konu'], konu_id=k['id'], yontem=yontem, guven=guven, ders=k['ders'])
        else:
            s['yontem'], s['guven'] = 'belirsiz', guven

    # --- kararlar ---
    sha_grup = defaultdict(list)
    for s in satirlar:
        if s['sha'] and s['tur'] not in ('video', 'ses'):
            sha_grup[s['sha']].append(s)
    for s in satirlar:
        s['karar'], s['gerekce'], s['hedef'], s['puan'] = 'kalir', 'varsayılan: küçük/metin kaynağı', None, None
    for grup in sha_grup.values():
        if len(grup) > 1:   # aynı içerik farklı fiziksel dosyada
            grup.sort(key=lambda x: (0 if any('/mebi-yks/' in y for y in x['yollar']) else 1, len(x['yollar'][0])))
            for s in grup[1:]:
                s['karar'], s['gerekce'] = 'silinir', f"aynı SHA-256'lı kopya (kalan: {grup[0]['kimlik']})"
    for s in satirlar:
        tur = s['tur']
        if s['karar'] == 'silinir':
            continue
        if tur in ('video', 'ses'):
            if s['url']:
                s['karar'], s['gerekce'] = 'bekler', 'video adresi kayıtta; bağlantı denetimi (video komutu) bekleniyor'
            else:
                s['karar'], s['gerekce'] = 'bekler', 'video adresi yok; listelenir, karar kullanıcıya ait'
        elif tur == 'zip':
            s['karar'], s['gerekce'] = 'bekler', 'zip içeriği denetimi (zip komutu) bekleniyor'
        elif tur in ('soru', 'karma', 'deneme', 'cikmis'):
            if tur == 'cikmis':
                s['karar'], s['gerekce'], s['hedef'] = 'kalir', 'resmî çıkmış sınav kitapçığı (cevap itirazında referans)', 'cikmis-sinavlar'
            elif s['durum'] == 'TAM':
                s['karar'], s['gerekce'], s['hedef'] = 'kalir', 'bütün soruları bankada (referans)', 'soru-referansi'
            elif s['durum'] == 'KISMI':
                s['karar'], s['gerekce'], s['hedef'] = 'kalir', f"kısmen bankada ({s['soru']} soru)", 'soru-bekleyen'
            elif s['soru'] == 0 and (s['sha'] in pdf):
                s['karar'], s['gerekce'], s['hedef'] = 'kalir', 'sorusu henüz bankaya alınmamış', 'soru-bekleyen'
            else:
                s['karar'], s['gerekce'] = 'bekler', 'soru durumu belirlenemedi (kaynak kayıtta yok)'
        elif tur == 'konu_anlatimi':
            s['puan'] = puan({**s, 'sayfa_sayisi': s['sayfa_sayisi']})
            if not s['konu_id'] or s['yontem'] == 'belirsiz':
                s['karar'], s['gerekce'] = 'bekler', 'konusu belirlenemedi'
    # konu başına en iyi 4 konu anlatımı
    konu_grup = defaultdict(list)
    for s in satirlar:
        if s['tur'] == 'konu_anlatimi' and s['karar'] == 'kalir' and s['konu_id']:
            konu_grup[s['konu_id']].append(s)
    for grup in konu_grup.values():
        grup.sort(key=lambda x: -(x['puan'] or 0))
        for sira, s in enumerate(grup):
            s['hedef'] = f"konu-anlatim/{s['sinav'] or 'YKS'}/{s['ders']}/{s['unite']}/{s['konu']}"
            if sira < 4:
                s['gerekce'] = f'konu başına en iyi 4 içinde ({sira + 1}/{len(grup)})'
            else:
                s['karar'], s['gerekce'] = 'silinir', f"konuda 4'ten fazla anlatım (sıra {sira + 1}/{len(grup)}, puan {s['puan']})"
    for s in satirlar:
        if s['tur'] in ('kitap',) and s['karar'] == 'kalir':
            s['gerekce'] = 'kitap / çalışma rehberi: konu veya soru kaydı yok, kalır'
        if s['tur'] == 'mufredat':
            s['hedef'] = 'mufredat'

    kaydet(satirlar)
    rapor_yaz(satirlar, time.time() - t0)


def kaydet(satirlar):
    cikti = VERI / 'kayit.jsonl'
    kayitlar = []
    for s in satirlar:
        kayitlar.append({
            'dosya_kimligi': s['kimlik'], 'sha256': s['sha'], 'boyut': s['boyut'], 'uzanti': s['uzanti'], 'tur': s['tur'],
            'sinav': s['sinav'], 'ders': s['ders'], 'unite': s['unite'], 'konu': s['konu'], 'konu_id': s['konu_id'],
            'konu_yontemi': s['yontem'] or 'belirsiz', 'konu_guven': s['guven'], 'soru_sayisi': s['soru'],
            'soru_durumu': s['durum'], 'sayfa_sayisi': s['sayfa_sayisi'], 'kaynak_url': s['url'],
            'url_durumu': s['url_durumu'], 'yollar': s['yollar'], 'karar': s['karar'], 'gerekce': s['gerekce'],
            'hedef': s['hedef'], 'siralama_puani': s['puan']})
    with open(cikti, 'w', encoding='utf-8') as f:
        for k in kayitlar:
            f.write(json.dumps(k, ensure_ascii=False) + '\n')
    ortak.sql_calistir(DDL)
    ortak.sql_calistir('TRUNCATE kaynak_kaydi.dosyalar')
    for i in range(0, len(kayitlar), 2000):
        parca = json.dumps(kayitlar[i:i + 2000], ensure_ascii=False)
        assert '$json$' not in parca
        ortak.sql_calistir("INSERT INTO kaynak_kaydi.dosyalar (dosya_kimligi, sha256, boyut, uzanti, tur, sinav, ders, unite, konu, "
                           "konu_id, konu_yontemi, konu_guven, soru_sayisi, soru_durumu, sayfa_sayisi, kaynak_url, url_durumu, "
                           "yollar, karar, gerekce, hedef, siralama_puani) SELECT dosya_kimligi, sha256, boyut, uzanti, tur, sinav, "
                           "ders, unite, konu, konu_id, konu_yontemi, konu_guven, soru_sayisi, soru_durumu, sayfa_sayisi, kaynak_url, "
                           "url_durumu, yollar, karar, gerekce, hedef, siralama_puani FROM jsonb_populate_recordset(null::"
                           f"kaynak_kaydi.dosyalar, $json${parca}$json$::jsonb)")
    print('kaynak_kaydi.dosyalar satır:', ortak.sorgu('SELECT count(*) FROM kaynak_kaydi.dosyalar'), flush=True)


def rapor_yaz(satirlar, sure=0):
    gib = 1024 ** 3
    r = {'sureSn': round(sure), 'dosya': len(satirlar), 'toplamGiB': round(sum(s['boyut'] for s in satirlar) / gib, 2)}
    r['kararBoyut'] = {}
    for k in ('kalir', 'silinir', 'bekler'):
        alt = [s for s in satirlar if s['karar'] == k]
        r['kararBoyut'][k] = {'dosya': len(alt), 'GiB': round(sum(s['boyut'] for s in alt) / gib, 2)}
    r['kararsiz'] = r['kararBoyut']['bekler']['dosya']
    r['turKarar'] = {}
    for s in satirlar:
        h = r['turKarar'].setdefault(s['tur'], {})
        h[s['karar']] = h.get(s['karar'], 0) + 1
    r['konuYontemi'] = dict(Counter(s['yontem'] or 'belirsiz' for s in satirlar))
    r['sha256Eksik'] = sum(1 for s in satirlar if not s['sha'])
    (VERI / 'kayit-raporu.json').write_text(json.dumps(r, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(r, ensure_ascii=False, indent=1))


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--llm-sinir', type=int, default=150, help='gpt-oss:20b ile çözülecek en çok kararsız dosya')
    ana(p.parse_args())
