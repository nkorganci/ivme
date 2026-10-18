"""Shared OCR cache identity; dictionary changes do not invalidate page text."""
import hashlib
import json
from pathlib import Path

APP = Path(__file__).resolve().parents[1]
STATE = APP / 'veri/content-labels'
VERSION = 'tur-ocr-144dpi-v1'
FALLBACK_VERSION = 'tur-ocr-300dpi-gray-focus-v1'


def model_hash():
    return hashlib.sha256((APP / 'veri/tessdata/tur.traineddata').read_bytes()).hexdigest()


def cache_path(source_sha, page, model_sha, version=VERSION):
    return STATE / 'pdf-ocr-cache' / f'{source_sha}-{page}-{version}-{model_sha[:16]}.json'


def read_version(source_sha, page, model_sha, version=VERSION):
    path = cache_path(source_sha,page,model_sha,version)
    if not path.is_file():
        return None
    record = json.loads(path.read_text(encoding='utf-8'))
    if (record['sourceSha256'],record['page'],record['modelSha256'],record['extractorVersion']) != (source_sha,page,model_sha,version):
        raise ValueError('Invalid OCR cache identity')
    if hashlib.sha256(record['text'].encode()).hexdigest()!=record['textSha256']:
        raise ValueError('OCR cache text checksum mismatch')
    return record


def read_page(source_sha, page, model_sha):
    return read_version(source_sha,page,model_sha,FALLBACK_VERSION) or read_version(source_sha,page,model_sha)
