"""Filter explicit printed YDT sources from new TYT/AYT question candidates.

The provider's Ortak folder is preserved as provenance, never an exam decision.
Keep source PDFs and original discovery intact; no question/catalog is written.
"""
from collections import Counter
from pathlib import Path
import re

from yks_birlestirme import Store,digest,signature,read_json,write_json,process_lock
from yks_pilot_kaynaklari import APP,plain
from pdf_source_scan import read_scan


def outside_exam(scan):
    body=[p for p in scan['pages'][:5] if re.search(r'(?m)^\s*YDT\s*[•·]\s*INGILIZCE\b',plain(p['text'][:800]))]
    keys=[p for p in scan['pages'][-2:] if 'YABANCIDILTESTI(YDT)' in re.sub(r'\s+','',plain(p['text']))]
    if body and keys:
        return {'printedExam':'YDT','status':'EXPLICIT_PRINTED_YDT_OUTSIDE_TYT_AYT_QUESTION_SCOPE',
            'bodyHeaders':[{'page':p['page'],'nativeTextSha256':p['textSha256']} for p in body],
            'keyHeaders':[{'page':p['page'],'nativeTextSha256':p['textSha256']} for p in keys],
            'catalogScopeCorrectionRequired':True,'sourceDeleted':False,'questionBankWrites':0,'teacherApproved':False}
    return None


def main():
    store=Store(APP/'veri/yks-birlestirme');root=store.child(store.current()['runId']);folder=root/'new-source-discovery'
    source=folder/'progress.json';source_sha=digest(source);discovery=read_json(source)
    if discovery['status']!='COMPLETE':raise ValueError('Complete new-source discovery before exam filtering')
    rows=[];scoped=folder/'exam-scopes';scoped.mkdir(exist_ok=True)
    with process_lock(folder/'.scope-writer.lock'):
        for row in discovery['results']:
            if digest(row['evidencePath'])!=row['evidenceSha256']:raise ValueError('Raw source discovery changed')
            original=read_json(row['evidencePath'])['result'];scan=read_scan(row['sourceSha256']);outside=outside_exam(scan)
            item={**row,'rawCandidateRegions':row['candidateRegions'],'excludedOutsideExamRegions':row['candidateRegions'] if outside else 0,
                'candidateRegions':0 if outside else row['candidateRegions'],'printedExamScopeEvidence':outside,
                'rawDiscoveryEvidencePath':row['evidencePath'],'rawDiscoveryEvidenceSha256':row['evidenceSha256'],
                'sourcePath':original['sourcePath'],'sourceAnswersApproved':False,'teacherApproved':False}
            if outside:
                item['status']='EXCLUDED_PRINTED_YDT_FROM_TYT_AYT_QUESTION_QUEUE'
                proof=scoped/(row['sourceSha256']+'.json')
                write_json(proof,{'sourceSha256':row['sourceSha256'],'sourcePath':original['sourcePath'],
                    'rawEvidenceSha256':row['evidenceSha256'],'scopeEvidence':outside,'excludedCandidateRegions':row['candidateRegions'],
                    'candidates':[],'importEligible':False,'questionBankWrites':0,'sourceWrites':0})
                item.update(evidencePath=str(proof),evidenceSha256=digest(proof))
            rows.append(item)
        if digest(source)!=source_sha:raise ValueError('New discovery changed during exam filtering')
        report={'status':'COMPLETE','scope':'NEW_PDF_DISCOVERY_WITH_EXPLICIT_PRINTED_OUTSIDE_EXAM_FILTER','documents':len(rows),'completed':len(rows),'pending':0,
            'states':dict(Counter(r['status'] for r in rows)),'rawCandidateRegions':discovery['candidateRegions'],
            'candidateRegions':sum(r['candidateRegions'] for r in rows),'excludedYdtDocuments':sum(bool(r['printedExamScopeEvidence']) for r in rows),
            'excludedOutsideExamRegions':sum(r['excludedOutsideExamRegions'] for r in rows),'sourceGroupsSha256':discovery['sourceGroupsSha256'],
            'rawDiscoverySha256':source_sha,'toolSha256':digest(Path(__file__)),'newOcrCalls':0,'newModelCalls':0,'newRenders':0,
            'sourceWrites':0,'questionBankWrites':0,'sourceAnswersApproved':False,'teacherApproved':False,'absenceClaimed':False,'results':rows}
        write_json(folder/'scoped-report.json',report)
    print({k:v for k,v in report.items() if k!='results'})


if __name__=='__main__':main()
