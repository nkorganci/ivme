"""Project Ivme's published curriculum, then conservatively align existing source chunks."""
from collections import Counter,defaultdict
import hashlib
import json
import re

import numpy as np
from psycopg.types.json import Jsonb
from sklearn.feature_extraction.text import TfidfVectorizer
from threadpoolctl import threadpool_limits

from core import ROOT,SOURCE,LOG,check_disk,safe_error,normalized
from catalog_reference import snapshot
from source_archive import archive_subject_folder

METHOD='ivme_catalog_guided_v2'

def norm(text):
    text=normalized(text).translate(str.maketrans('çğıöşü','cgiosu'))
    return ' '.join(re.findall(r'[a-z0-9]+',text))

def content_groups(categories):
    """Only an explicit shared reference row permits exam counterpart grouping."""
    result={}
    for row in categories:
        key=(row['subjectId']+':content:'+row['contentKey'] if row.get('contentKey') else
             row['subjectId']+':excel:'+row['excelRowId'] if row.get('excelRowId') else row['id'])
        if key not in result:
            result[key]={'key':key,'course':row['subject'],'subject_id':row['subjectId'],
                'unit':row.get('unit') or 'Ünite belirtilmemiş','name':row['topic'],'references':[]}
        group=result[key]
        if not row.get('contentKey') and (group['course'],group['unit'],group['name'])!=(row['subject'],row.get('unit') or 'Ünite belirtilmemiş',row['topic']):
            raise ValueError('Shared reference row has conflicting names: '+key)
        group['references'].append(row)
    return sorted(result.values(),key=lambda x:x['key'])

def base_subject(value):
    value=value.removeprefix('kpss-')
    return {'din-kulturu':'din','turk-dili-ve-edebiyati':'edebiyat'}.get(value,value)

def source_subjects(folder):
    try:
        part=__import__('pathlib').Path(folder).relative_to(SOURCE).parts[0]
    except (ValueError,IndexError):
        part=archive_subject_folder(folder)
        if part is None:return None
    mapping={'biyoloji':{'biyoloji'},'cografya':{'cografya'},'din kulturu':{'din'},
        'felsefe':{'felsefe','psikoloji','sosyoloji','mantik'},'fizik':{'fizik'},'kimya':{'kimya'},
        'matematik':{'matematik','geometri'},'geometri':{'geometri'},'tarih':{'tarih'},'turkce':{'turkce'},
        'turk dili ve edebiyati':{'edebiyat','turkce'}}
    return mapping.get(norm(part))

def matching_titles(group):
    aliases=[alias for ref in group['references'] for alias in ref.get('aliases',[]) if isinstance(alias,str)]
    for ref in group['references']:
        distribution=ref.get('distribution') or {}
        for field in ('aytKey','tytKey'):
            value=distribution.get(field)
            if isinstance(value,str):
                alternate=value.split('|')[-1]
                aliases.append(alternate)
                aliases.extend(part.strip() for part in alternate.split(',') if part.strip())
    aliases.extend([group['name'],group['name'].split('(')[0].strip()])
    return sorted({value for value in aliases if len(norm(value))>=5 and norm(value) not in
        {'diger','genel','konular','temel','digerleri',norm(group['course'])}})

def descriptor(group):
    return ' | '.join([group['course'],group['unit'],group['name'],*matching_titles(group)])

