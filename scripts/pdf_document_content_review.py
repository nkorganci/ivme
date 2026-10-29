"""Frozen whole-document readings, separate from automatic question discovery.

Only explicitly read, unchanged sources can be closed without bank questions.
No filename or absent OCR option labels can create a negative content decision.
"""
import argparse
from collections import Counter
import hashlib
import json

from pdf_source_scan import OUT, ROOT, digest, read_scan, write_json

READINGS={
 '8b733bcdfa17ab0f83fdce2f33452d473d86913c002336613738d8911eed697f':{
   'pageCount':8,'format':'KONU_ANLATIMI','expectedQuestions':0,
   'sourceReading':'Sekiz fiziksel sayfanın gövdesi okundu. Biyoloji, 11. sınıf, İnsan Fizyolojisi / Endokrin Bezler ve Salgıladıkları Hormonlar-1 sunusu; başlıklar ve endokrin sistem şemaları içeriyor. Soru kökü, seçenek takımı veya cevap anahtarı yok; banka için aktarılacak soru yok.',
   'pages':[
     {'page':1,'reading':'Biyoloji 11. sınıf, İnsan Fizyolojisi ve sununun adı bulunan kapak.'},
     {'page':2,'reading':'Endokrin bezin kana hormon salgılaması şeması; ekzokrin ve karma bez için boş açıklama başlıkları.'},
     {'page':3,'reading':'Yalnız Hormonların Özellikleri başlığı; soruya veya seçeneklere ait gövde yok.'},
     {'page':4,'reading':'İnsan vücudunda hipotalamus, hipofiz, epifiz, paratiroit, tiroit, timüs, pankreas, böbrek üstü bezler ve eşey bezlerinin yerleşimi.'},
     {'page':5,'reading':'Hipofiz ön/arka lopları, hormonları ve hedef organları gösteren oklarla bağlanmış şema; seçenekli soru değil.'},
     {'page':6,'reading':'Tiroit bezi ve soluk borusunun işaretlendiği anatomik şekil.'},
     {'page':7,'reading':'Paratiroit bezi başlığı ve endokrin bezlerin boyun/baş bölgesindeki yerleşimini gösteren şekil.'},
     {'page':8,'reading':'Yalnız sununun üst bilgi başlığı ve sınıfı bulunan kapanış sayfası.'}],
   'teacherApproved':False}}


