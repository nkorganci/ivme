"""Read-only official booklet/legacy-ID comparison; caches primary sources, never imports questions."""
import argparse
from concurrent.futures import ThreadPoolExecutor
import hashlib,html,json,re,sys,unicodedata
from pathlib import Path
from urllib.parse import urljoin,urlparse
from urllib.request import urlopen
import pymupdf
from kaynakli_arastirma_db import db_connection,query

APP=Path(__file__).resolve().parents[1];OUT=APP/'veri/content-labels/official-archive'
RAW=APP.parent/'veri-hatti/ogm-yks-cikmis/ham/sorular_son.json'
SECTIONS={'TYT':{'TUR':'TÜRKÇE TESTİ','SOS':'SOSYAL BİLİMLER TESTİ','TEM':'TEMEL MATEMATİK TESTİ','FEN':'FEN BİLİMLERİ TESTİ'},
    'AYT':{'TDE':'TÜRK DİLİ VE EDEBİYATI-SOSYAL BİLİMLER-1 TESTİ','SB2':'SOSYAL BİLİMLER-2 TESTİ','MAT':'MATEMATİK TESTİ','FEN':'FEN BİLİMLERİ TESTİ'}}
PRIMARY={2024:{'TYT':'https://dokuman.osym.gov.tr/pdfdokuman/2024/YKS/TSK/yks_tyt_2024_kitapcik_T24kt.pdf',
    'AYT':'https://dokuman.osym.gov.tr/pdfdokuman/2024/YKS/TSK/yks_ayt_2024_kitapcik_ts85k.pdf'}}
PAGES={2018:'https://www.osym.gov.tr/2018yks-tyt-ve-ayt-oturumlari-temel-soru-kitapciklari-ve-cevap-anahtarlari-yayimlandi-1072018',
    **{y:f'https://www.osym.gov.tr/{y}yuksekogretim-kurumlari-sinavi-{y}yks-oturumlari-temel-soru-kitapciklari-ve-cevap-anahtarlari-yayimlandi' for y in [2019,2020]}}

def normal(value):return ''.join(c for c in unicodedata.normalize('NFKD',value.upper().replace('ı','I')) if not unicodedata.combining(c))
def get(url):
    if urlparse(url).hostname not in {'www.osym.gov.tr','osym.gov.tr','dokuman.osym.gov.tr'}:raise ValueError('Non-primary URL rejected')
    with urlopen(url,timeout=25) as r:
        if urlparse(r.url).hostname not in {'www.osym.gov.tr','osym.gov.tr','dokuman.osym.gov.tr'}:raise ValueError('Non-primary redirect')
        return r.read()
def links(url):
    text=get(url).decode('utf-8',errors='replace')
    return [(urljoin(url,html.unescape(h).strip()).replace('http://dokuman.osym.gov.tr/','https://dokuman.osym.gov.tr/'),re.sub('<[^>]+>',' ',html.unescape(t)))
        for h,t in re.findall(r'<a[^>]+href=[\"\x27]([^\"\x27]+)[\"\x27][^>]*>(.*?)</a>',text,re.S|re.I)]
def answer_sections(path,exam):
    with pymupdf.open(path) as doc:
        text=normal('\n'.join(p.get_text() for p in list(doc)[-3:]))
    headings=[]
    for code,title in SECTIONS[exam].items():
        # Whitespace may differ between the PDF's lines and title.
        pattern=r'[^A-Z0-9]*'.join(re.escape(w) for w in re.findall(r'[A-Z0-9]+',normal(title)))
        hits=list(re.finditer(pattern,text))
        if hits:headings.append((hits[-1].start(),hits[-1].end(),code))
    headings.sort();result={}
    for i,(_,start,code) in enumerate(headings):
        stop=headings[i+1][0] if i+1<len(headings) else len(text)
        values={int(n):a for n,a in re.findall(r'\b(\d{1,2})\.\s*([ABCDE])\b',text[start:stop])}
        if values:result[code]=values
    return result
