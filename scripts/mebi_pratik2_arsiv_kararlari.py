"""Give every local source and PDF page an explicit first-pass disposition.

DONE here means every source has a recorded result or reasoned review route.
It never means every printed question was extracted, accepted or published.
Question, group, page, container and raw-signal counts stay separate.
"""
import csv
import hashlib
import json
import sqlite3
from collections import Counter,defaultdict
from pathlib import Path
from mebi_pratik2_tam_pdf_tarama import BASE
from yks_birlestirme import write_json


def review_category(reasons):
    text=' '.join(map(str,reasons)).upper()
    if 'SOURCE_CONTENT' in text:return 'KAYNAK_ICERIK_TUTARLILIGI'
    if any(word in text for word in ['PIXEL','CHANGED','BOZUK','UNREADABLE']):return 'KAYNAK_VEYA_GORSEL_KANITI'
    if any(word in text for word in ['TOPIC','KONU','BRANCH','SUBJECT']):return 'KONU_DERS_ESLESTIRMESI'
    if any(word in text for word in ['KEY','ANSWER','CEVAP']):return 'CEVAP_ANAHTARI_DOGRULAMASI'
    if any(word in text for word in ['BODY','CROP','CONTEXT','GEOMETRY','CHOICE','BOUNDARY','GOVDE']):return 'SORU_GOVDESI_BUTUNLUGU'
    return 'BELGE_DUZENI_VE_SORU_KIMLIGI'


