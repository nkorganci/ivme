"""Bind official MEBI folder/catalog labels to existing main-table identities.

Source unit/topic names are preserved separately from canonical main-table
names. Mixed exams and missing/ambiguous mappings remain explicit, never a
single guessed label for every question in a book. No AI, crop or DB writes.
"""
import hashlib
import json
import re
from collections import Counter,defaultdict
from pathlib import Path
from mebi_pratik2_tam_pdf_tarama import APP,BASE,SOURCE
from mebi_pratik2_konu_basligi import normalize
from mebi_pratik2_tek_tarama_konu import source_subject,heading_category
from mebi_pratik2_arsiv_basliklari import controlled_match
from yks_birlestirme import write_json

ROOT=BASE/'source-folder-labels';_index=None;_categories=None;_question_index=None
UNIT_CONTAINMENT={
 ('AYT','Biyoloji','Sinir Sistemi'):'Denetleyici ve Düzenleyici Sistem, Duyu Organları',
 ('AYT','Biyoloji','Endokrin Sistem'):'Denetleyici ve Düzenleyici Sistem, Duyu Organları',
 ('AYT','Biyoloji','Duyu Organları'):'Denetleyici ve Düzenleyici Sistem, Duyu Organları',
 ('AYT','Biyoloji','Bitkisel Dokular'):'Bitkilerin Yapısı',
 ('AYT','Biyoloji','Kan Dolaşımı'):'Dolaşım Sistemleri',
 ('AYT','Biyoloji','Lenf Dolaşımı'):'Dolaşım Sistemleri',
 ('AYT','Biyoloji','Bağışıklık Sistemi'):'Dolaşım Sistemleri',
 ('AYT','Biyoloji','Üreme Sistemi'):'Üreme Sistemi ve Embriyonik Gelişim',
 ('TYT','Biyoloji','Hücresel Yapılar ve Görevleri'):'Hücre',
 ('TYT','Biyoloji','Hücre Zarından Madde Geçişleri'):'Hücre',
 ('TYT','Biyoloji','Canlıların Yapısında Bulunan Organik Bileşikler'):'Canlıların Yapısında Bulunan Temel Bileşikler',
 ('TYT','Biyoloji','Canlıların Yapısında Bulunan İnorganik Bileşikler'):'Canlıların Yapısında Bulunan Temel Bileşikler',
 ('TYT','Biyoloji','Canlı Âlemleri'):'Canlı Âlemleri ve Özellikleri',
 ('AYT','Edebiyat','Cumhuriyet Dönemi Türk Şiiri'):'Cumhuriyet Dönemi Türk Edebiyatı',
 ('AYT','Edebiyat','Cumhuriyet Dönemi Türk Romanı'):'Cumhuriyet Dönemi Türk Edebiyatı',
}


def path_key(value):return str(value).replace('\\','/').strip('/').casefold()


def printed_category(headings,exam,subject,categories):
    found=heading_category(headings,exam,subject,categories)
    if found:return found
    parts=[p.strip() for h in headings for p in h['text'].split('>')[1:] if p.strip()]
    if not parts:return None
    choices={}
    for part in parts:
        part=re.sub(r'\s+\d+(?:\s*[-–]\s*\d+)?$','',part)
        target=UNIT_CONTAINMENT.get((exam,subject,part))
        if not target:return None
        matches=[c for c in categories if c.get('selectable') and c['id'].startswith('excel.')
                 and c['exam']==exam and c['subject']==subject and c['topic']==target]
        if len(matches)!=1:return None
        choices[matches[0]['id']]=matches[0]
    return next(iter(choices.values())) if len(choices)==1 else None


def resolve(hierarchy,exam,categories,unit_fallbacks=None):
    if len(hierarchy)<4 or hierarchy[0]!=exam:return None
    subject=source_subject('\\'.join(hierarchy),categories,exam)
    if not subject:return None
    unit,topic=hierarchy[2:4]
    # Exact topic or explicit previously reviewed whole-topic containment.
    category=heading_category([{'text':'> '+topic}],exam,subject,categories)
    if category is None:category=controlled_match(topic,exam,[subject],categories)
    if category is None:
        # A source unit is allowed only through an explicit containment rule,
        # never by a broad parent whose children have different main topics.
        category=(unit_fallbacks.get((exam,subject,unit)) if unit_fallbacks is not None
                  else controlled_match(unit,exam,[subject],categories))
    return {'sourceExam':exam,'sourceSubject':hierarchy[1],'sourceUnit':unit,'sourceTopic':topic,
            'subjectCandidate':subject,'category':category}