def download(year,retry_pending=False):
    metadata=OUT/f'{year}.json'
    previous=json.loads(metadata.read_text(encoding='utf-8')) if metadata.exists() else None
    if previous and not (retry_pending and previous['status']=='PARTIAL_OR_UNAVAILABLE'):return previous
    candidates=dict(PRIMARY.get(year,{}));attempts=[]
    pages=[f'https://www.osym.gov.tr/{year}yks-tyt-ayt-ve-ydt-temel-soru-kitapciklari-ve-cevap-anahtarlari']
    if year<2020:pages.append(f'https://www.osym.gov.tr/{year}yks-tyt-ayt-ydt-temel-soru-kitapciklari-ve-cevap-anahtarlari')
    if year in PAGES:pages.append(PAGES[year])
    for page in pages:
        if len(candidates)==2:break
        try:
            found=links(page);attempts.append({'url':page,'status':'READ'})
            indexes=[u for u,t in found if urlparse(u).hostname=='dokuman.osym.gov.tr' and not u.lower().endswith('.pdf') and ('TYT' in t or 'YKS' in t)]
            for index in indexes[:2]:
                try:found+=links(index)
                except Exception as e:attempts.append({'url':index,'status':type(e).__name__})
            for url,title in found:
                if not url.lower().endswith('.pdf') or str(year) not in url or urlparse(url).hostname!='dokuman.osym.gov.tr':continue
                for exam in ('TYT','AYT'):
                    if re.search(rf'(?:^|[^a-z]){exam.lower()}(?:[^a-z]|$)',url.lower()) or f'({exam})' in title:
                        candidates.setdefault(exam,url)
        except Exception as e:attempts.append({'url':page,'status':type(e).__name__})
    records=[]
    for exam,url in candidates.items():
        path=OUT/f'{year}-{exam}.pdf'
        try:
            if not path.exists():
                data=get(url)
                if not data.startswith(b'%PDF'):raise ValueError('Not a PDF')
                temp=path.with_suffix('.tmp');temp.write_bytes(data);temp.replace(path)
            sections=answer_sections(path,exam)
            records.append({'exam':exam,'url':url,'path':path.relative_to(APP).as_posix(),'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),
                'sections':{c:{'positions':sorted(a),'answerKey':a} for c,a in sections.items()},'status':'EXTRACTED' if sections else 'MANUAL_REVIEW_REQUIRED'})
        except Exception as e:records.append({'exam':exam,'url':url,'status':'MANUAL_REVIEW_REQUIRED','reason':type(e).__name__})
    result={'year':year,'attempts':(previous or {}).get('attempts',[])+attempts,'booklets':records,'status':'CACHED_PRIMARY_SOURCE' if len(records)==2 and all(r['status']=='EXTRACTED' for r in records) else 'PARTIAL_OR_UNAVAILABLE'}
    metadata.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');return result
def original_ids(row):
    values={str(row.get('eski_id') or '')}|{v.split('#')[0] for v in row.get('eski_yuvalar',[])}
    result=set()
    for value in values:
        m=re.fullmatch(r'(\d{4})-(TYT|AYT)-([A-Z0-9]+)-([\d-]+)',value)
        if m:
            for part in m[4].split('-'):result.add((int(m[1]),m[2],m[3],int(part)))
    return result
