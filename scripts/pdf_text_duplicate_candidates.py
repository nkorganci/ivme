"""Compare unlinked source cards with all live YKS question texts locally.

TF-IDF returns review candidates; equal topic or similar wording never imports or
merges a question. Exact token/mathematical differences remain available in evidence.
"""
import hashlib
import json
from pathlib import Path
import re

import numpy as np
from scipy import sparse
from sklearn.feature_extraction.text import TfidfVectorizer
import joblib

from pdf_source_scan import APP, OUT, write_json
from kaynakli_arastirma_db import db_connection,query
from pdf_ocr_cache import model_hash
from question_image_ocr import read_image
from pdf_slide_compare import split_question


def main():
    reconciliation = json.loads((OUT/'reconciliation.json').read_text(encoding='utf-8'))
    inventory = json.loads((APP/'veri/content-labels/source-inventory.json').read_text(encoding='utf-8'))
    originals={r['code']:r for r in inventory['questions'] if r.get('exam_type') in ('TYT','AYT')}
    live_codes={r['code'] for r in reconciliation['provenance'] if r['evidence']['active']}
    connection=db_connection('ivme');ocr={}
    if query(connection,"SELECT to_regclass('learning_catalog.question_content_observations') IS NOT NULL")=='t':
        ocr={r['question_code']:r['observations']['text'] for r in json.loads(query(connection,"""SELECT coalesce(json_agg(x),'[]') FROM (
          SELECT DISTINCT ON(o.question_code) o.question_code,o.observations FROM learning_catalog.question_content_observations o
          JOIN questions q ON q.code=o.question_code AND extract(epoch FROM q.updated_at)::text=o.observations->>'questionStamp'
          WHERE q.active AND q.exam_type IN ('TYT','AYT') ORDER BY o.question_code,o.recorded_at DESC) x"""))}
    bank=[]
    for code in sorted(live_codes):
        text=originals.get(code,{}).get('original',{}).get('text','')
        if sum(c.isalpha() for c in ocr.get(code,''))>sum(c.isalpha() for c in text):text=ocr[code]
        bank.append((code,text))
    bank=[(code,text) for code,text in bank if len(text)>30]
    cache=OUT/'text-comparison';cache.mkdir(parents=True,exist_ok=True)
    key=hashlib.sha256(json.dumps(bank,ensure_ascii=False).encode()).hexdigest()
    stamp=cache/'stamp.txt'
    if stamp.exists() and stamp.read_text()==key:
        vectorizer=joblib.load(cache/'vectorizer.joblib');matrix=sparse.load_npz(cache/'bank.npz')
    else:
        vectorizer=TfidfVectorizer(ngram_range=(1,2),max_features=250000,sublinear_tf=True,dtype=np.float32)
        matrix=vectorizer.fit_transform(text for _,text in bank).tocsr()
        joblib.dump(vectorizer,cache/'vectorizer.joblib');sparse.save_npz(cache/'bank.npz',matrix)
        stamp.write_text(key)
    candidates={o['evidence']['sourceCode']:originals.get(o['evidence']['sourceCode'],{}).get('original',{}).get('text','')
                for o in reconciliation['occurrences'] if o['status']!='LINKED' and o['evidence'].get('sourceCode')}
    package_path=APP/'veri/content-labels/pdf-extraction/mini-test-04/candidates.json'
    package=json.loads(package_path.read_text(encoding='utf-8'))
    for card in package['cards']:
        text=card['text']
        if sum(c.isalpha() for c in text)<60:
            observation=read_image((str(package_path.parent/card['image']),card['imageSha256'],model_hash()))
            if sum(c.isalpha() for c in observation['text'])>sum(c.isalpha() for c in text):text=observation['text']
        candidates[card['code']]=text
    for staged_path in sorted((OUT/'slide-candidates').glob('*/candidates.json')):
        staged=json.loads(staged_path.read_text(encoding='utf-8'))
        candidates.update({card['code']:card['text'] for card in staged['cards']})
    discovery_path=OUT/'discovery.json'
    if discovery_path.exists():
        candidates.update({r['locator']:r['text'] for r in json.loads(discovery_path.read_text(encoding='utf-8'))['candidates']})
    results=[];items=sorted(candidates.items())
    for start in range(0,len(items),100):
        batch=items[start:start+100]
        similarities=(vectorizer.transform(text for _,text in batch)@matrix.T).tocsr()
        # Wrapped exam captions otherwise dominate short lesson questions.
        # Compare the complete stem/options a second time without that caption.
        cleaned=[]
        for _,text in batch:
            parts=split_question(text)
            cleaned.append(parts[0]+'\n'+'\n'.join(letter+') '+body for letter,body in parts[1].items()) if parts else text)
        similarities=similarities.maximum(vectorizer.transform(cleaned)@matrix.T).tocsr()
        for index,(code,text) in enumerate(batch):
            row=similarities.getrow(index)
            top=np.argsort(row.data)[-5:][::-1]
            matches=[{'code':bank[row.indices[n]][0],'similarity':round(float(row.data[n]),6)} for n in top if row.data[n]>.25]
            results.append({'code':code,'textChars':len(text),'textSha256':hashlib.sha256(text.encode()).hexdigest(),'matches':matches})
        print(f'Text comparisons: {min(start+100,len(items))}/{len(items)} against {len(bank)} bank texts',flush=True)
    write_json(OUT/'text-duplicate-candidates.json',{'bankTexts':len(bank),'bankTextSha256':key,
        'bankSnapshotSha256':reconciliation['questionSnapshotSha256'],'candidates':results})
    print(json.dumps({'bankTexts':len(bank),'candidates':len(results),'highSimilarity':sum(any(m['similarity']>.9 for m in r['matches']) for r in results)}),flush=True)


if __name__=='__main__':main()