def build():
    ROOT.mkdir(exist_ok=True)
    categories=json.loads((APP/'backend/src/main/resources/content-taxonomy.json').read_text(encoding='utf8'))['categories']
    labels=defaultdict(list);inputs={}
    for name in ['katalog.json','Deneme-Tarama/katalog.json']:
        path=SOURCE/name;inputs[name]=hashlib.sha256(path.read_bytes()).hexdigest()
        for page in json.loads(path.read_text(encoding='utf8')).get('pages',[]):
            for asset in page.get('assets',[]):
                local=asset.get('storage_path')
                if local:labels[path_key(local)].append(page.get('path',[]))
    metadata=SOURCE/'envanter.jsonl';inputs['envanter.jsonl']=hashlib.sha256(metadata.read_bytes()).hexdigest()
    for line in metadata.read_text(encoding='utf8').splitlines():
        record=json.loads(line)
        for path in [record.get('local_path'),record.get('storage_path')]:
            if path:labels[path_key(path)].extend(record.get('hierarchies',[]))
    inventory=json.loads((BASE/'inventory.json').read_text(encoding='utf8'))['items'];records={};counts=Counter()
    for row in inventory:
        if row['extension']!='.pdf':continue
        key=path_key(row['relativePath']);parts=row['relativePath'].replace('\\','/').split('/')
        if key not in labels and len(parts)>=6 and parts[0] in ['TYT','AYT']:labels[key]=[parts[:4]]
    units=defaultdict(list);seen_hierarchies=set()
    for paths in labels.values():
        for h in paths:
            if tuple(h) in seen_hierarchies:continue
            seen_hierarchies.add(tuple(h))
            if len(h)>=4 and h[0] in ['TYT','AYT']:
                subject=source_subject('\\'.join(h),categories,h[0])
                if subject:units[(h[0],subject,h[2])].append(h)
    unit_fallbacks={}
    for (exam,subject,unit),paths in units.items():
        target=UNIT_CONTAINMENT.get((exam,subject,unit),unit)
        choices=[c for c in categories if c.get('selectable') and c['id'].startswith('excel.') and c['exam']==exam
                 and c['subject']==subject and normalize(c['topic'])==normalize(target)]
        category=choices[0] if len(choices)==1 else controlled_match(unit,exam,[subject],categories)
        if not category:continue
        # Do not use a parent fallback when a known child belongs elsewhere.
        children=[resolve(h,exam,categories,{}).get('category') for h in paths]
        if any(c and c['id']!=category['id'] for c in children):continue
        unit_fallbacks[(exam,subject,unit)]=category
    for row in inventory:
        if row['extension']!='.pdf':continue
        relative=row['relativePath'];parts=relative.replace('\\','/').split('/')
        hierarchies=list(dict.fromkeys(tuple(h) for h in labels.get(path_key(relative),[])))
        if not hierarchies and len(parts)>=6 and parts[0] in ['TYT','AYT']:hierarchies=[parts[:4]]
        resolved=[]
        for hierarchy in hierarchies:
            if hierarchy and hierarchy[0] in ['TYT','AYT']:
                found=resolve(hierarchy,hierarchy[0],categories,unit_fallbacks)
                if found:resolved.append(found)
        unique={r['category']['id']:r['category'] for r in resolved if r['category']}
        complete=bool(resolved) and all(r['category'] for r in resolved) and len(unique)==1
        category=next(iter(unique.values())) if complete else None
        record={'relativePath':relative,'sourceSha256':row['sha256'],'status':'SOURCE_MAIN_LABEL_BOUND' if category else 'SOURCE_FOLDER_LABEL_REVIEW_REQUIRED',
                'sourceHierarchies':hierarchies,'resolvedSourceLabels':resolved,
                'categoryId':category['id'] if category else None,'canonicalSubject':category['subject'] if category else None,
                'canonicalUnit':category.get('unit') if category else None,'canonicalTopic':category['topic'] if category else None,
                'canonicalExam':category['exam'] if category else None,
                'basis':'OFFICIAL_MEBI_FOLDER_CATALOG_WITH_EXACT_OR_REVIEWED_MAIN_TOPIC_CONTAINMENT',
                'teacherApproved':False,'questionWrites':0,'imageWrites':0}
        records[path_key(relative)]=record;counts[record['status']]+=1
    write_json(ROOT/'index.json',{'records':records,'inputSha256':inputs,'counts':dict(counts),
        'taxonomySha256':hashlib.sha256((APP/'backend/src/main/resources/content-taxonomy.json').read_bytes()).hexdigest(),
        'questionWrites':0,'imageWrites':0,'modelCalls':0})
    print(json.dumps({'sourcePdfPaths':len(records),'counts':dict(counts),'imageWrites':0,'modelCalls':0}),flush=True)