def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--refresh',action='store_true');parser.add_argument('--retry-pending',action='store_true');args=parser.parse_args()
    OUT.mkdir(exist_ok=True);raw=json.loads(RAW.read_text(encoding='utf-8'))['sorular'];years=sorted({r['yil'] for r in raw})
    if args.refresh:
        with ThreadPoolExecutor(max_workers=3) as pool:sources=list(pool.map(lambda year:download(year,args.retry_pending),years))
    else:sources=[json.loads((OUT/f'{y}.json').read_text(encoding='utf-8')) for y in years if (OUT/f'{y}.json').exists()]
    for source in sources:
        for booklet in source.get('booklets',[]):
            if booklet.get('path') and (APP/booklet['path']).is_file():
                path=APP/booklet['path']
                if hashlib.sha256(path.read_bytes()).hexdigest()!=booklet['sha256']:raise ValueError('Changed official cache')
                booklet['sections']={c:{'positions':sorted(a),'answerKey':a} for c,a in answer_sections(path,booklet['exam']).items()}
    connection=db_connection();connection[1]['PGOPTIONS']+=' -c default_transaction_read_only=on'
    active={r['code']:r for r in json.loads(query(connection,"SELECT coalesce(json_agg(x),'[]') FROM (SELECT code,active,correct_answer FROM questions WHERE bank='CIKMIS')x"))}
    indexed={};missing=[]
    for row in raw:
        for key in original_ids(row):indexed.setdefault(key,[]).append(row)
    official_statuses=json.loads((APP/'ornek-veri/resmi-soru-durumlari.json').read_text(encoding='utf-8'))['records']
    cancelled={(r['identity']['year'],r['identity']['exam'],r['identity']['test'],r['identity']['number']):r for r in official_statuses if r['officialStatus']=='cancelled'}
    sections=[];answers=[]
    for year in years:
        source=next((s for s in sources if s['year']==year),{})
        for exam,codes in SECTIONS.items():
            booklet=next((b for b in source.get('booklets',[]) if b['exam']==exam),{})
            for code in codes:
                local={k[3] for k in indexed if k[:3]==(year,exam,code)}
                bank={k[3] for k,rows in indexed.items() if k[:3]==(year,exam,code) and any(active.get(r['id'],{}).get('active') and len(r.get('cevaplar') or [])==1 for r in rows)}
                official=set(booklet.get('sections',{}).get(code,{}).get('positions',[]))
                excluded={k[3] for k in cancelled if k[:3]==(year,exam,code)}
                sections.append({'year':year,'exam':exam,'test':code,'sourcePositions':len(local),'activeIndividualQuestions':len(bank),
                    'officialPositions':len(official) if official else None,'officialUrl':booklet.get('url'),
                    'missingSourcePositions':sorted(official-local-excluded),'missingBankPositions':sorted((official or local)-bank-excluded),
                    'officiallyCancelledPositions':sorted(excluded),
                    'contentEqualityVerified':False,'comparison':'OFFICIAL_ANSWER_KEY_POSITIONS' if official else 'LOCAL_LEGACY_IDENTITIES_ONLY'})
                for number in sorted((official or local)-bank-excluded):
                    rows=indexed.get((year,exam,code,number),[])
                    missing.append({'year':year,'exam':exam,'test':code,'number':number,'sourceCodes':[r['id'] for r in rows],
                        'reason':'COMPOSITE_PASSAGE_REQUIRES_INDIVIDUAL_QUESTIONS' if any(r.get('ortak_parca_mi') for r in rows) else 'NOT_IN_ACTIVE_BANK' if rows else 'MISSING_SOURCE_POSITION',
                        'manualReview':True})
                for number in sorted(official & local):
                    key=(year,exam,code,number);rows=indexed[key]
                    if key in cancelled:
                        answers.append({'year':year,'exam':exam,'test':code,'number':number,'sourceCodes':[r['id'] for r in rows],
                            'status':'OFFICIALLY_CANCELLED','officialNoticeUrl':cancelled[key]['officialNoticeUrl'],'manualReview':False});continue
                    single=[r for r in rows if len(original_ids(r))==1 and len(r.get('cevaplar') or [])==1]
                    answer=booklet['sections'][code]['answerKey'][number]
                    if len(single)!=1:
                        answers.append({'year':year,'exam':exam,'test':code,'number':number,
                            'sourceCodes':[r['id'] for r in rows],'status':'COMPOSITE_OR_AMBIGUOUS_IDENTITY','manualReview':True});continue
                    row=single[0];bank_row=active.get(row['id']);source_answer=row['cevaplar'][0]
                    matches=source_answer==answer and (not bank_row or bank_row['correct_answer']==answer)
                    answers.append({'year':year,'exam':exam,'test':code,'number':number,'code':row['id'],
                        'officialAnswer':answer,'sourceAnswer':source_answer,'bankAnswer':bank_row['correct_answer'] if bank_row else None,
                        'status':'MATCH' if matches else 'ANSWER_MISMATCH','manualReview':not matches,
                        'identityEvidence':'SINGLE_LEGACY_ID','contentEqualityVerified':False})
    result={'version':1,'sourceSha256':hashlib.sha256(RAW.read_bytes()).hexdigest(),'sourceCards':len(raw),'sourcePositions':len(indexed),
        'bankRecords':len(active),'activeBankRecords':sum(r['active'] for r in active.values()),'missingBankPositions':len(missing),'sources':sources,'sections':sections,
        'officialCancellations':official_statuses,
        'scope':'Question-number coverage, not a claim of solved questions or full semantic/answer equality. Alternative religion/philosophy positions stay distinct.',
        'answerComparison':dict(__import__('collections').Counter(r['status'] for r in answers)),
        'questionOrLearnerWrites':0}
    (OUT/'report.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    (OUT/'missing-bank-positions.jsonl').write_text(''.join(json.dumps(r,ensure_ascii=False)+'\n' for r in missing),encoding='utf-8')
    (OUT/'answer-comparison.jsonl').write_text(''.join(json.dumps(r,ensure_ascii=False)+'\n' for r in answers),encoding='utf-8')
    print(json.dumps({k:v for k,v in result.items() if k not in ['sources','sections']},ensure_ascii=False))
if __name__=='__main__':main()
