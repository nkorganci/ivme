"""Shared OCR cache identity; dictionary changes do not invalidate page text."""
import hashlib
import json
from pathlib import Path

APP = Path(__file__).resolve().parents[1]
STATE = APP / 'veri/content-labels'
VERSION = 'tur-ocr-144dpi-v1'
FALLBACK_VERSION = 'tur-ocr-300dpi-gray-focus-v1'
SUMMARY_VERSION = 'tur-ocr-300dpi-summary-content-v1'
RASTER_BODY_VERSION = 'tur-ocr-144dpi-raster-body-v1'


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


def read_versions(source_sha, page, model_sha):
    return [record for version in (SUMMARY_VERSION,RASTER_BODY_VERSION,FALLBACK_VERSION,VERSION)
            if (record:=read_version(source_sha,page,model_sha,version))]


def preferred(records):
    # A later unsuccessful pass must not erase an earlier rendered blank-page
    # certificate or readable full-page OCR of the same unchanged source.
    return next((r for r in records if r['status'] in ('EXTRACTED','BLANK_VERIFIED')),records[0] if records else None)


def read_page(source_sha, page, model_sha):
    return preferred(read_versions(source_sha,page,model_sha))
