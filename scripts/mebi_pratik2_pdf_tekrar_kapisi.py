"""Compare PDFs, never individual questions, against the existing practice bank.

The user's fast equivalence rule is page count + first three pages. Exact
file identity is the cheap first tier; differing files are checked with whole
page text/size and small original-page previews. No full-PDF re-extraction,
question matching, OCR or model call is performed.
"""
import hashlib
import json
import unicodedata
from collections import Counter,defaultdict
from pathlib import Path
import pymupdf
from mebi_pratik2_tam_pdf_tarama import APP,BASE,SOURCE
from kaynakli_arastirma_db import db_connection,query
from yks_birlestirme import write_json,process_lock

OUT=BASE/'pdf-reuse-check'


def signature(count,pages,ignore_text_order=False):
    needed=min(3,count or 0)
    if needed<1 or len(pages)!=needed:return None
    values=[];text_characters=0
    for page in sorted(pages,key=lambda p:p['page']):
        text=' '.join(unicodedata.normalize('NFKC',page.get('text','')).split())
        text_characters+=len(text)
        if ignore_text_order:text=json.dumps(sorted(Counter(text.split()).items()),ensure_ascii=False)
        values.append([page['page'],round(page['width'],1),round(page['height'],1),text])
    if text_characters<80:return None
    return hashlib.sha256(json.dumps([count,values],ensure_ascii=False).encode('utf8')).hexdigest()


def load_policy(base=None):
    policy=(base or BASE)/'pdf-reuse-policy.json'
    if not policy.exists():policy=APP/'scripts/mebi-pratik2-pdf-policy.json'
    return json.loads(policy.read_text(encoding='utf8'))


def load_decisions():
    if not load_policy().get('enabled'):return {}
    report=OUT/'decisions.json'
    if not report.exists():raise ValueError('PDF-level reuse check must finish before new extraction/import')
    return json.loads(report.read_text(encoding='utf8'))['bySha256']


def skip_pdf(sha,decisions):
    if not decisions:return False
    if sha not in decisions:raise ValueError('Source PDF lacks a document-level reuse decision')
    return decisions[sha]['decision']!='NEW_PDF_DOCUMENT_NOT_SEEN'


def current_decisions(shas):
    decisions=load_decisions()
    if not decisions:return decisions
    shas=set(shas)
    for sha in shas:
        skip_pdf(sha,decisions)
        if len(sha)!=64 or any(c not in '0123456789abcdef' for c in sha):raise ValueError('Invalid PDF document identity')
    if not shas:return decisions
    cmd,env,_=db_connection('ivme')
    sql="SELECT coalesce(json_agg(s),'[]') FROM (SELECT DISTINCT r.source_sha256 FROM learning_catalog.question_source_registry r JOIN questions q ON q.code=r.question_code WHERE q.bank<>'MEBI_PRACTICE_2' AND r.source_sha256 IN ("+','.join("'"+s+"'" for s in sorted(shas))+") ) s"
    for row in json.loads(query((cmd,env,None),sql)):
        sha=row['source_sha256'];decisions[sha]={**decisions[sha],'decision':'SKIP_PDF_ALREADY_IN_EXISTING_PRACTICE',
            'method':'CURRENT_EXISTING_PRACTICE_PDF_REGISTRY_MATCH'}
    return decisions


def preview_sample(document):
    result=[];informative=False
    for index in range(min(3,len(document))):
        pix=document[index].get_pixmap(matrix=pymupdf.Matrix(.5,.5),alpha=False)
        result.append([pix.width,pix.height,pix.n,hashlib.sha256(pix.samples).hexdigest()])
        pixels=pix.samples[::31]
        if pixels and max(pixels)-min(pixels)>=32 and sum(v<240 for v in pixels)>=16:informative=True
    return {'pages':result,'informative':informative}


def preview(document):
    return preview_sample(document)['pages']


