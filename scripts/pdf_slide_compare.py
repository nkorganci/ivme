"""Independently compare all option texts and stems for proposed lesson links.

Only complete, nonvisual MC text identity (allowing typography and a generic
stem connector) plus the mapped canonical answer can verify a link. A local
model's MATCH alone is insufficient. No bank questions are created or changed.
"""
import hashlib
import json
import re
import unicodedata
from difflib import SequenceMatcher

from kaynakli_arastirma_db import db_connection,query
from pdf_source_scan import APP,OUT,digest,write_json


OPTION=re.compile(r'(?<!\w)([A-E])\s*\)')
HEADER=re.compile(r'(?mi)^\s*\(?\s*(?:19|20)\d{2}\s*[-–]?\s*(?:YGS|LYS\d?|ÖSS|ÖYS|TYT|AYT|MS[ÜU])\b[^\n]*$')
CONNECTOR=re.compile(r'(?mi)^\s*(?:Buna göre|Bu parçaya göre|Bu parçadan hareketle|Bu parçada|Parçada|Bu bilgilere göre|Bu bilgilerden hareketle)\b\s*,?\s*')


def visual_dependency(text):
    return bool(re.search(r'şekil|tablo|grafik|harita|görsel|resim|diyagram|alt[ıi]\s+çizili|koyu\s+(?:yaz|renk)|italik|[=<>≤≥±√∧∨→↔¬]',text,re.I))


def split_question(text):
    # The second line belongs to a wrapped exam caption, never the question.
    text=re.sub(r'(?mi)(^\s*(?:19|20)\d{2}\s*[-–]?\s*(?:AYT|TYT)[^\n]*Sosyal)\s*\n\s*Bilimler-1\s*$',r'\1',text)
    text=HEADER.sub('',text).strip()
    text=re.sub(r'(?mi)^\s*(?:10|11|12)\s*\.?\s*Sınıf Felsefe\s*$','',text).strip()
    text=re.sub(r'^\s*(?:Soru\s+\d+\s*:?\s*|\d{1,3}\s*[.)]\s*)','',text,count=1,flags=re.I)
    markers=list(OPTION.finditer(text))
    if [m[1] for m in markers]!=list('ABCDE'):return None
    return CONNECTOR.sub('',text[:markers[0].start()]),{
        marker[1]:text[marker.end():markers[i+1].start() if i+1<len(markers) else len(text)].strip()
        for i,marker in enumerate(markers)}


def identity(text):
    text=unicodedata.normalize('NFC',text).replace('\u00ad','')
    text=re.sub(r'([A-Za-zÇĞİÖŞÜçğıöşü]{3,})-\s*\n\s*([A-Za-zÇĞİÖŞÜçğıöşü]{3,})',r'\1\2',text)
    letters=re.findall(r'(?<!\w)[^\W\d_](?!\w)',text)
    digits=re.findall(r'\d+(?:[.,]\d+)?',text)
    text=text.replace('I','ı').replace('İ','i').casefold()
    # Punctuation differs between source types; signs/operators remain explicit.
    characters=''.join(c for c in text if c.isalnum() or c in '+-−=<>≤≥±√∧∨→↔¬')
    return characters,digits,letters


def compare(source,bank,source_answer,bank_answer,strict_language=False):
    a=split_question(source);b=split_question(bank)
    if not a or not b:return {'status':'TEXT_OR_OPTIONS_INCOMPLETE'}
    stem,choices=a;other_stem,other_choices=b
    key=(lambda text:re.sub(r'\s+',' ',unicodedata.normalize('NFC',text)).strip()) if strict_language else identity
    mapping={};changed=[]
    for letter,text in choices.items():
        targets=[candidate for candidate,other in other_choices.items() if key(text)==key(other)]
        if len(targets)==1:mapping[letter]=targets[0]
        else:changed.append({'sourceOption':letter,'source':text,'bank':other_choices[letter]})
    same_stem=key(stem)==key(other_stem)
    answer=mapping.get(source_answer)==bank_answer
    visual=visual_dependency(source) or visual_dependency(bank)
    if same_stem and len(mapping)==5 and len(set(mapping.values()))==5 and answer and not visual:
        return {'status':'VERIFIED_TEXT_OPTIONS_AND_MAPPED_ANSWER',
            'matchType':'OPTION_PERMUTATION' if any(k!=v for k,v in mapping.items()) else 'TYPOGRAPHIC_VARIANT',
            'answerPermutation':{k:v for k,v in mapping.items() if k!=v}}
    return {'status':'VISUAL_REVIEW' if visual else 'OPTION_REVIEW' if changed else 'STEM_REVIEW' if not same_stem else 'ANSWER_REVIEW',
        'mapping':mapping,'sourceAnswer':source_answer,'bankAnswer':bank_answer,'changedOptions':changed,
        'sourceStem':stem,'bankStem':other_stem,
        'stemDifferences':[{'source':' '.join(stem.split()[i:j]),'bank':' '.join(other_stem.split()[k:l])}
            for tag,i,j,k,l in SequenceMatcher(None,stem.split(),other_stem.split()).get_opcodes() if tag!='equal']}