def select_candidates(cosine,text_lex,title_lex,allowed,heading_exact,groups):
    score=0.75*cosine+0.15*text_lex+0.10*title_lex+0.10*heading_exact
    score=np.where(allowed,score,-10)
    order=np.argsort(score)[-3:][::-1]
    result=[]
    best=order[0]
    margin=float(score[best]-score[order[1]]) if len(order)>1 else float(score[best])
    # Equal exam scopes with the same title may both use the same source, without
    # merging their distinct catalog identities or claiming teacher approval.
    same_title=norm(groups[order[1]]['name'])==norm(groups[best]['name']) if len(order)>1 else False
    title_supported=bool(heading_exact[best] and cosine[best]>=0.30 and score[best]>=0.40)
    accepted=bool(allowed[best] and (title_supported or (cosine[best]>=0.48 and score[best]>=0.52 and
        (margin>=0.025 or same_title))))
    for rank,index in enumerate(order):
        if not allowed[index]:
            continue
        secondary=accepted and rank>0 and ((norm(groups[index]['name'])==norm(groups[best]['name']) and score[index]>=score[best]-0.04)
            or (heading_exact[index] and cosine[index]>=0.30 and score[index]>=0.40))
        role='PRIMARY' if accepted and rank==0 else ('SECONDARY' if secondary else 'CANDIDATE')
        result.append({'index':int(index),'role':role,'score':float(np.clip(score[index],0,1)),
            'cosine':float(cosine[index]),'margin':margin,'heading_exact':bool(heading_exact[index])})
    return result

def reference_vectors(db,ollama,reference,groups):
    sha=reference['sha256']
    db.execute('INSERT INTO catalog_snapshots(sha256,run_key,payload) VALUES(%s,%s,%s) ON CONFLICT DO NOTHING',
        (sha,reference['run_key'],Jsonb(reference)))
    for index,group in enumerate(groups):
        db.execute('INSERT INTO catalog_topic_vectors(snapshot_sha,group_key) VALUES(%s,%s) ON CONFLICT DO NOTHING',(sha,group['key']))
        if (index+1)%500==0:
            db.commit()
    db.commit()
    pending={row['group_key'] for row in db.all("SELECT group_key FROM catalog_topic_vectors WHERE snapshot_sha=%s AND status<>'done'",(sha,))}
    if pending:
        ollama.unload_all()
        ordered=[group for group in groups if group['key'] in pending]
        for start in range(0,len(ordered),8):
            batch=ordered[start:start+8]; check_disk()
            try:
                vectors=ollama.embed([descriptor(group) for group in batch])
                for group,vector in zip(batch,vectors):
                    db.execute("UPDATE catalog_topic_vectors SET embedding=%s,status='done',error=NULL,attempts=attempts+1 WHERE snapshot_sha=%s AND group_key=%s",(vector.astype(np.float32).tobytes(),sha,group['key']))
                db.commit()
            except Exception as exc:
                db.conn.rollback()
                for group in batch:
                    db.execute("UPDATE catalog_topic_vectors SET status='failed',error=%s,attempts=attempts+1 WHERE snapshot_sha=%s AND group_key=%s",(safe_error(exc),sha,group['key']))
                db.commit()
                raise
            LOG.info('İvme konu vektörleri: %s / %s',min(start+8,len(ordered)),len(ordered))
        ollama.unload_all()
    found={row['group_key']:np.frombuffer(bytes(row['embedding']),dtype=np.float32) for row in
        db.all("SELECT group_key,embedding FROM catalog_topic_vectors WHERE snapshot_sha=%s AND status='done'",(sha,))}
    vectors=np.stack([found[group['key']] for group in groups])
    vectors/=np.maximum(np.linalg.norm(vectors,axis=1,keepdims=True),1e-12)
    return vectors