def extend_raster_matches(decisions,references,sources,current_paths):
    """Also compare scans with empty or reordered text, using whole pages only."""
    cache_path=OUT/'sampled-page-previews.json'
    cache=json.loads(cache_path.read_text(encoding='utf8')) if cache_path.exists() else {}
    needed={sources[sha]['pageCount'] for sha,row in decisions.items() if row['decision']=='NEW_PDF_DOCUMENT_NOT_SEEN'}
    by_preview=defaultdict(list);available_counts=set();compared=0
    def sample(sha,path):
        stat=path.stat();record=cache.get(sha)
        if not record or record.get('bytes')!=stat.st_size or record.get('mtimeNs')!=stat.st_mtime_ns:
            with pymupdf.open(path) as document:value=preview_sample(document)
            record={**value,'bytes':stat.st_size,'mtimeNs':stat.st_mtime_ns};cache[sha]=record
        return record
    def key(count,value):return json.dumps([count,value['pages']],sort_keys=True)
    for sha,ref in references.items():
        count=ref.get('pageCount')
        if count not in needed:continue
        paths=[APP.parent/'Kaynaklar'/p for p in ref.get('paths') or []]
        if sha in current_paths:paths.append(current_paths[sha])
        actual=next((p for p in paths if p.is_file()),None)
        if actual is None:continue
        value=sample(sha,actual);available_counts.add(count)
        if value['informative']:by_preview[key(count,value)].append(ref)
    for sha,row in decisions.items():
        if row['decision']!='NEW_PDF_DOCUMENT_NOT_SEEN' or sources[sha]['pageCount'] not in available_counts:continue
        value=sample(sha,current_paths[sha]);compared+=1
        matches=by_preview.get(key(sources[sha]['pageCount'],value),[]) if value['informative'] else []
        if matches:
            ref=matches[0];row.update(decision='SKIP_PDF_ALREADY_IN_EXISTING_PRACTICE',
                method='USER_FAST_RULE_SAME_PAGE_COUNT_AND_FIRST_THREE_RASTER_PREVIEWS',
                existingSourceSha256=ref['sha256'],existingSourcePaths=ref.get('paths'),
                existingCoverageState=ref.get('coverageState'),sampledPages=len(value['pages']),nativeTextRequired=False)
        if compared%100==0:print(json.dumps({'stage':'FIRST_THREE_WHOLE_PAGE_PREVIEWS','pdfsCompared':compared,'questionComparisons':0,'modelCalls':0}),flush=True)
    write_json(cache_path,cache)
    return compared


