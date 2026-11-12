"""Propose only exact controlled topic names printed on the original first page."""
import json
import re
import unicodedata
from collections import Counter
from pathlib import Path
from mebi_pratik2_tam_pdf_tarama import BASE,APP
from yks_birlestirme import write_json


def normalize(text):
    text=text.replace('ı','i').replace('İ','I').casefold()
    text=''.join(c for c in unicodedata.normalize('NFKD',text) if not unicodedata.combining(c))
    return ' '.join(re.findall(r'[a-z0-9]+',text))


def run():
    categories=json.loads((APP/'backend/src/main/resources/content-taxonomy.json').read_text(encoding='utf8'))['categories']
    docs=json.loads((BASE/'single-test-bindings.json').read_text(encoding='utf8'))['documents']
    rows=[]
    for doc in docs:
        path=Path(doc['relativePath']);parts=path.parts
        exam=next((p for p in parts if p in ('TYT','AYT')),None)
        lesson=next((p.split(' (')[0] for p in parts if p.endswith('(TYT)') or p.endswith('(AYT)')),None)
        data=json.loads((BASE/doc['cache']).read_text(encoding='utf8'))
        lines=data['pages'][0]['lines'] if data['pages'] else []
        # Only headings in the first 110 PDF points; stems cannot label their own topic.
        headings=[line for line in lines if line['bbox'][1]<110 and len(line['text'])<140]
        matches={}
        for category in categories:
            if not category.get('selectable') or category.get('exam')!=exam:continue
            if normalize(category.get('subject',''))!=normalize(lesson or ''):continue
            labels={normalize(category.get('topic','')),normalize(category.get('subtopic',''))}
            labels.update(normalize(a) for a in category.get('aliases',[]))
            labels.discard('')
            for line in headings:
                if normalize(line['text']) in labels:
                    matches[category['id']]={'categoryId':category['id'],'topic':category['topic'],
                        'unit':category.get('unit'),'printedHeading':line['text'],'headingBBox':line['bbox']}
        rows.append({'sourceSha256':doc['sourceSha256'],'relativePath':doc['relativePath'],
            'exam':exam,'lesson':lesson,'matches':list(matches.values()),
            'status':'EXACT_PRINTED_TOPIC_CANDIDATE' if len(matches)==1 else 'KONU_BELIRSIZ',
            'studentVisible':False,'questionSemanticReviewStillRequired':True})
    result={'status':'PRINTED_TOPIC_DISCOVERY_COMPLETE','rows':rows,
            'counts':dict(Counter(r['status'] for r in rows)),'questionWrites':0}
    write_json(BASE/'single-test-crops/topic-candidates.json',result)
    print(json.dumps({'status':result['status'],'counts':result['counts']}))


if __name__=='__main__':run()
