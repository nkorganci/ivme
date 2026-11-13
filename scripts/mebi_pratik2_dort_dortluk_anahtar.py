"""Independent original-pixel readings for matrix rows and printed Cevap lines."""
import hashlib
import json
import re
from mebi_pratik2_tam_pdf_tarama import BASE
from mebi_pratik2_cevap_kurtarma import ocr
from mebi_pratik2_konu_basligi import normalize
from mebi_pratik2_dort_dortluk import test_token
from mebi_pratik2_uc_adim_kabul import SCHEMA
from yks_birlestirme import write_json

FIRST_READINGS={}
SINGLE_KEYS=None


def first_reading_is_ocr(group):
    sha=group['sourceSha256']
    if sha not in FIRST_READINGS:
        native=json.loads((BASE/'full-pdf-native'/(sha+'.json')).read_text(encoding='utf8'))
        FIRST_READINGS[sha]={p['physicalPage'] for p in native['pages'] if p['readingStatus']=='VISUAL_REVIEW_REQUIRED'}
    return group['keyPage'] in FIRST_READINGS[sha]


def same_contiguous_letters(text,answers):
    keys=sorted(map(int,answers))
    if keys!=list(range(1,len(keys)+1)):return False
    letters=re.sub(r'\s+','',text).upper()
    return bool(letters) and set(letters)<=set('ABCDE') and letters==''.join(answers[str(k)] for k in keys)