def build(db,ollama,pdf_ids):
    reference=snapshot()
    groups=content_groups(reference['categories'])
    ids=[r['id'] for r in db.all("SELECT c.id FROM chunks c JOIN embeddings e ON e.chunk_id=c.id WHERE c.pdf_id=ANY(%s) AND e.status='done' ORDER BY c.id",(pdf_ids,))]
    fingerprint=hashlib.sha256(json.dumps({'method':METHOD,'reference':reference['sha256'],'ids':ids}).encode()).hexdigest()
    version=db.one('SELECT * FROM clustering_versions WHERE fingerprint=%s ORDER BY id DESC LIMIT 1',(fingerprint,))
    if not version:
        number=db.one('SELECT count(*)+1 AS n FROM clustering_versions')['n']
        version=db.one('INSERT INTO clustering_versions(name,fingerprint,parameters) VALUES(%s,%s,%s) RETURNING *',
            (f'clustering_v{number}',fingerprint,Jsonb({'method':METHOD,'catalog_sha':reference['sha256'],
                'published_run_key':reference['run_key'],'reference_records':len(reference['categories']),
                'content_groups':len(groups),'accept_score':0.52,'minimum_cosine':0.48,'minimum_margin':0.025,
                'heading_accept_score':0.40,'heading_minimum_cosine':0.30,'alias_source':'PUBLISHED_DISTRIBUTION_KEYS',
                'teacher_review':'PENDING','score_is_calibrated_probability':False})))
        db.commit()
    if version['status']=='done':
        return version['id']
    vectors=reference_vectors(db,ollama,reference,groups)
    cluster_ids={}
    for index,group in enumerate(groups):
        metadata={'küme_adı':group['name'],'kısa_açıklama':'İvme yayımlanmış konu kaydı; kaynak eşlemesi otomatik adaydır.',
            'tahmini_ders':group['course'],'tahmini_ünite':group['unit'],'anahtar_kavramlar':[group['name']],
            'catalog_group_key':group['key'],'reference_ids':[r['id'] for r in group['references']],
            'reference_exams':sorted({r['exam'] for r in group['references']}),'label_method':'PUBLISHED_IVME_CATALOG'}
        row=db.one("""INSERT INTO clusters(version_id,label,metadata,centroid,status,keywords,representatives)
            VALUES(%s,%s,%s,%s,'done',%s,'[]') ON CONFLICT(version_id,label) DO UPDATE SET label=excluded.label RETURNING id""",
            (version['id'],index,Jsonb(metadata),vectors[index].tobytes(),Jsonb([group['name']])))
        cluster_ids[group['key']]=row['id']
        if (index+1)%500==0:
            db.commit()
    review=db.one("""INSERT INTO clusters(version_id,label,metadata,centroid,status,keywords,representatives)
        VALUES(%s,-1,%s,%s,'done','[]','[]') ON CONFLICT(version_id,label) DO UPDATE SET label=excluded.label RETURNING id""",
        (version['id'],Jsonb({'küme_adı':'İnceleme kuyruğu','review_queue':True}),np.zeros(1024,dtype=np.float32).tobytes()))['id']
    db.commit()
    lexical=TfidfVectorizer(analyzer='char_wb',ngram_range=(3,5),max_features=60000,sublinear_tf=True)
    reference_text=lexical.fit_transform([norm(descriptor(g)) for g in groups])
    title_aliases=[[norm(alias) for alias in matching_titles(group)] for group in groups]
    allowed_cache={}
    supported={'biyoloji','cografya','din','felsefe','fizik','kimya','matematik','geometri','tarih','turkce','edebiyat','psikoloji','sosyoloji','mantik'}
    last=0; processed=0
    while True:
        rows=db.all("""SELECT c.*,p.filename,p.folder,p.toc FROM chunks c JOIN pdfs p ON p.id=c.pdf_id
            JOIN embeddings e ON e.chunk_id=c.id WHERE c.pdf_id=ANY(%s) AND c.id>%s AND e.status='done'
            AND NOT EXISTS(SELECT 1 FROM catalog_chunk_status s WHERE s.version_id=%s AND s.chunk_id=c.id AND s.status='done')
            ORDER BY c.id LIMIT 500""",(pdf_ids,last,version['id']))
        if not rows:
            break
        check_disk()
        text_matrix=lexical.transform([norm(r['text']) for r in rows])
        titles=[]
        for row in rows:
            toc=[x[1] for x in (row['toc'] or []) if 0<x[2]<=row['start_page']]
            titles.append(norm(row['filename']+' '+(' '.join(toc[-2:]) if toc else '')))
        title_matrix=lexical.transform(titles)
        source_vectors=db.vectors([r['id'] for r in rows])
        source_vectors/=np.maximum(np.linalg.norm(source_vectors,axis=1,keepdims=True),1e-12)
        with threadpool_limits(limits=4):
            cos=source_vectors@vectors.T
            lex=(text_matrix@reference_text.T).toarray()
            title_lex=(title_matrix@reference_text.T).toarray()
        for i,row in enumerate(rows):
            route=source_subjects(row['folder'])
            route_key=tuple(sorted(route)) if route else ()
            if route_key not in allowed_cache:
                allowed_cache[route_key]=np.asarray([base_subject(g['subject_id']) in supported and
                    (route is None or base_subject(g['subject_id']) in route) for g in groups])
            allowed=allowed_cache[route_key]
            heading=' '+titles[i]+' '
            exact=np.asarray([any(' '+alias+' ' in heading for alias in aliases) for aliases in title_aliases],dtype=float)
            choices=select_candidates(cos[i],lex[i],title_lex[i],allowed,exact,groups)
            accepted=[]
            for candidate in choices:
                group=groups[candidate['index']]
                role=candidate['role'] if not row['low_value'] else 'CANDIDATE'
                evidence={'method':METHOD,'source_filename':row['filename'],'source_pages':[row['start_page'],row['end_page']],
                    'subject_route':sorted(route) if route else 'mixed','heading_exact':candidate['heading_exact'],
                    'score_is_probability':False,'teacher_review':'PENDING'}
                db.execute('''INSERT INTO catalog_assignments(version_id,chunk_id,group_key,role,score,cosine,margin,evidence)
                    VALUES(%s,%s,%s,%s,%s,%s,%s,%s) ON CONFLICT DO NOTHING''',
                    (version['id'],row['id'],group['key'],role,candidate['score'],candidate['cosine'],candidate['margin'],Jsonb(evidence)))
                if role in ('PRIMARY','SECONDARY'):
                    accepted.append((cluster_ids[group['key']],candidate['score'],'catalog_evidence'))
            if not accepted and row['low_value']:
                anchor=db.one('''SELECT m.cluster_id,m.confidence FROM cluster_members m JOIN chunks c ON c.id=m.chunk_id
                    JOIN clusters k ON k.id=m.cluster_id WHERE k.version_id=%s AND k.label<>-1 AND c.pdf_id=%s
                    ORDER BY abs(c.start_page-%s) LIMIT 1''',(version['id'],row['pdf_id'],row['start_page']))
                if anchor:
                    accepted=[(anchor['cluster_id'],float(anchor['confidence'])*0.5,'source_page_neighbor')]
            for cluster_id,score,method in accepted or [(review,0.0,'catalog_review_queue')]:
                db.execute('''INSERT INTO cluster_members(cluster_id,chunk_id,confidence,was_noise,assignment_method)
                    VALUES(%s,%s,%s,%s,%s) ON CONFLICT DO NOTHING''',(cluster_id,row['id'],score,not bool(accepted),method))
            db.execute("""INSERT INTO catalog_chunk_status(version_id,chunk_id,status,outcome,attempts) VALUES(%s,%s,'done',%s,1)
                ON CONFLICT(version_id,chunk_id) DO UPDATE SET status='done',outcome=excluded.outcome,attempts=catalog_chunk_status.attempts+1""",
                (version['id'],row['id'],'matched' if accepted else 'review_required'))
            last=row['id']; processed+=1
            if processed%60==0:
                check_disk(); db.commit()
        db.commit()
        LOG.info('İvme konu eşlemesi: bu geçişte %s parça tamamlandı.',processed)
    # A leading image-only page may precede its first text anchor. Revisit after
    # the whole source is mapped, preserving its review membership as evidence.
    visual=db.all('''SELECT c.id,c.pdf_id,c.start_page FROM catalog_chunk_status s JOIN chunks c ON c.id=s.chunk_id
        WHERE s.version_id=%s AND s.outcome='review_required' AND c.low_value''',(version['id'],))
    for index,row in enumerate(visual):
        anchor=db.one('''SELECT m.cluster_id,m.confidence FROM cluster_members m JOIN chunks c ON c.id=m.chunk_id
            JOIN clusters k ON k.id=m.cluster_id WHERE k.version_id=%s AND k.label<>-1 AND c.pdf_id=%s AND NOT c.low_value
            ORDER BY abs(c.start_page-%s),c.id LIMIT 1''',(version['id'],row['pdf_id'],row['start_page']))
        if anchor:
            db.execute('''INSERT INTO cluster_members(cluster_id,chunk_id,confidence,was_noise,assignment_method)
                VALUES(%s,%s,%s,true,'source_page_neighbor') ON CONFLICT DO NOTHING''',
                (anchor['cluster_id'],row['id'],float(anchor['confidence'])*0.5))
            db.execute("UPDATE catalog_chunk_status SET outcome='visual_neighbor' WHERE version_id=%s AND chunk_id=%s",(version['id'],row['id']))
        if (index+1)%500==0:
            db.commit()
    db.commit()
    for index,group in enumerate(groups):
        cid=cluster_ids[group['key']]
        distribution=db.all('''SELECT p.id,p.filename,count(*) AS chunks FROM cluster_members m JOIN chunks c ON c.id=m.chunk_id
            JOIN pdfs p ON p.id=c.pdf_id WHERE m.cluster_id=%s GROUP BY p.id,p.filename''',(cid,))
        reps=db.all('''SELECT c.id FROM cluster_members m JOIN chunks c ON c.id=m.chunk_id WHERE m.cluster_id=%s
            AND NOT c.low_value AND c.duplicate_of IS NULL ORDER BY m.confidence DESC,c.id LIMIT 8''',(cid,))
        db.execute('UPDATE clusters SET source_distribution=%s,representatives=%s WHERE id=%s',
            (Jsonb(distribution),Jsonb([r['id'] for r in reps]),cid))
        if (index+1)%100==0:
            db.commit()
    db.execute("UPDATE clustering_versions SET status='done',error=NULL,attempts=attempts+1 WHERE id=%s",(version['id'],))
    db.commit()
    return version['id']

