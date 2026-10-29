"""Verify existing language/history source cards; never import from similarity.

The whole stem, all five options and mapped answer must match. Diagram, formula
and typographic emphasis questions stay pending. Source/bank image and text
hashes freeze the evidence; no answers, labels or student history are changed.
"""
import hashlib
import json
from pathlib import Path

from kaynakli_arastirma_db import db_connection,query
from pdf_source_scan import APP,OUT,digest,write_json
from pdf_source_reconcile import json_query
from pdf_slide_compare import compare

SUBJECTS={'Türkçe','Türk Dili ve Edebiyatı','Tarih','Felsefe','Din Kültürü ve Ahlak Bilgisi'}


def main():
    connection=db_connection('ivme')
    bank={q['code']:q for q in json_query(connection,"SELECT code,active,subject,image,correct_answer,extract(epoch FROM updated_at)::text source_stamp FROM questions WHERE active AND exam_type IN ('TYT','AYT')")}
    originals={q['code']:q.get('original',{}).get('text','') for q in json.loads((APP/'veri/content-labels/source-inventory.json').read_text(encoding='utf-8'))['questions']}
    for observed in json_query(connection,"""SELECT DISTINCT ON(o.question_code) o.question_code,o.observations->>'text' text
      FROM learning_catalog.question_content_observations o JOIN questions q ON q.code=o.question_code
      WHERE q.active AND q.exam_type IN ('TYT','AYT') AND extract(epoch FROM q.updated_at)::text=o.observations->>'questionStamp'
      ORDER BY o.question_code,o.recorded_at DESC"""):
        if sum(c.isalpha() for c in observed['text'])>sum(c.isalpha() for c in originals.get(observed['question_code'],'')):
            originals[observed['question_code']]=observed['text']
    raw={};package_hashes={}
    for path in sorted((APP.parent/'veri-hatti/ogm-sorular/kayit').glob('*.json')):
        data=json.loads(path.read_text(encoding='utf-8-sig'))
        if not isinstance(data,dict) or not data.get('dosya'):continue
        for card in data.get('kayitlar',[]):raw[card['id']]=(path,card)
    candidates={r['code']:r for r in json.loads((OUT/'text-duplicate-candidates.json').read_text(encoding='utf-8'))['candidates']}
    occurrences=json.loads((OUT/'reconciliation.json').read_text(encoding='utf-8'))['occurrences']
    pending=[o for o in occurrences
        if o['status'] not in ('LINKED','EXCLUDED') and o['evidence']['origin']=='EXACT_RAW_FILE']
    verified=[o['evidence']['comparisonEvidence'] for o in occurrences
        if o['status']=='LINKED' and o['evidence']['origin']=='REVIEWED_RAW_SOURCE_BANK_LINK'
        and bank.get(o['code'],{}).get('source_stamp')==o['evidence'].get('sourceStamp')]
    needs_review=[{'sourceCode':o['evidence']['sourceCode'],'reason':o['evidence'].get('sourceQualityReview',{}).get('reason','BANK_OR_SOURCE_REVIEW')}
        for o in occurrences if o['status']=='NEEDS_REVIEW' and o['evidence']['origin']=='REVIEWED_RAW_SOURCE_BANK_LINK']
    for occurrence in pending:
        code=occurrence['evidence']['sourceCode']
        if code not in raw:continue
        path,card=raw[code];answers=card.get('cevaplar',[])
        if len(answers)!=1 or card.get('cevaplar_A')!=answers or card.get('cevaplar_B')!=answers:continue
        for proposal in candidates.get(code,{}).get('matches',[]):
            question=bank.get(proposal['code'])
            if not question or question['subject'] not in SUBJECTS:continue
            strict_language=question['subject'] in ('Türkçe','Türk Dili ve Edebiyatı')
            result=compare(card.get('metin',''),originals.get(question['code'],''),answers[0],question['correct_answer'],strict_language=strict_language)
            if result['status']!='VERIFIED_TEXT_OPTIONS_AND_MAPPED_ANSWER':continue
            source_image=(APP.parent/'icerik'/card['gorsel']).resolve()
            if not source_image.is_relative_to((APP.parent/'icerik').resolve()):raise ValueError('Raw image outside original archive')
            package_hashes.setdefault(path,digest(path))
            record={'sourceCode':code,'canonicalCode':question['code'],'sourceSha256':occurrence['sha256'],
                'sourcePackage':path.relative_to(APP.parent).as_posix(),'packageSha256':package_hashes[path],
                'pdfPage':occurrence['page'],'sourceImageSha256':digest(source_image),
                'bankImageSha256':digest(APP/'veri/resimler-pilot'/question['image']),
                'sourceTextSha256':hashlib.sha256(card['metin'].encode()).hexdigest(),
                'bankTextSha256':hashlib.sha256(originals[question['code']].encode()).hexdigest(),
                'sourceAnswer':answers[0],'bankAnswer':question['correct_answer'],'bankStamp':question['source_stamp'],
                'comparisonMode':'LITERAL_LANGUAGE' if strict_language else 'PROSE_IDENTITY',
                'teacherApproved':False,'reviewMethod':'COMPLETE_STEM_FIVE_OPTIONS_AND_CANONICAL_ANSWER',**result}
            record['reviewSha256']=hashlib.sha256(json.dumps(record,ensure_ascii=False,sort_keys=True).encode()).hexdigest()
            verified.append(record);break
    write_json(OUT/'raw-verified-links.json',{'verifiedLinks':verified,'reviewedCandidates':len(pending),'needsReview':needs_review})
    print(json.dumps({'verifiedLinks':len(verified),'reviewedCandidates':len(pending),'needsReview':len(needs_review)}),flush=True)


if __name__=='__main__':main()
