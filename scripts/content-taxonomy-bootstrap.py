"""One-time registry import. No database mutations or semantic category merges."""
from collections import defaultdict
import hashlib
import json
from pathlib import Path
import sys
from kaynakli_arastirma_db import db_connection, query

APP = Path(__file__).resolve().parents[1]


def load(path):
    return json.loads(path.read_text(encoding='utf-8-sig'))


def main():
    destination = APP / 'backend/src/main/resources/content-taxonomy.json'
    if destination.exists():
        raise SystemExit('Registry exists; update its controlled source instead of bootstrapping again')
    data = load(APP / 'veri/content-labels/labels.json')
    cats = {c['id']: c for c in data['categories']}
    # Preserve dynamic source identities exactly as ReviewCatalog creates them.
    connection = db_connection()
    connection[1]['PGOPTIONS'] += ' -c default_transaction_read_only=on'
    rows = json.loads(query(connection, "SELECT coalesce(json_agg(r),'[]'::json) FROM (SELECT DISTINCT exam_type,subject,topic FROM questions WHERE topic IS NOT NULL AND topic<>'' ORDER BY exam_type,subject,topic) r"))
    subject_ids = {'Türkçe': 'turkce', 'Türk Dili ve Edebiyatı': 'edebiyat', 'Matematik': 'matematik', 'Geometri': 'geometri', 'Tarih': 'tarih', 'Tarih-1': 'tarih', 'Tarih-2': 'tarih', 'Coğrafya': 'cografya', 'Coğrafya-1': 'cografya', 'Coğrafya-2': 'cografya', 'Felsefe': 'felsefe', 'Felsefe Grubu': 'felsefe', 'Din Kültürü': 'din', 'Fizik': 'fizik', 'Kimya': 'kimya', 'Biyoloji': 'biyoloji', 'Psikoloji': 'psikoloji', 'Sosyoloji': 'sosyoloji', 'Mantık': 'mantik'}
    import unicodedata
    import re
    def normalise(text):
        text = text.replace('I','ı').replace('İ','i').lower().replace('ı','i')
        return re.sub('[^a-z0-9]+', ' ', ''.join(c for c in unicodedata.normalize('NFD',text) if not unicodedata.combining(c))).strip()
    seen = {(c['exam'],c['subjectId'],normalise(c['topic'])) for c in cats.values() if not c.get('subtopic')}
    for row in rows:
        branch = subject_ids.get(row['subject'], 'unmapped')
        k = (row['exam_type'],branch,normalise(row['topic']))
        if k in seen:
            continue
        seen.add(k)
        identity = f"source:{row['exam_type'].lower()}.{branch}.{hashlib.sha256(row['topic'].encode()).hexdigest()[:20]}"
        cats[identity] = {'id': identity, 'exam': row['exam_type'], 'subjectId': branch, 'subject': row['subject'], 'topic': row['topic'], 'subtopic': '', 'origin': 'SOURCE'}
    nodes = json.loads(query(connection, "SELECT coalesce(json_agg(t),'[]'::json) FROM (SELECT id,parent_id,kind,code,name FROM taxonomy_nodes ORDER BY id) t"))
    if nodes:
        raise SystemExit('Existing taxonomy nodes require explicit mapping before bootstrapping')
    system_id = 'system.kapsam-incelemesi'
    cats[system_id] = {'id':system_id,'exam':'UNKNOWN','subjectId':'unmapped','subject':'Kapsam incelemesi','topic':'Kapsam incelemesi gerekli','subtopic':'','origin':'SYSTEM','excludeFromAchievement':True}
    for exam in ['TYT','AYT']:
        for branch in sorted({c['subjectId'] for c in cats.values()}-{'unmapped','genel'}):
            identity=f'{exam.lower()}.{branch}.dersin-genel-kapsami'
            if identity not in cats:
                label=next(c['subject'] for c in cats.values() if c['subjectId']==branch)
                cats[identity]={'id':identity,'exam':exam,'subjectId':branch,'subject':label,'topic':'Dersin genel kapsamı','subtopic':'','origin':'SYSTEM'}
    rules=[]
    def rule(pattern,replacement,profiles=('content','pdf')):
        rules.append({'pattern':pattern,'replacement':replacement,'profiles':list(profiles)})
    rule(r'\bkanunlari\b','yasalari')
    rule(r'\bkelimede anlam\b','sozcukte anlam',('content',))
    rule(r'^kuvvet ve hareket$','hareket ve kuvvet',('content',))
    rule(r'^cumle cesitleri$','cumle turleri',('content',))
    rule(r'^kimyasal tepkimelerde hiz$','tepkime hizi',('content',))
    rule(r'\b(?:kelimede|kelime|sozcukte|sozcuk) anlam\b','sozcukte anlam',('pdf',))
    rule(r'kimyasal tepkimelerde hiz','tepkime hizi',('pdf',))
    rule(r'\bkelime(de|ler|nin)?\b','sozcuk$1',('pdf',))
    rule(r'kuvvet ve hareket','hareket ve kuvvet',('pdf',))
    rule(r'fizik bilimi$','fizik bilimine giris',('pdf',))
    rule(r'cumle cesitleri','cumle turleri',('pdf',))
    rule(r'\bfiilimsi\b','fiilimsiler',('pdf',))
    groups=defaultdict(list)
    for c in cats.values():
        if c.get('origin')=='CURRICULUM' and not c.get('subtopic'):
            groups[(c['subjectId'],normalise(c['topic']))].append(c)
    equivalences=[{'from':a['id'],'to':b['id'],'relation':'EXAM_COUNTERPART'} for group in groups.values() for a in group for b in group if a['exam']=='TYT' and b['exam']=='AYT']
    registry={'version':1,'sourceRunKey':load(APP/'veri/content-labels/report.json')['runKey'],
        'aliasRules':rules,'redirects':{},'equivalences':equivalences,
        'identityPolicy':{'rename':'Keep id; add previous display term to aliases.','merge':'Explicit redirect plus review/progress migration; never infer from spelling.','legacy':'Retain published ids, including conflicting source archive headings, for review.','dimensions':'Difficulty, skill, grade, format and question type are independent of topic.','relations':{'PRIMARY':'Direct topic measured or explained; multiple allowed.','SECONDARY':'Co-present secondary content.','PREREQUISITE':'Needed prior knowledge, not a claim of direct coverage.'},'parentInheritance':'Query expansion only; counts use distinct itemKey.','scope':'CANDIDATE is separate from CONFIRMED; no silent promotion.'},
        'legacySources':{'taxonomy_nodes':{'nodes':0,'mapping':[]},'review-vocabulary.json':'Independent controlled dimensions retained.','archiveIds':'Retained; not merged based on a similar title.'},
        'categories':sorted(cats.values(),key=lambda c:c['id'])}
    destination.write_text(json.dumps(registry,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'categories':len(cats),'equivalences':len(equivalences),'destination':str(destination)},ensure_ascii=False))


if __name__=='__main__':
    main()