def run():
    from mebi_pratik2_pdf_tekrar_kapisi import load_decisions,skip_pdf
    pdf_decisions=load_decisions()
    scope_path=BASE/'remaining-positive-layout-cues/report.json'
    scope_data=json.loads(scope_path.read_text(encoding='utf8')) if scope_path.exists() else {}
    scope_exclusions={r['sourceSha256']:r for r in scope_data.get('sourceExamScopeExclusions',[])
                      if r['status']=='YDT_ENGLISH_OUTSIDE_REQUESTED_TYT_AYT_BANK'}
    page_proof_path=BASE/'empty-original-pages/report.json'
    page_proofs={(r['sourceSha256'],r['physicalPage']):r for r in
        (json.loads(page_proof_path.read_text(encoding='utf8')).get('pages',[]) if page_proof_path.exists() else [])}
    inventory=json.loads((BASE/'inventory.json').read_text(encoding='utf8'))['items']
    pdfs={r['relativePath']:r for r in json.loads((BASE/'full-pdf-coverage.json').read_text(encoding='utf8'))['documents']}
    containers={r['relativePath']:r for r in json.loads((BASE/'package-content-report.json').read_text(encoding='utf8'))['containers']}
    db=sqlite3.connect(BASE/'review-index.sqlite3');db.row_factory=sqlite3.Row
    by_source=defaultdict(list);by_page=defaultdict(list);states=Counter()
    for row in db.execute('SELECT code,status,payload FROM candidate_decisions'):
        value=json.loads(row['payload']);states[row['status']]+=1
        source=value.get('sourceSha256');status=row['status']
        item={'code':row['code'],'status':status,'reviewCategory':review_category(value.get('reasons',[])),'reasons':value.get('reasons',[])}
        if source:by_source[source].append(item)
        page=value.get('bodyPage') or value.get('pdfPage')
        if source and page:by_page[(source,int(page))].append(item)
    native={}
    for row in db.execute('SELECT source_sha,page,kind,count(*) n FROM native_signals GROUP BY source_sha,page,kind'):
        native.setdefault((row['source_sha'],row['page']),{})[row['kind']]=row['n']
    folder=BASE/'archive-disposition';folder.mkdir(exist_ok=True)
    sources=[];page_states=Counter();page_count=0;review_paths=[]
    with (folder/'pdf-page-decisions.jsonl').open('w',encoding='utf8') as page_stream:
        for source in inventory:
            relative=source['relativePath'];sha=source['sha256'];candidates=by_source[sha]
            published=[r['code'] for r in candidates if r['status']=='PUBLISHED_SOURCE_VERIFIED_NOT_TEACHER_APPROVED']
            aliases=[r['code'] for r in candidates if r['status']=='EXACT_DUPLICATE_SOURCE_OCCURRENCE']
            pending=[r for r in candidates if r['status'] not in ('PUBLISHED_SOURCE_VERIFIED_NOT_TEACHER_APPROVED','EXACT_DUPLICATE_SOURCE_OCCURRENCE','SOURCE_PDF_ALREADY_IN_EXISTING_PRACTICE')]
            row={'relativePath':relative,'sourceSha256':sha,'extension':source['extension'],
                'publishedSourceQuestionCodes':published,'additionalSourceOccurrenceCodes':aliases,
                'reviewQuestionCandidates':len(pending),'reviewCategories':dict(Counter(r['reviewCategory'] for r in pending)),
                'distinctPrintedQuestionTotal':None,'sourceModified':False,'studentVisible':False}
            if relative in pdfs:
                pdf=pdfs[relative];cache=json.loads((BASE/pdf['cache']).read_text(encoding='utf8'))
                if len(cache['pages'])!=pdf['pageCount']:raise ValueError('PDF page accounting gap')
                for page in cache['pages']:
                    key=(sha,page['physicalPage']);known=by_page[key];signals=native.get(key,{})
                    visible=[r['code'] for r in known if r['status']=='PUBLISHED_SOURCE_VERIFIED_NOT_TEACHER_APPROVED']
                    page_proof=page_proofs.get(key,{})
                    empty_page=page_proof.get('status') in ('PROVED_EMPTY_ORIGINAL_PAGE','AGENT_VIEWED_EMPTY_SOURCE_PAGE')
                    if sha in pdf_decisions and skip_pdf(sha,pdf_decisions):state='AYNI_PDF_MEVCUT_PRAKTIKTE_YENIDEN_KARSILASTIRILMADI'
                    elif sha in scope_exclusions:state='KAPSAM_DISI_YDT_INGILIZCE_TYT_AYT_DEGIL'
                    elif empty_page:state='DOGRULANMIS_BOS_KAYNAK_SAYFASI'
                    elif page_proof.get('status')=='AGENT_READ_PRINTED_ANSWER_KEY':state='BASILI_CEVAP_ANAHTARI_GORSEL_OKUNDU'
                    elif page['readingStatus']=='VISUAL_REVIEW_REQUIRED':state='INCELEME_GORSEL_METIN_OKUNAMADI'
                    elif signals.get('NUMBERED_BODY_SIGNAL') or signals.get('PRINTED_KEY_CELL_SIGNAL') or known:
                        state='AKTARILAN_SORULAR_VE_KALAN_ADAY_INCELEMESI' if visible else 'INCELEME_SORU_CEVAP_KONU_BAGI'
                    else:state='NATIVE_SAYFA_TARANDI_NUMARALI_ADAY_BULUNAMADI'
                    page_row={'relativePath':relative,'sourceSha256':sha,'physicalPage':page['physicalPage'],
                        'status':state,'publishedCodes':visible,'candidateCodes':[r['code'] for r in known],
                        'rawNativeSignalsNotQuestionCounts':signals,'nativeCache':pdf['cache'],
                        'sourcePageDispositionEvidence':str(page_proof_path.relative_to(BASE)) if page_proof else None,
                        'fullVisualQuestionAbsenceProved':empty_page,'studentVisible':False}
                    page_stream.write(json.dumps(page_row,ensure_ascii=False)+'\n');page_states[state]+=1;page_count+=1
                row.update(status='ISLENDI_AKTARIM_VE_GEREKCELI_INCELEME' if published else 'INCELEME_PDF_SORU_CEVAP_KONU_DUZENI',
                    firstPassProcessed=True,pageCount=pdf['pageCount'],reviewReason='NUMARALI_ISARET_TEK_BASINA_SORU_VEYA_CEVAP_KABULU_DEGIL')
            elif relative in containers:
                row.update(status='INCELEME_YEREL_SORU_ICERIGI_EKSIK_VEYA_PAKET_UYESI',firstPassProcessed=True,
                    reviewReason='YEREL_HTML_BAGLANTILARI_VEYA_PAKET_IKILI_UYELERI_DOGRULANMIS_SORU_SAYILMAZ',cache=containers[relative]['cache'])
            elif source['extension'] in {'.mp4','.mp3'}:
                row.update(status='INCELEME_MEDYA_ICIN_PDF_SORU_CEVAP_KANITI_YOK',firstPassProcessed=True,
                    reviewReason='MEDYA_ENVANTERE_ALINDI_TUM_KARELERDE_SORU_YOKTUR_IDDIASI_YOK')
            elif source['extension'] in {'.png','.jpg','.jpeg','.webp','.svg','.gif'}:
                row.update(status='INCELEME_BAGIMSIZ_GORSEL_CEVAP_KIMLIGI',firstPassProcessed=True,
                    reviewReason='BAGIMSIZ_GORSEL_ICIN_BASILMIS_SORU_CEVAP_KONU_BAGI_BELIRSIZ')
            else:row.update(status='KAPSAM_DISI_DESTEK_VEYA_METADATA',firstPassProcessed=True,reviewReason=source.get('reason'))
            if sha in pdf_decisions and skip_pdf(sha,pdf_decisions):
                row.update(status='ATLANDI_MEVCUT_PRAKTIK_PDF',reviewReason='KULLANICI_PDF_DUZEYI_TEKRAR_KURALI',existingPracticePdfDecision=pdf_decisions[sha])
            elif sha in scope_exclusions:
                row.update(status='KAPSAM_DISI_YDT_INGILIZCE',reviewReason='BASILI_YDT_INGILIZCE_KIMLIGI_TYT_AYT_DEGIL',
                    sourceExamScopeEvidence=scope_exclusions[sha])
            sources.append(row)
            if row['status'].startswith('INCELEME') or pending:review_paths.append(row)
    expected_pages=sum(r['pageCount'] for r in pdfs.values())
    if page_count!=expected_pages or len(sources)!=len(inventory):raise ValueError('First-pass source/page accounting gap')
    db.execute('CREATE TABLE IF NOT EXISTS source_dispositions(relative_path TEXT PRIMARY KEY,status TEXT NOT NULL,payload TEXT NOT NULL,student_visible INTEGER NOT NULL DEFAULT 0 CHECK(student_visible=0))')
    with db:
        for row in sources:
            db.execute('INSERT INTO source_dispositions(relative_path,status,payload) VALUES(?,?,?) ON CONFLICT(relative_path) DO UPDATE SET status=excluded.status,payload=excluded.payload',
                (row['relativePath'],row['status'],json.dumps(row,ensure_ascii=False)))
    db.close()
    write_json(folder/'source-decisions.json',{'sources':sources,'sourcePaths':len(sources),'unassignedPaths':0})
    with (folder/'source-review.csv').open('w',encoding='utf-8-sig',newline='') as stream:
        fields=['relativePath','status','reviewReason','reviewQuestionCandidates','reviewCategories','sourceSha256'];writer=csv.DictWriter(stream,fieldnames=fields);writer.writeheader()
        for row in review_paths:writer.writerow({k:json.dumps(row[k],ensure_ascii=False) if isinstance(row.get(k),(dict,list)) else row.get(k,'') for k in fields})
    report={'status':'FIRST_PASS_SOURCE_AND_PAGE_DISPOSITIONS_COMPLETE','sourcePaths':len(sources),'assignedSourcePaths':len(sources),
        'pdfPages':page_count,'assignedPdfPages':page_count,'sourceStates':dict(Counter(r['status'] for r in sources)),
        'pageStates':dict(page_states),'candidateDecisionStates':dict(states),'allPrintedQuestionsExtracted':False,
        'totalArchiveQuestions':None,'teacherApprovalInferred':False,'applicationDatabaseWrites':0,
        'reviewPolicy':'NO_RETRY_CURRENT_PASS_KEEP_EVIDENCE_FOR_LATER_TEACHER_OR_SEPARATELY_AUTHORIZED_AI_REVIEW'}
    write_json(folder/'report.json',report);print(json.dumps(report))


if __name__=='__main__':run()
