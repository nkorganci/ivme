"""Cross-reference offline flipbook text pages without executing JavaScript.

Exact text correspondence is a discovery hint, never pixel/question coverage
or an excuse to discard a ZIP. Every unmatched/short/ambiguous page remains
explicit. Source archives are not extracted, modified, or executed.
"""
import hashlib
import json
import re
import time
from collections import defaultdict,Counter
from pathlib import PureWindowsPath
from mebi_pratik2_tam_pdf_tarama import BASE
from mebi_pratik2_konu_basligi import normalize
from yks_birlestirme import write_json,process_lock

OUT=BASE/'offline-page-correspondence'


def pages_from_javascript(text):
    match=re.match(r'^\ufeff?\s*var\s+textForPages\s*=\s*',text)
    if not match:raise ValueError('Expected literal page-text array')
    pages,end=json.JSONDecoder().raw_decode(text,match.end())
    if text[end:].strip() not in ('',';') or not isinstance(pages,list) or any(not isinstance(p,str) for p in pages):
        raise ValueError('Only a literal string array is supported; no JS execution')
    return pages


def page_signature(text):
    value=normalize(text)
    # Titles, blank covers and generic page labels cannot identify a book page.
    return hashlib.sha256(value.encode('utf8')).hexdigest() if len(value)>=80 else None


def token_signature(text):
    value=normalize(text)
    if len(value)<80:return None
    # Different PDF reading orders may permute text objects. Preserve the
    # COMPLETE token frequency, including numbers; this is still only a hint.
    return hashlib.sha256(json.dumps(sorted(Counter(value.split()).items()),ensure_ascii=False).encode('utf8')).hexdigest()


def publication_title(path):
    title=PureWindowsPath(path).name.rsplit('--',1)[0]
    return normalize(re.sub(r'\s*(?:çevrim dışı içerik(?: paket(?:i)?)?|PDF)\s*$', '', title,flags=re.I))


def run():
    OUT.mkdir(exist_ok=True);start=time.monotonic()
    pdfs=json.loads((BASE/'full-pdf-coverage.json').read_text(encoding='utf8'))['documents']
    containers=json.loads((BASE/'package-content-report.json').read_text(encoding='utf8'))['containers']
    zips=[r for r in containers if r['relativePath'].lower().endswith('.zip')]
    pdf_cache={};reports=[];counts=Counter()
    for index,source in enumerate(zips,1):
        target=OUT/(source['sourceSha256']+'.json')
        if target.exists():result=json.loads(target.read_text(encoding='utf8'))
        else:
            content=json.loads((BASE/source['cache']).read_text(encoding='utf8'))
            candidates=[p for p in pdfs if PureWindowsPath(p['relativePath']).parent.parent==PureWindowsPath(source['relativePath']).parent.parent
                        and publication_title(p['relativePath'])==publication_title(source['relativePath'])]
            signatures=defaultdict(list);tokens=defaultdict(list)
            for pdf in candidates:
                sha=pdf['sourceSha256']
                if sha not in pdf_cache:
                    native=json.loads((BASE/pdf['cache']).read_text(encoding='utf8'))
                    pdf_cache[sha]=[(p['physicalPage'],page_signature(text),token_signature(text)) for p in native['pages']
                                   if (text:='\n'.join(l['text'] for l in p['lines']))]
                for page,sig,token in pdf_cache[sha]:
                    if sig:
                        reference={'sourceSha256':sha,'physicalPage':page}
                        if reference not in signatures[sig]:signatures[sig].append(reference)
                        if reference not in tokens[token]:tokens[token].append(reference)
            scripts=[m for m in content.get('members',[]) if m['name'].endswith('search_config.js') and m.get('status')=='TEXT_CACHED']
            pages=[];problems=[]
            if len(scripts)!=1:problems.append('LITERAL_SEARCH_PAGE_SCRIPT_NOT_UNIQUE_OR_MISSING')
            else:
                member=scripts[0]
                if hashlib.sha256(member['text'].encode('utf8')).hexdigest()!=member['sha256']:
                    problems.append('CACHED_MEMBER_TEXT_BYTES_NOT_REPRODUCIBLE')
                else:
                    try:
                        texts=pages_from_javascript(member['text'])
                        for page,text in enumerate(texts,1):
                            sig=page_signature(text);matches=signatures.get(sig,[]) if sig else []
                            token=token_signature(text);token_matches=tokens.get(token,[]) if token else []
                            status=('TEXT_TOO_SHORT_TO_IDENTIFY_PAGE' if sig is None else
                                    'EXACT_TEXT_CORRESPONDENCE_NOT_PIXEL_COVERAGE' if len(matches)==1 else
                                    'REPEATED_EXACT_TEXT_PAGE_REQUIRES_IDENTITY_REVIEW' if matches else
                                    'EXACT_TOKEN_MULTISET_NOT_PIXEL_OR_READING_ORDER_COVERAGE' if len(token_matches)==1 else
                                    'REPEATED_TOKEN_MULTISET_REQUIRES_IDENTITY_REVIEW' if token_matches else 'OFFLINE_PAGE_REQUIRES_SOURCE_LAYOUT_REVIEW')
                            pages.append({'offlinePhysicalPage':page,'textSha256':hashlib.sha256(text.encode('utf8')).hexdigest(),
                                          'normalizedTextSignature':sig,'status':status,'pdfPageMatches':matches,
                                          'tokenFrequencySignature':token,'tokenMultisetPageMatches':token_matches,
                                          'studentVisible':False,'questionAdmissionAllowed':False})
                    except (ValueError,json.JSONDecodeError):problems.append('SEARCH_SCRIPT_NOT_A_LITERAL_STRING_ARRAY')
            result={'status':'OFFLINE_TEXT_PAGE_DISCOVERY_NOT_QUESTION_ACCEPTANCE','relativePath':source['relativePath'],
                    'sourceSha256':source['sourceSha256'],'sourceContentCacheSha256':hashlib.sha256((BASE/source['cache']).read_bytes()).hexdigest(),
                    'candidatePdfSources':[p['sourceSha256'] for p in candidates],'pages':pages,'problems':problems,
                    'counts':dict(Counter(p['status'] for p in pages)),'allSourceQuestionsCovered':False,
                    'questionWrites':0,'modelCalls':0,'teacherApprovalsCreated':0}
            write_json(target,result)
        counts.update(result['counts']);reports.append({'sourceSha256':source['sourceSha256'],'relativePath':source['relativePath'],
            'offlinePages':len(result['pages']),'counts':result['counts'],'problems':result['problems']})
        if index%10==0 or index==len(zips):
            print(json.dumps({'stage':'OFFLINE_EXACT_TEXT_PAGE_DISCOVERY','completed':index,'total':len(zips),
                              'percent':round(100*index/len(zips),1),'counts':dict(counts),
                              'elapsedSeconds':round(time.monotonic()-start,1),'estimatedRemainingSeconds':None}),flush=True)
    write_json(OUT/'report.json',{'sources':reports,'counts':dict(counts),'questionWrites':0,'modelCalls':0,
        'allSourceQuestionsCovered':False,'textCorrespondenceIsNotPixelOrQuestionCoverage':True})


if __name__=='__main__':
    import argparse
    from pathlib import Path
    p=argparse.ArgumentParser();p.add_argument('--output-dir',default=OUT.name);a=p.parse_args()
    if Path(a.output_dir).name!=a.output_dir:raise ValueError('Unsafe offline output directory')
    OUT=BASE/a.output_dir
    with process_lock(BASE/'.jobs'/(OUT.name+'.lock')):run()