def taxonomy(db,version_id):
    from stages import export_taxonomy
    version=db.one('SELECT * FROM clustering_versions WHERE id=%s',(version_id,))
    params=version['parameters']
    reference=db.one('SELECT payload FROM catalog_snapshots WHERE sha256=%s',(params['catalog_sha'],))['payload']
    groups=content_groups(reference['categories'])
    prior=db.one('SELECT * FROM taxonomy_versions WHERE clustering_version_id=%s ORDER BY id DESC LIMIT 1',(version_id,))
    if prior and prior['status']=='done':
        export_taxonomy(prior['name'],prior['payload']); return prior['id']
    number=db.one('SELECT count(*)+1 AS n FROM taxonomy_versions')['n']
    tax=prior or db.one('INSERT INTO taxonomy_versions(name,clustering_version_id) VALUES(%s,%s) RETURNING *',(f'taxonomy_v{number}',version_id))
    clusters={r['metadata']['catalog_group_key']:r['id'] for r in db.all('SELECT id,metadata FROM clusters WHERE version_id=%s AND label<>-1',(version_id,))}
    courses={}; coverage_counts=Counter()
    for index,group in enumerate(groups):
        cid=clusters[group['key']]
        sources=db.all('''SELECT p.id,p.filename,p.path,p.folder,p.toc,count(DISTINCT cp.page_id) AS page_count,
            array_agg(DISTINCT g.page_no ORDER BY g.page_no) AS page_numbers,1 AS cluster_count FROM cluster_members m
            JOIN chunks c ON c.id=m.chunk_id JOIN pdfs p ON p.id=c.pdf_id JOIN chunk_pages cp ON cp.chunk_id=c.id
            JOIN pages g ON g.id=cp.page_id WHERE m.cluster_id=%s GROUP BY p.id,p.filename,p.path,p.folder,p.toc''',(cid,))
        clean=db.one('''SELECT count(*) AS n FROM cluster_members m JOIN chunks c ON c.id=m.chunk_id
            WHERE m.cluster_id=%s AND NOT c.low_value AND c.duplicate_of IS NULL''',(cid,))['n']
        coverage='source_found' if clean else 'no_source'
        coverage_counts[coverage]+=1
        topic=db.one('''INSERT INTO topics(version_id,course,unit,name,cluster_ids,sources,catalog_group_key,external_ids,reference_definition,coverage)
            VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) ON CONFLICT(version_id,catalog_group_key) WHERE catalog_group_key IS NOT NULL
            DO UPDATE SET catalog_group_key=excluded.catalog_group_key RETURNING id''',
            (tax['id'],group['course'],group['unit'],group['name'],Jsonb([cid]),Jsonb(sources),group['key'],
             Jsonb([r['id'] for r in group['references']]),Jsonb(group['references']),coverage))
        courses.setdefault(group['course'],{}).setdefault(group['unit'],[]).append({'id':topic['id'],'name':group['name'],
            'cluster_ids':[cid],'sources':sources,'coverage':coverage,'external_ids':[r['id'] for r in group['references']],
            'exams':sorted({r['exam'] for r in group['references']})})
        if not clean:
            db.execute("""INSERT INTO summaries(topic_id,status,content,sources) VALUES(%s,'unavailable',%s,'[]') ON CONFLICT(topic_id) DO NOTHING""",
                (topic['id'],'Bu referans konusu için OGM arşivinde yeterli güvenilir metin eşlemesi bulunamadı. İçerik üretilmedi; kaynak/görsel incelemesi gerekli.'))
        if (index+1)%100==0:
            check_disk(); db.commit()
    payload={'name':tax['name'],'draft':True,'method':METHOD,'catalog_run_key':reference['run_key'],
        'reference_records':len(reference['categories']),'content_groups':len(groups),'coverage':dict(coverage_counts),
        'teacher_review':'PENDING','courses':[{'name':course,'units':[{'name':unit,'topics':topics} for unit,topics in units.items()]} for course,units in courses.items()]}
    db.execute("UPDATE taxonomy_versions SET status='done',payload=%s WHERE id=%s",(Jsonb(payload),tax['id'])); db.commit()
    export_taxonomy(tax['name'],payload)
    coverage_report(db,tax['id'],payload)
    return tax['id']