def apply_readings(data):
    files={f['sha256']:f['path'] for f in data['files']}
    occurrences=Counter(o['sha256'] for o in data['occurrences'])
    changed=[]
    for document in data['documents']:
        sha=document['sha256'];reading=READINGS.get(sha)
        if not reading:continue
        if reading.get('teacherApproved') is not False or reading['expectedQuestions']!=0 or reading['format'] not in ('KONU_ANLATIMI','CALISMA_REHBERI'):
            raise ValueError('Invalid no-question document reading')
        if digest(ROOT/files[sha])!=sha:raise ValueError('Explicitly read PDF changed')
        scan=read_scan(sha)
        if scan['error'] or document['pageCount']!=reading['pageCount'] or scan['pageCount']!=reading['pageCount']:
            raise ValueError('Reviewed document page count changed')
        if [p['page'] for p in reading['pages']]!=list(range(1,reading['pageCount']+1)):
            raise ValueError('Whole-document reading does not cover every physical page')
        evidence=document['coverageEvidence']
        # An explicit no-question reading cannot silently erase any candidate,
        # unreadable page, bank occurrence or another source-content problem.
        if occurrences[sha] or document['ocrPages'] or document.get('questionSignalPages') or evidence.get('sourceContentIssues') or evidence.get('quarantinedQuestionCodes'):
            raise ValueError('Document still has unresolved question/source evidence')
        if set(evidence['reasons'])-{'FULL_QUESTION_ENUMERATION_REQUIRED'}:
            raise ValueError('Other document blockers cannot be cleared by this reading')
        proof={**reading,'sourceSha256':sha,'method':'EXPLICIT_WHOLE_PDF_CONTENT_READING',
               'nativePageTextSha256':[p['textSha256'] for p in scan['pages']]}
        proof['readingSha256']=hashlib.sha256(json.dumps(proof,ensure_ascii=False,sort_keys=True).encode()).hexdigest()
        document.update({'coverageState':'NO_QUESTIONS','expectedQuestions':0,'format':reading['format']})
        evidence.update({'reasons':[],'wholeDocumentReading':proof})
        changed.append(sha)
    return changed


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--publish',action='store_true')
    args=parser.parse_args()
    data=json.loads((OUT/'reconciliation.json').read_text(encoding='utf-8'))
    changed=apply_readings(data)
    published=0
    if args.publish:
        from pdf_source_reconcile import db_connection,json_query
        from pdf_question_accept import literal,compact
        from kaynakli_arastirma_db import query
        connection=db_connection('ivme')
        live=json_query(connection,"SELECT code,active,extract(epoch FROM updated_at)::text stamp FROM questions WHERE exam_type IN ('TYT','AYT')")
        snapshot=hashlib.sha256(json.dumps(sorted((q['code'],q['active'],q['stamp']) for q in live),separators=(',',':')).encode()).hexdigest()
        if snapshot!=data['questionSnapshotSha256']:raise ValueError('Bank changed; reconcile before publishing the reading')
        # This incremental path touches only the reviewed sources. Format
        # changes needing a new catalog revision use the full reconciler.
        statements=['BEGIN; SELECT pg_advisory_xact_lock(738452019); SELECT pg_advisory_xact_lock(738452020);']
        for sha in changed:
            document=next(d for d in data['documents'] if d['sha256']==sha)
            state=json_query(connection,f"SELECT content_format,coverage_state,expected_questions,coverage_evidence FROM learning_catalog.pdf_sources WHERE source_sha256={literal(sha)}")
            if len(state)!=1 or state[0]['content_format']!=document['format']:raise ValueError('Full reconciliation needed for this source format')
            if state[0]['coverage_state']=='NO_QUESTIONS' and state[0]['expected_questions']==0 and state[0]['coverage_evidence']==document['coverageEvidence']:
                continue
            published+=1
            statements.append(f"""DO $reading$ BEGIN
              IF EXISTS(SELECT 1 FROM learning_catalog.pdf_question_occurrences WHERE source_sha256={literal(sha)})
                 OR EXISTS(SELECT 1 FROM learning_catalog.current_items i JOIN learning_catalog.pdf_source_catalog c
                    ON i.item_key='pdf:'||c.catalog_id WHERE c.source_sha256={literal(sha)} AND i.content_format IS DISTINCT FROM {literal(document['format'])})
              THEN RAISE EXCEPTION 'Document question or catalog evidence changed'; END IF;
              UPDATE learning_catalog.pdf_sources SET coverage_state='NO_QUESTIONS',expected_questions=0,
                coverage_evidence={literal(compact(document['coverageEvidence']))}::jsonb,recorded_at=now()
                WHERE source_sha256={literal(sha)} AND coverage_evidence={literal(compact(state[0]['coverage_evidence']))}::jsonb;
              IF NOT FOUND THEN RAISE EXCEPTION 'Document evidence changed'; END IF;
              END $reading$;""")
        statements.append('COMMIT;')
        if published:
            query(connection,'\n'.join(statements))
            data['report']['coverage']=dict(Counter(d['coverageState'] for d in data['documents']))
            data['report']['formats']=dict(Counter(d['format'] for d in data['documents']))
            write_json(OUT/'reconciliation.json',data);write_json(OUT/'report.json',data['report'])
    print(json.dumps({'wholeDocumentReadings':len(changed),'publishedSources':published,'published':args.publish}))


if __name__=='__main__':main()