def run():
    OUT.mkdir(exist_ok=True);cmd,env,_=db_connection('ivme')
    sql="""WITH existing AS (
      SELECT r.source_sha256,count(*) registered_rows
      FROM learning_catalog.question_source_registry r JOIN questions q ON q.code=r.question_code
      WHERE q.bank<>'MEBI_PRACTICE_2' AND r.source_sha256 IS NOT NULL GROUP BY r.source_sha256
    ) SELECT json_build_object('catalogRun',(SELECT run_key FROM learning_catalog.current_run),
      'sources',(SELECT json_agg(json_build_object('sha256',e.source_sha256,'registeredRows',e.registered_rows,
        'pageCount',p.page_count,'coverageState',p.coverage_state,
        'paths',(SELECT json_agg(f.relative_path) FROM learning_catalog.pdf_source_files f WHERE f.source_sha256=e.source_sha256),
        'firstPages',(SELECT json_agg(json_build_object('page',g.page_number,'text',g.observations->>'text',
          'width',g.observations->'width','height',g.observations->'height') ORDER BY g.page_number)
          FROM learning_catalog.pdf_source_pages g WHERE g.source_sha256=e.source_sha256 AND g.page_number<=3)))
       FROM existing e LEFT JOIN learning_catalog.pdf_sources p ON p.source_sha256=e.source_sha256))"""
    snapshot=json.loads(query((cmd,env,None),sql));write_json(OUT/'existing-practice-pdf-index.json',snapshot)
    references={r['sha256']:r for r in snapshot['sources']};by_signature=defaultdict(list);by_words=defaultdict(list)
    for ref in references.values():
        pages=ref.get('firstPages') or []
        if not ref.get('pageCount') or any(p.get('width') is None or p.get('height') is None for p in pages):continue
        sig=signature(ref['pageCount'],pages)
        if sig:by_signature[sig].append(ref)
        word_sig=signature(ref['pageCount'],pages,ignore_text_order=True)
        if word_sig:by_words[word_sig].append(ref)
    docs=json.loads((BASE/'full-pdf-coverage.json').read_text(encoding='utf8'))['documents'];unique={r['sourceSha256']:r for r in docs}
    current_paths={sha:SOURCE/s['relativePath'] for sha,s in unique.items()};decisions={};counts=Counter();preview_cache={}
    for index,(sha,source) in enumerate(unique.items(),1):
        decision={'sourceSha256':sha,'relativePath':source['relativePath'],'pageCount':source['pageCount'],
                  'comparisonUnit':'PDF_DOCUMENT_ONLY','questionComparisons':0}
        if sha in references:
            ref=references[sha]
            decision.update(decision='SKIP_PDF_ALREADY_IN_EXISTING_PRACTICE',method='IDENTICAL_PDF_FILE',
                            existingSourceSha256=sha,existingSourcePaths=ref.get('paths'),existingCoverageState=ref.get('coverageState'))
        elif 'YKS Çıkmış Soru Kitapları' in source['relativePath']:
            decision.update(decision='SKIP_PAST_EXAM_PDF_USER_CONFIRMED_ALREADY_IMPORTED',method='EXPLICIT_USER_EXISTING_PRACTICE_CONFIRMATION')
        else:
            native=json.loads((BASE/source['cache']).read_text(encoding='utf8'))
            pages=[{'page':p['physicalPage'],'text':'\n'.join(l['text'] for l in p['lines']),
                    'width':p['rect'][2],'height':p['rect'][3]} for p in native['pages'][:3]]
            matches=list(by_signature.get(signature(source['pageCount'],pages),[]))
            for ref in by_words.get(signature(source['pageCount'],pages,ignore_text_order=True),[]):
                if ref not in matches:matches.append(ref)
            if not matches:decision.update(decision='NEW_PDF_DOCUMENT_NOT_SEEN',method='NO_EXISTING_PDF_MATCH')
            else:
                matched=None;unavailable=False
                with pymupdf.open(SOURCE/source['relativePath']) as document:current_preview=preview(document)
                for ref in matches:
                    refsha=ref['sha256']
                    if refsha not in preview_cache:
                        candidates=[APP.parent/'Kaynaklar'/p for p in ref.get('paths') or []]
                        if refsha in current_paths:candidates.append(current_paths[refsha])
                        actual=next((p for p in candidates if p.is_file()),None)
                        if actual is None:preview_cache[refsha]=None
                        else:
                            with pymupdf.open(actual) as document:preview_cache[refsha]=preview(document)
                    if preview_cache[refsha] is None:unavailable=True;continue
                    if current_preview==preview_cache[refsha]:matched=ref;break
                if matched:
                    decision.update(decision='SKIP_PDF_ALREADY_IN_EXISTING_PRACTICE',method='USER_FAST_RULE_SAME_PAGE_COUNT_AND_FIRST_THREE_PAGES',
                                    existingSourceSha256=matched['sha256'],existingSourcePaths=matched.get('paths'),sampledPages=len(current_preview))
                else:
                    decision.update(decision='HOLD_POSSIBLY_SAME_PDF_NO_REIMPORT',method='SAME_PAGE_COUNT_AND_FIRST_PAGE_TEXT_PREVIEW_REVIEW',
                                    referenceUnavailable=unavailable,candidateSourceSha256=[r['sha256'] for r in matches])
        counts[decision['decision']]+=1;decisions[sha]=decision
        if index%100==0 or index==len(unique):print(json.dumps({'pdfsCompared':index,'totalUniquePdfs':len(unique),'counts':dict(counts),'questionComparisons':0}),flush=True)
    raster_compared=extend_raster_matches(decisions,references,unique,current_paths)
    counts=Counter(row['decision'] for row in decisions.values())
    result={'bySha256':decisions,'counts':dict(counts),'existingPdfSources':len(references),'localUniquePdfs':len(unique),
            'additionalWholePdfRasterComparisons':raster_compared,
            'questionComparisons':0,'modelCalls':0,'questionWrites':0,'fullContentEqualityClaimedFromSampling':False,
            'fastEquivalenceRule':'USER_REQUESTED_PAGE_COUNT_AND_FIRST_THREE_PAGES'}
    write_json(OUT/'decisions.json',result)


if __name__=='__main__':
    with process_lock(BASE/'.jobs/pdf-reuse-check.lock'):run()