def coverage_report(db,taxonomy_id,payload):
    rows=db.all('SELECT course,count(*) AS content_groups,sum(jsonb_array_length(external_ids)) AS reference_records,count(*) FILTER(WHERE coverage=\'source_found\') AS sourced,count(*) FILTER(WHERE coverage=\'no_source\') AS no_source FROM topics WHERE version_id=%s GROUP BY course ORDER BY course',(taxonomy_id,))
    lines=['# İvme konu eşlemesi — kaynak kapsamı','',f'Yayımlanmış katalog: `{payload["catalog_run_key"]}`',
        f'{payload["reference_records"]} sınav/konu kimliği → {payload["content_groups"]} ortak içerik grubu.','',
        '| Ders | Referans kimliği | Ortak içerik | Kaynak eşleşen | Eşleştirme eksik |','|---|---:|---:|---:|---:|']
    lines += [f'| {r["course"]} | {r["reference_records"]} | {r["content_groups"]} | {r["sourced"]} | {r["no_source"]} |' for r in rows]
    lines += ['','## Otomatik eşleştirmede yeterli kaynak kanıtı bulunamayan konular','']
    lines += [f'- {r["course"]} → {r["unit"]} → {r["name"]}' for r in db.all("SELECT course,unit,name FROM topics WHERE version_id=%s AND coverage='no_source' ORDER BY course,unit,name",(taxonomy_id,))]
    lines += ['','Otomatik kaynak eşlemesi öğretmen onayı değildir. Düşük güvenli adaylar catalog_assignments, inceleme kuyruğu cluster_members içinde saklanır. Kaynaksız başlık için özet uydurulmaz.']
    (ROOT/'IVME_KONU_KAPSAMI.md').write_text('\n'.join(lines),encoding='utf-8')