def validate_link(row,card,package_path,question,bank_text,bank_image_sha):
    """Recheck frozen evidence before a source link can be published."""
    expected={'sourceTextSha256':hashlib.sha256(card['text'].encode()).hexdigest(),
        'bankTextSha256':hashlib.sha256(bank_text.encode()).hexdigest(),
        'sourceImageSha256':card['imageSha256'],'bankImageSha256':bank_image_sha,
        'packageSha256':digest(package_path),'bankStamp':question['source_stamp'],
        'sourceAnswer':card['answer'],'bankAnswer':question['correct_answer']}
    if any(row.get(key)!=value for key,value in expected.items()):
        raise ValueError('Source/bank link evidence changed after comparison')
    if row.get('teacherApproved') is not False or card['answerMethodA']!=card['answer'] or card['answerMethodB']!=card['answer']:
        raise ValueError('Link has no independent source answer readings')
    if row['status']=='VERIFIED_TEXT_OPTIONS_AND_MAPPED_ANSWER':
        result=compare(card['text'],bank_text,card['answer'],question['correct_answer'],strict_language=row.get('comparisonMode')=='LITERAL_LANGUAGE')
        if result['status']!=row['status'] or result['answerPermutation']!=row.get('answerPermutation'):
            raise ValueError('Full source/bank comparison does not prove the link')
    elif row['status']=='VERIFIED_SOURCE_CONTENT_READING':
        from pdf_slide_link_review import FIELDS,READINGS
        frozen=READINGS.get(card['code'])
        signature=hashlib.sha256(json.dumps({key:row[key] for key in FIELDS},ensure_ascii=False,sort_keys=True).encode()).hexdigest()
        if not frozen or frozen['reviewedPairSha256']!=signature or frozen['canonicalCode']!=row['canonicalCode'] or row['sourceReading']!=frozen['sourceReading']:
            raise ValueError('No explicit reading for these exact source and bank bytes')
        if card['answer']!=question['correct_answer']:raise ValueError('A reading cannot silently correct an answer')
    else:raise ValueError('Unverified source link')


def main():
    from pdf_source_reconcile import excluded_exam
    connection=db_connection('ivme')
    live={r['code']:r for r in json.loads(query(connection,"SELECT json_agg(x) FROM (SELECT code,correct_answer,extract(epoch FROM updated_at)::text stamp FROM questions WHERE active AND exam_type IN ('TYT','AYT')) x"))}
    texts={r['code']:r.get('original',{}).get('text','') for r in json.loads((APP/'veri/content-labels/source-inventory.json').read_text(encoding='utf-8'))['questions']}
    observed=json.loads(query(connection,"""SELECT coalesce(json_agg(x),'[]') FROM(SELECT DISTINCT ON(o.question_code)
      o.question_code,o.observations->>'text' text FROM learning_catalog.question_content_observations o
      JOIN questions q ON q.code=o.question_code AND extract(epoch FROM q.updated_at)::text=o.observations->>'questionStamp'
      WHERE q.active AND q.exam_type IN ('TYT','AYT') ORDER BY o.question_code,o.recorded_at DESC) x"""))
    for row in observed:
        if sum(c.isalpha() for c in row['text'])>sum(c.isalpha() for c in texts.get(row['question_code'],'')):texts[row['question_code']]=row['text']
    images={r['code']:r['fileSha256'] for r in json.loads((OUT/'bank-image-fingerprints.json').read_text(encoding='utf-8'))['images'] if not r['error']}
    cards={c['code']:(path,p,c) for path in (OUT/'slide-candidates').glob('*/candidates.json')
        for p in [json.loads(path.read_text(encoding='utf-8'))] for c in p['cards']}
    proposals=json.loads((OUT/'slide-review-proposals.json').read_text(encoding='utf-8'))
    similarities={r['code']:r for r in json.loads((OUT/'text-duplicate-candidates.json').read_text(encoding='utf-8'))['candidates']}
    verified=[];pending=[];excluded=[]
    for review in proposals['reviews']:
        proposal=review['proposal']
        path,package,card=cards[review['sourceCode']]
        if excluded_exam(card['text']):excluded.append(card['code']);continue
        candidates=[r['code'] for r in similarities.get(card['code'],{}).get('matches',[])]
        proposed=proposal.get('canonicalCode') if proposal['decision']=='MATCH' else None
        if proposed and proposed not in candidates:candidates.insert(0,proposed)
        verified_candidates=[code for code in candidates if code in live and
            compare(card['text'],texts[code],card['answer'],live[code]['correct_answer'])['status']=='VERIFIED_TEXT_OPTIONS_AND_MAPPED_ANSWER']
        canonical=sorted(verified_candidates)[0] if verified_candidates else proposed
        if not canonical:continue
        if canonical not in live:raise ValueError('Compared bank question is no longer active')
        result=compare(card['text'],texts[canonical],card['answer'],live[canonical]['correct_answer'])
        record={'sourceCode':card['code'],'sourceSha256':package['sourceSha256'],'sourcePackage':path.relative_to(APP).as_posix(),
            'packageSha256':digest(path),'pdfPage':card['pdfPage'],'canonicalCode':canonical,'bankStamp':live[canonical]['stamp'],
            'sourceTextSha256':hashlib.sha256(card['text'].encode()).hexdigest(),'bankTextSha256':hashlib.sha256(texts[canonical].encode()).hexdigest(),
            'sourceImageSha256':card['imageSha256'],'bankImageSha256':images[canonical],'sourceAnswer':card['answer'],
            'bankAnswer':live[canonical]['correct_answer'],'teacherApproved':False,**result}
        if result['status']=='VERIFIED_TEXT_OPTIONS_AND_MAPPED_ANSWER':
            record['reviewMethod']='COMPLETE_STEM_FIVE_OPTIONS_AND_CANONICAL_ANSWER'
            record['reviewSha256']=hashlib.sha256(json.dumps(record,ensure_ascii=False,sort_keys=True).encode()).hexdigest()
            verified.append(record)
        else:pending.append(record)
    write_json(OUT/'slide-link-comparison.json',{'verifiedLinks':verified,'needsReview':pending,'excludedOtherExams':excluded})
    print(json.dumps({'verifiedLinks':len(verified),'needsReview':len(pending),'excludedOtherExams':len(excluded)}),flush=True)


if __name__=='__main__':main()
