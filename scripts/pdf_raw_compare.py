"""Verify existing language/history source cards; never import from similarity.

The whole stem, all five options and mapped answer must match. Diagram, formula
and typographic emphasis questions stay pending. Source/bank image and text
hashes freeze the evidence; no answers, labels or student history are changed.
"""
import hashlib
import json
import re
from pathlib import Path

from kaynakli_arastirma_db import db_connection,query
from pdf_source_scan import APP,OUT,digest,write_json,read_scan
from pdf_source_reconcile import json_query
from pdf_slide_compare import compare

SUBJECTS={'Türkçe','Türk Dili ve Edebiyatı','Tarih','Tarih-1','Tarih-2',
          'Felsefe','Felsefe Grubu','Coğrafya','Coğrafya-1','Coğrafya-2','Din Kültürü ve Ahlak Bilgisi'}


def discretionary_wraps(text, native_text):
    """Join only words explicitly split with U+00AD in the original PDF.

    Ordinary spaces, punctuation, case and hard hyphens are preserved. In
    particular, neither dictionary guesses nor the proposed bank text can
    decide whether two fragments were one source word.
    """
    readings=[]
    for match in re.finditer(r'([^\W\d_]+)\u00ad[ \t]*\n[ \t]*([^\W\d_]+)',native_text):
        first,second=match.groups()
        pattern=r'(?<!\w)'+re.escape(first)+r'[-\u00ad]?[ \t]*\n[ \t]*'+re.escape(second)+r'(?!\w)'
        if re.search(pattern,text):
            text=re.sub(pattern,first+second,text)
            readings.append({'first':first,'second':second,'nativeOffset':match.start()})
    return text,readings


def source_comparison_text(review, text):
    if 'sourceDiscretionaryWraps' not in review:
        return text
    page=read_scan(review['sourceSha256'])['pages'][review['pdfPage']-1]
    if hashlib.sha256(page['text'].encode()).hexdigest()!=page['textSha256']:
        raise ValueError('Original PDF text cache changed')
    result,readings=discretionary_wraps(text,page['text'])
    if readings!=review['sourceDiscretionaryWraps'] or page['textSha256']!=review.get('nativePageTextSha256'):
        raise ValueError('Discretionary line-wrap evidence changed')
    return result


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
        if o['status'] not in ('LINKED','EXCLUDED') and o['evidence']['origin'] in ('EXACT_RAW_FILE','REVIEWED_RAW_SOURCE_BANK_LINK')]
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
        page=read_scan(occurrence['sha256'])['pages'][occurrence['page']-1]
        source_text,wraps=discretionary_wraps(card.get('metin',''),page['text'])
        proposals=list(candidates.get(code,{}).get('matches',[]))
        if occurrence.get('code') and not any(p['code']==occurrence['code'] for p in proposals):
            proposals.insert(0,{'code':occurrence['code']})
        for proposal in proposals:
            question=bank.get(proposal['code'])
            if not question or question['subject'] not in SUBJECTS:continue
            strict_language=True
            result=compare(source_text,originals.get(question['code'],''),answers[0],question['correct_answer'],strict_language=strict_language)
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
                'sourceDiscretionaryWraps':wraps,'nativePageTextSha256':page['textSha256'],
                'teacherApproved':False,'reviewMethod':'COMPLETE_STEM_FIVE_OPTIONS_AND_CANONICAL_ANSWER',**result}
            record['reviewSha256']=hashlib.sha256(json.dumps(record,ensure_ascii=False,sort_keys=True).encode()).hexdigest()
            verified.append(record);break
    resolved={r['sourceCode'] for r in verified}
    needs_review=[r for r in needs_review if r['sourceCode'] not in resolved]
    write_json(OUT/'raw-verified-links.json',{'verifiedLinks':verified,'reviewedCandidates':len(pending),'needsReview':needs_review})
    print(json.dumps({'verifiedLinks':len(verified),'reviewedCandidates':len(pending),'needsReview':len(needs_review)}),flush=True)


if __name__=='__main__':main()