def read_key(group,pdf,module,root):
    global SINGLE_KEYS
    folder=root/'independent-keys';folder.mkdir(exist_ok=True);target=folder/(group['groupId']+'.json')
    sha=group['keyImageSha256']
    if hashlib.sha256((BASE/group['keyImage']).read_bytes()).hexdigest()!=sha:raise ValueError('Four-square key input changed')
    if target.exists():
        receipt=json.loads(target.read_text(encoding='utf8'))
        if receipt['imageSha256']!=sha:raise ValueError('Four-square cached key differs')
        return receipt
    prior_attempts=[]
    for previous in sorted(BASE.glob('*/independent-keys/'+group['groupId']+'.json')):
        if previous==target:continue
        prior=json.loads(previous.read_text(encoding='utf8'))
        if prior.get('imageSha256')!=sha:continue
        if prior.get('status')=='AGREES':
            receipt={'status':'AGREES','imageSha256':sha,'method':'IDENTICAL_SOURCE_KEY_INDEPENDENT_READING_REUSED',
                'priorEvidence':str(previous.relative_to(BASE)),'priorEvidenceSha256':hashlib.sha256(previous.read_bytes()).hexdigest(),
                'teacherApproved':False}
            write_json(target,receipt);return receipt
        prior_attempts.append(previous)
    if prior_attempts:
        receipt={'status':'REVIEW_REQUIRED','imageSha256':sha,'method':'IDENTICAL_SOURCE_KEY_PRIOR_BOUNDED_READING_UNRESOLVED',
            'priorEvidence':[str(p.relative_to(BASE)) for p in prior_attempts],'teacherApproved':False}
        write_json(target,receipt);return receipt
    if group['keyIdentityType']=='THREE_STEP_MOCK_NUMBER_MATRIX':
        from mebi_pratik2_uc_adim_deneme_anahtar import read_key as read_mock
        return read_mock(group,pdf,module,root)
    if group['keyIdentityType']=='SINGLE_TEST_PRINTED_NUMBER':
        if SINGLE_KEYS is None:
            data=json.loads((BASE/'single-test-crops/second-reading/report.json').read_text(encoding='utf8'))
            SINGLE_KEYS={r['code']:r for r in data['results']}
        previous=SINGLE_KEYS[group['sourceQuestionCode']]
        number=next(iter(group['answers']));reading=previous.get('reading',{})
        agrees=(previous['status']=='AGREES' and previous['imageSha256']==sha and str(reading.get('number'))==number
            and reading.get('answer')==group['answers'][number])
        result={'status':'AGREES' if agrees else 'REVIEW_REQUIRED','imageSha256':sha,
            'method':'SAME_ORIGINAL_PRINTED_NUMBER_AND_LETTER_INDEPENDENT_READING_REUSED','priorReading':previous,'teacherApproved':False}
        write_json(target,result);return result
    images=root/'alternative-ocr';images.mkdir(exist_ok=True)
    def region(box,name):
        return ocr(pdf,group['keyPage'],[box[0]-2,box[1]-2,box[2]+2,box[3]+2],images,name)
    kind=group['keyIdentityType'];details={}
    if kind=='INLINE_EXPLICIT_CEVAP':
        box=group['questionNumberBBox'];number=region([box[0],box[1],min(box[2],box[0]+24),box[3]],group['groupId']+'-number')
        answer=region(group['answerBBox'],group['groupId']+'-answer')
        match=re.fullmatch(r'cevap\s+([abcde])',normalize(answer.get('text','')))
        observed=re.match(r'^\s*(\d{1,3})(?:\s*[.)])?',number.get('text',''))
        expected_number=next(iter(group['answers']))
        agreed=bool(observed and str(int(observed[1]))==expected_number and match and match[1].upper()==group['answers'][expected_number])
        details={'numberOcr':number,'answerOcr':answer}
    else:
        native=group['matrixSourceEvidence'];title=native['chapterLines'];columns=native['numberHeader'];cells=native['answers']
        def bounds(rows):return [min(r['bbox'][0] for r in rows),min(r['bbox'][1] for r in rows),max(r['bbox'][2] for r in rows),max(r['bbox'][3] for r in rows)]
        title_box=bounds(title);header_id=hashlib.sha256(json.dumps([group['sourceSha256'],group['keyPage'],title_box]).encode()).hexdigest()[:24]
        heading=region(title_box,header_id+'-chapter');numbers=region(bounds(columns),header_id+'-columns')
        label=region(native['rowLabelBBox'],group['groupId']+'-label');letters=region(bounds(cells),group['groupId']+'-letters')
        observed_numbers=list(map(int,re.findall(r'\d+',numbers.get('text',''))))
        expected_numbers=sorted(c['number'] for c in columns)
        agreed=(normalize(heading.get('text',''))==normalize(group['chapter']) and observed_numbers==expected_numbers
            and test_token(label.get('text',''))==group['matrixTestToken'] and same_contiguous_letters(letters.get('text',''),group['answers']))
        details={'chapterOcr':heading,'columnNumbersOcr':numbers,'rowLabelOcr':label,'rowLettersOcr':letters}
    if first_reading_is_ocr(group):agreed=False
    receipt={'status':'AGREES' if agreed else 'REVIEW_REQUIRED','imageSha256':sha,
        'method':'INDEPENDENT_SOURCE_PIXEL_OCR_PRINTED_IDENTITY_AND_ANSWER','ocrEvidence':details,'teacherApproved':False}
    if not agreed:
        try:
            if kind=='INLINE_EXPLICIT_CEVAP':
                schema={'type':'object','properties':{'number':{'type':'integer'},'answer':{'type':'string','enum':list('ABCDE')},'uncertainty':{'type':'boolean'}},
                    'required':['number','answer','uncertainty'],'additionalProperties':False}
                prompt='Read only the printed question number and the explicit printed Cevap: letter at the end of its solution. Do not solve the question or infer an answer. If either is unclear set uncertainty true.'
                value,hit=module.ask(prompt,image=BASE/group['keyImage'],schema=schema,model='qwen3.5:9b',max_output_tokens=200)
                agreed=(str(value.get('number'))==next(iter(group['answers'])) and value.get('answer')==next(iter(group['answers'].values())) and value.get('uncertainty') is False)
            else:
                prompt=('Read this printed answer MATRIX, never solve a question. Transcribe the chapter heading, including its printed chapter index if present. '
                    'Select ONLY the row labelled '+group['matrixTestToken'][0]+'. TEST'+(' - '+group['matrixTestToken'][1:] if len(group['matrixTestToken'])>1 else '')+
                    '. Column numbers are printed ABOVE the letter rows. Return answers mapping each printed column number to the letter in the selected row. '
                    'Keep A/B/C test variants separate and do not shift letters across blank cells. Return chapterHeading, rowLabel, answers and uncertainty.')
                value,hit=module.ask(prompt,image=BASE/group['keyImage'],schema=SCHEMA,model='qwen3.5:9b',max_output_tokens=1400)
                answers={str(int(k)):v.strip().upper() for k,v in value.get('answers',{}).items()}
                agreed=(normalize(value.get('chapterHeading',''))==normalize(group['chapter']) and test_token(value.get('rowLabel',''))==group['matrixTestToken']
                    and answers==group['answers'] and value.get('uncertainty') is False)
            receipt={'status':'AGREES' if agreed else 'REVIEW_REQUIRED','imageSha256':sha,'reading':value,'cacheHit':hit,
                'method':'FIRST_INDEPENDENT_LOCAL_VISION_PRINTED_MATRIX_OR_CEVAP','priorOcrAttemptRetained':receipt,'teacherApproved':False}
        except Exception as error:receipt['firstVisionErrorType']=type(error).__name__
    write_json(target,receipt);return receipt
