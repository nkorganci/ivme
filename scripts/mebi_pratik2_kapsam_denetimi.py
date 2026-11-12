"""Reconcile source coverage, including ZIP members without executing/extracting them."""
import json
import re
import zipfile
from pathlib import Path, PurePosixPath
from yks_birlestirme import write_json
from mebi_pratik2_tam_pdf_tarama import BASE, SOURCE


def safe_member(name):
    path = PurePosixPath(name.replace('\\', '/'))
    return not path.is_absolute() and '..' not in path.parts and not re.match(r'^[A-Za-z]:', str(path))


def run():
    inventory = json.loads((BASE/'inventory.json').read_text(encoding='utf-8'))['items']
    rows = []
    for source in inventory:
        ext = source['extension']
        row = {'relativePath':source['relativePath'], 'sourceSha256':source['sha256'],
               'studentVisible':False, 'acceptedQuestions':0}
        if ext == '.pdf':
            cache = BASE/'full-pdf-native'/(source['sha256']+'.json')
            row['status'] = 'NATIVE_DISCOVERY_CACHED' if cache.is_file() else 'NATIVE_DISCOVERY_PENDING'
        elif ext == '.zip':
            row['members'] = []
            try:
                with zipfile.ZipFile(SOURCE/source['relativePath']) as archive:
                    for member in archive.infolist():
                        if member.is_dir(): continue
                        row['members'].append({'name':member.filename,'bytes':member.file_size,
                            'crc32':member.CRC,'safePath':safe_member(member.filename),
                            'status':'MEMBER_CONTENT_REVIEW_PENDING'})
                row['status'] = 'ZIP_CONTENT_REVIEW_PENDING'
            except (OSError, zipfile.BadZipFile) as error:
                row.update(status='SOURCE_UNREADABLE', errorType=type(error).__name__)
        elif ext == '.html':
            row['status'] = 'HTML_CONTENT_REVIEW_PENDING'
        elif ext in {'.mp4','.mp3'}:
            row['status'] = 'MEDIA_INVENTORIED_NO_QUESTION_ABSENCE_CLAIM'
        else:
            row['status'] = 'METADATA_OR_SUPPORT_FILE'
        rows.append(row)
    from collections import Counter
    result = {'version':1,'status':'COVERAGE_RECONCILED_NOT_ACCEPTED',
        'files':len(rows),'counts':dict(Counter(r['status'] for r in rows)),
        'sources':rows,'stage02Accepted':False,'questionCount':None}
    write_json(BASE/'source-coverage-audit.json', result)
    print(json.dumps({k:v for k,v in result.items() if k!='sources'}))


if __name__=='__main__':run()
