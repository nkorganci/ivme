"""16.02: zip denetimi. Zip, içindeki ikili dosyaların (pdf/mp4/mp3) tümü kayıtta (SHA-256) varsa ve adresi kayıtlıysa silinir."""
import hashlib
import json
import zipfile

import ortak
from ortak import VERI

IKILI = ('.pdf', '.mp4', '.mp3')


def ana():
    kayitlar = [json.loads(s) for s in open(VERI / 'kayit.jsonl', encoding='utf-8')]
    bilinen = {k['sha256'] for k in kayitlar if k['tur'] != 'zip' and k['sha256']}
    sonuc = {}
    for k in kayitlar:
        if k['tur'] != 'zip':
            continue
        yol = k['yollar'][0]
        eksik, toplam = 0, 0
        try:
            with zipfile.ZipFile(yol) as z:
                for u in z.infolist():
                    if u.is_dir() or not u.filename.lower().endswith(IKILI):
                        continue
                    toplam += 1
                    h = hashlib.sha256()
                    with z.open(u) as f:
                        for b in iter(lambda: f.read(8 << 20), b''):
                            h.update(b)
                    if h.hexdigest() not in bilinen:
                        eksik += 1
        except Exception as e:  # noqa: BLE001
            sonuc[k['dosya_kimligi']] = ('bekler', f'zip okunamadı: {e}'[:200])
            continue
        if eksik == 0 and k['kaynak_url']:
            sonuc[k['dosya_kimligi']] = ('silinir', f'içindeki {toplam} ikili dosyanın tümü kayıtta; adres kayıtlı')
        elif eksik == 0:
            sonuc[k['dosya_kimligi']] = ('bekler', f'içerik kayıtta ({toplam} ikili) ama indirme adresi yok')
        else:
            sonuc[k['dosya_kimligi']] = ('bekler', f'{eksik}/{toplam} ikili üye kayıtta değil')
    for kimlik, (karar, gerekce) in sonuc.items():
        g = gerekce.replace("'", "''")
        ortak.sql_calistir(f"UPDATE kaynak_kaydi.dosyalar SET karar='{karar}', gerekce='{g}' WHERE dosya_kimligi='{kimlik}'")
    print({k: sum(1 for v in sonuc.values() if v[0] == k) for k in ('silinir', 'bekler')})


if __name__ == '__main__':
    ana()