def lookup(row,pdf=None,group=None):
    global _index,_categories,_question_index
    if pdf is None and row.get('code') and row.get('imageSha256'):
        if _question_index is None:
            path=BASE/'question-source-labels/index.json'
            _question_index=json.loads(path.read_text(encoding='utf8'))['records'] if path.exists() else {}
        overlay=_question_index.get(row['code'])
        if overlay and overlay['sourceSha256']==row['sourceSha256'] and overlay['imageSha256']==row['imageSha256']:
            evidence=overlay['sourceLabelEvidence']
            if row.get('exam') and evidence.get('canonicalExam') and row['exam']!=evidence['canonicalExam']:
                return {**evidence,'status':'SOURCE_EXAM_SCOPE_REVIEW_REQUIRED','categoryId':None}
            return evidence
    if _index is None:
        path=ROOT/'index.json'
        _index=json.loads(path.read_text(encoding='utf8'))['records'] if path.exists() else {}
    found=_index.get(path_key(row['relativePath']))
    if not found:found={'status':'SOURCE_FOLDER_LABEL_REVIEW_REQUIRED','relativePath':row['relativePath'],'sourceSha256':row['sourceSha256'],'teacherApproved':False}
    if found['sourceSha256']!=row['sourceSha256']:raise ValueError('Source label index/PDF identity differs')
    exam=row.get('exam') or found.get('canonicalExam')
    if found.get('canonicalExam') and exam and found['canonicalExam']!=exam:
        return {**found,'status':'SOURCE_EXAM_SCOPE_REVIEW_REQUIRED','categoryId':None}
    if not found.get('categoryId'):
        found={**found}
        if _categories is None:_categories=json.loads((APP/'backend/src/main/resources/content-taxonomy.json').read_text(encoding='utf8'))['categories']
        subject=source_subject(row['relativePath'],_categories,exam)
        if subject:
            found['sourceSubjectCandidate']=subject
            if pdf is not None and row.get('testNumber'):
                cache=getattr(pdf,'_mebi_printed_topic_cache',None)
                if cache is None:cache={};pdf._mebi_printed_topic_cache=cache
                identity=(exam,subject,str(row['testNumber']))
                if identity not in cache:
                    page=pdf[0];lines=[{'text':''.join(s['text'] for s in line['spans']),'bbox':list(line['bbox'])}
                        for block in page.get_text('dict')['blocks'] for line in block.get('lines',[]) if line['bbox'][1]<125]
                    number=re.search(r'tarama testi\s+(\d+)\b',normalize(' '.join(x['text'] for x in lines)))
                    headings=[x for x in lines if x['text'].lstrip().startswith('>')]
                    category=printed_category(headings,exam,subject,_categories) if number and number[1]==str(row['testNumber']) else None
                    cache[identity]=(category,headings)
                category,headings=cache[identity]
                if category:
                    found.update(status='SOURCE_MAIN_LABEL_BOUND',categoryId=category['id'],canonicalSubject=category['subject'],
                        canonicalUnit=category.get('unit'),canonicalTopic=category['topic'],canonicalExam=category['exam'],
                        printedHeadingEvidence={'sourceSha256':row['sourceSha256'],'sourcePage':1,'testNumber':row['testNumber'],'headings':headings},
                        basis='PRINTED_SINGLE_TEST_HEADINGS_WITH_REVIEWED_WHOLE_TOPIC_CONTAINMENT')
        elif pdf is not None and group:
            from mebi_pratik2_deneme_ders_kaniti import resolve_mock_course
            cache=getattr(pdf,'_mebi_course_cache',None)
            if cache is None:cache={};pdf._mebi_course_cache=cache
            projected,evidence=resolve_mock_course(row,group,pdf,cache)
            if evidence:found.update(sourceSubjectCandidate=projected['subject'],printedCourseEvidence=evidence)
    return found


if __name__=='__main__':build()
