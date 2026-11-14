"""Konu paketindeki gerçek soru kodlarını DB'den doğrular ve kimlik bağını yazar (cevap anahtarı yazılmaz).

Kullanım: python scripts/konu/soru_bagi.py <paket-kimliği> [--kontrol]
Çıktı: frontend/src/learn/konu/paketler/<paket>.sorular.json  (kod -> id, sınav, yıl, kaynak)
"""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import kaynakli_arastirma_db as db  # noqa: E402

APP = Path(__file__).resolve().parents[2]


def ana(paket, kontrol):
    kaynak = (APP / f'frontend/src/learn/konu/paketler/{paket}.js').read_text(encoding='utf-8')
    kodlar = sorted(set(re.findall(r"'((?:sb|dd|3a|TYT|AYT_\w+|MEBI2)-[\w-]+)'", kaynak)))
    liste = ','.join("'" + k + "'" for k in kodlar)
    satirlar = json.loads(db.query(db.db_connection(), "SELECT coalesce(json_agg(json_build_object('kod',code,'id',id,'sinav',exam_type,"
                                   "'yil',exam_year,'kaynak',source,'banka',bank) ORDER BY code),'[]') FROM questions WHERE active AND code IN (" + liste + ")"))
    bulunan = {s['kod'] for s in satirlar}
    eksik = [k for k in kodlar if k not in bulunan]
    if eksik:
        print('Bankada bulunmayan kod:', eksik)
        return 1
    hedef = APP / f'frontend/src/learn/konu/paketler/{paket}.sorular.json'
    yeni = json.dumps({s['kod']: {k: v for k, v in s.items() if k != 'kod'} for s in satirlar}, ensure_ascii=False, indent=1) + '\n'
    if kontrol:
        guncel = hedef.exists() and hedef.read_text(encoding='utf-8') == yeni
        print('güncel' if guncel else 'GÜNCEL DEĞİL: soru_bagi.py çalıştır')
        return 0 if guncel else 1
    hedef.write_text(yeni, encoding='utf-8')
    print(len(satirlar), 'soru bağı yazıldı')
    return 0


if __name__ == '__main__':
    sys.exit(ana(sys.argv[1], '--kontrol' in sys.argv))
