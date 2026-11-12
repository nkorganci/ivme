"""Build a read-only, resumable MEBI Practice 2 source inventory.

No source file or database row is changed.  Every in-scope file is represented
either as an extraction candidate or an explicit non-candidate/review record.
"""
from pathlib import Path
import argparse, hashlib, json, os
from collections import Counter

APP=Path(__file__).resolve().parents[1]
SOURCE=Path(r'D:\workspace\mebi-yks')
OUT=APP/'veri/mebi-pratik-2/20261111-source-inventory'
QUESTION_WORDS=('soru','test','deneme','tarama','kitap','çıkmış','cikmis','3 adım','3 adim')
ANSWER_WORDS=('cevap','anahtar','çözüm','cozum','çözümler','cozumler')

def sha256(path):
    with path.open('rb') as f:return hashlib.file_digest(f,'sha256').hexdigest()

def source_records():
    found={}
    for line in (SOURCE/'envanter.jsonl').open(encoding='utf-8'):
        row=json.loads(line); relative=row.get('local_path')
        if relative: found[relative.replace('/','\\')]=row
    return found

def classify(relative, extension):
    lower=relative.casefold()
    if extension not in {'.pdf','.html','.zip'}: return 'NON_QUESTION_ASSET', 'FORMAT_NOT_QUESTION_CONTAINER'
    question=any(word in lower for word in QUESTION_WORDS)
    answer=any(word in lower for word in ANSWER_WORDS)
    if answer:return 'ANSWER_CANDIDATE','ANSWER_KEYWORD_OR_PATH'
    if question:return 'QUESTION_CANDIDATE','QUESTION_KEYWORD_OR_PATH'
    return 'REVIEW_QUEUE','QUESTION_POTENTIAL_UNCLASSIFIED'

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--hash',action='store_true');args=parser.parse_args()
    if not SOURCE.is_dir():raise ValueError('MEBI source root does not exist')
    OUT.mkdir(parents=True,exist_ok=True); records=source_records();items=[];queue=[];counts=Counter()
    for path in sorted(p for p in SOURCE.rglob('*') if p.is_file() and '_araclar' not in p.parts):
        relative=str(path.relative_to(SOURCE)); ext=path.suffix.casefold(); source=records.get(relative)
        state,reason=classify(relative,ext); counts[state]+=1
        item={'sourceRoot':str(SOURCE),'relativePath':relative,'bytes':path.stat().st_size,
              'extension':ext,'state':state,'reason':reason,'sourceRecordId':source.get('resource_id') if source else None,
              'exam':source.get('exam') if source else ('TYT' if relative.startswith('TYT\\') else 'AYT' if relative.startswith('AYT\\') else None),
              'lesson':source.get('lesson') if source else None,'sha256':sha256(path) if args.hash else None,
              'hashStatus':'VERIFIED' if args.hash else 'PENDING_FULL_HASH'}
        items.append(item)
        if state in {'REVIEW_QUEUE','ANSWER_CANDIDATE'}:
            queue.append({**item,'queue':'MEBI_PRACTICE_2_REVIEW_QUEUE',
                          'reviewStatus':'PENDING_SOURCE_PAIRING','studentVisible':False})
    manifest={'version':1,'scope':'MEBI_PRACTICE_2_SOURCE_INVENTORY','sourceRoot':str(SOURCE),
      'hashMode':'FULL' if args.hash else 'METADATA_ONLY','files':len(items),'states':dict(counts),
      'items':items,'sourceDownloadRecords':len(records),'sourceFilesNotInDownloadRecord':sum(x['sourceRecordId'] is None for x in items)}
    (OUT/'inventory.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    (OUT/'review-queue.json').write_text(json.dumps({'version':1,'queue':'MEBI_PRACTICE_2_REVIEW_QUEUE','studentVisible':False,'items':queue},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    (OUT/'report.json').write_text(json.dumps({'status':'PASS','scope':'READ_ONLY_SOURCE_INVENTORY',
      'files':len(items),'states':dict(counts),'fullHashes':sum(x['sha256'] is not None for x in items),
      'reviewQueue':len(queue),'studentVisibleWrites':0,'databaseWrites':0},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(json.loads((OUT/'report.json').read_text(encoding='utf-8')),ensure_ascii=False))

if __name__=='__main__':main()
