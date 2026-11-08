"""Read real scanned-question and ZIP duplicate risks without source/model writes."""
from pathlib import Path
import tempfile

import pymupdf
from yks_birlestirme import Store,digest,read_json,write_json
from yks_pilot_kaynaklari import APP
from pdf_source_scan import read_scan,read_evidence_scan
from pdf_ocr_cache import read_page,model_hash,cache_path
from yks_pdf_on_tarama import materialize

SCANNED='1d1e0be7990cd5bed296f8dc3c8db332d811cd956f3104575858448d854e7b6f'
ZIP_PDF='6135f25358db393eba2de11825b15cc7595246165f3ddfaa477134e57da99607'


def main():
    store=Store(APP/'veri/yks-birlestirme');state=store.current();root=store.child(state['runId'])
    file=next(root/a['path'] for a in state['stages']['YKS-03:full']['artifacts'] if a['path'].endswith('pdf-groups.jsonl'))
    groups={g['sha256']:g for g in map(__import__('json').loads,file.read_text(encoding='utf-8').splitlines())}
    folder=root/'pilot-riskleri';folder.mkdir(exist_ok=True)
    source=groups[SCANNED]['canonicalCandidate'];path=Path(source['root'])/source['path']
    if digest(path)!=SCANNED:raise ValueError('Scanned question PDF changed')
    native=read_scan(SCANNED)['pages'][58];model=model_hash();ocr=read_page(SCANNED,59,model)
    if not native['needsOcr'] or ocr is None or ocr['status']!='EXTRACTED':raise ValueError('Real low-text scanned question with cached OCR required')
    observed=read_evidence_scan(SCANNED,for_review=True)['pages'][58]
    if not observed['questionSignal'] or len(ocr['text'])<=500:raise ValueError('Raster question was incorrectly omitted by a native-only scan')
    cache=cache_path(SCANNED,59,model,ocr['extractorVersion'])
    out=folder/'scanned-question';out.mkdir(exist_ok=True);parts=[]
    with pymupdf.open(path) as doc:
        page=doc[58]
        images=sorted(page.get_images(full=True),key=lambda r:r[2]*r[3],reverse=True)[:2]
        for index,item in enumerate(images,1):
            payload=doc.extract_image(item[0]);part=out/(f'original-panel-{index}.'+payload['ext']);part.write_bytes(payload['image'])
            parts.append({'xref':item[0],'file':str(part),'sha256':digest(part),
                'sourceBboxPt':[list(rect) for rect in page.get_image_rects(item[0])],
                'method':'EXACT_EMBEDDED_IMAGE_BYTES_NO_REPAINT_OR_RETYPE'})
    scanned={'status':'PASS','scope':'SCANNED_QUESTION_OBSERVATION_REUSE_ONLY','sourceSha256':SCANNED,
        'sourcePath':str(path),'pdfPage':59,'nativeTextChars':native['chars'],'nativeQuestionSignal':native['questionSignal'],
        'withOcrQuestionSignal':observed['questionSignal'],'ocrEvidencePath':str(cache),'ocrEvidenceSha256':digest(cache),
        'ocrModelSha256':model,'ocrStatus':ocr['status'],'sourceParts':parts,'newOcrCalls':0,'modelsCalled':0,
        'importAccepted':False,'reason':'Source question visible in raster panels; printed key/test-number/topic evidence still required.',
        'teacherApproved':False,'questionBankWrites':0}
    write_json(out/'scanned-question-report.json',scanned)
    group=groups[ZIP_PDF]
    member=next(row for row in group['occurrences'] if row['kind']=='ZIP_PDF')
    standalone=next(row for row in group['occurrences'] if row['kind']=='FILE')
    original=Path(standalone['root'])/standalone['path']
    if digest(original)!=ZIP_PDF:raise ValueError('ZIP standalone PDF changed')
    with tempfile.TemporaryDirectory(prefix='ivme-yks-zip-pilot-') as scratch:
        extracted=materialize(member,Path(scratch));equal=digest(extracted)==digest(original)
        if not equal:raise ValueError('ZIP member does not equal the standalone PDF')
    archive=Path(member['root'])/member['path']
    report={'status':'PASS','scope':'REAL_ZIP_PDF_EXACT_DUPLICATE','sourceSha256':ZIP_PDF,'containerPath':str(archive),
        'containerSha256':member['containerSha256'],'member':member['member'],'standalonePath':str(original),
        'exactMemberEqualsStandalone':equal,'newQuestionSourceCreated':False,'archiveModified':False,
        'tempExtractionRemoved':not Path(scratch).exists(),'questionBankWrites':0,'modelsCalled':0}
    write_json(folder/'zip-duplicate-report.json',report)
    print(__import__('json').dumps({'scanned':{k:v for k,v in scanned.items() if k!='sourceParts'},'zip':report}))


if __name__=='__main__':main()
