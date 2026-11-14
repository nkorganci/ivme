"""Kaynak kaydı betiklerinin ortak yardımcıları (DB, Ollama, ad normalleştirme). Dosya içeriği değiştirmez."""
import json
import re
import sys
import urllib.request
from pathlib import Path

APP = Path(__file__).resolve().parents[2]
WS = APP.parent
VERI = APP / 'veri/kaynak-kayit'
sys.path.insert(0, str(APP / 'scripts'))
import kaynakli_arastirma_db as _db  # noqa: E402  (psql bağlantısı ve sorgu yardımcıları)

OLLAMA = 'http://127.0.0.1:11434'
_TR = str.maketrans('çğıöşüÇĞİÖŞÜâîû', 'cgiosuCGIOSUaiu')


def norm_yol(y):
    return y.replace(chr(92), '/')


def sade(s):
    """Karşılaştırma için: küçük harf, Türkçe harfler ASCII, yalnız harf/rakam ve tek boşluk."""
    s = (s or '').translate(_TR).lower()
    s = re.sub(r'\([^)]*\)', ' ', s)
    return re.sub(r'\s+', ' ', re.sub(r'[^a-z0-9]+', ' ', s)).strip()


def baglan():
    return _db.db_connection('ivme')


def sorgu(sql):
    return _db.query(baglan(), sql)


def sql_calistir(sql):
    """Çok satırlı SQL (DDL, INSERT) çalıştırır."""
    return _db.query(baglan(), sql.rstrip().rstrip(';'))


def http_json(yol, govde, zaman=300):
    istek = urllib.request.Request(OLLAMA + yol, data=json.dumps(govde).encode(), headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(istek, timeout=zaman) as r:
        return json.loads(r.read())


def gom(metinler, model='bge-m3', parti=64):
    cikti = []
    for i in range(0, len(metinler), parti):
        cikti += http_json('/api/embed', {'model': model, 'input': metinler[i:i + parti]})['embeddings']
    return cikti
