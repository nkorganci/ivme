"""Independent pixel OCR/one bounded vision reading of printed mock matrices."""
import hashlib
import json
import re
import pymupdf
from PIL import Image
from mebi_pratik2_tam_pdf_tarama import APP, BASE
from mebi_pratik2_cevap_kurtarma import ocr
from mebi_pratik2_konu_basligi import normalize
from mebi_pratik2_uc_adim_deneme import step, section
from yks_birlestirme import write_json


def same_row(observed_numbers, observed_letters, expected):
    numbers = list(map(int,re.findall(r'\d+',observed_numbers)))
    letters = re.sub(r'\s+','',observed_letters).upper()
    keys = sorted(map(int,expected))
    # An empty native cell cannot be silently omitted from a dense OCR row.
    return (keys == list(range(min(keys),max(keys)+1)) and numbers == keys
            and letters == ''.join(expected[str(k)] for k in keys))


def rotated_label(pdf, group, folder):
    box = group['matrixSourceEvidence']['stepLabel']['bbox']
    identity = hashlib.sha256(json.dumps([group['sourceSha256'],group['keyPage'],box]).encode()).hexdigest()[:24]
    image = folder/(identity+'-rotated-step.png'); target = image.with_suffix('.json')
    if target.exists():
        result = json.loads(target.read_text(encoding='utf8'))
        if hashlib.sha256(image.read_bytes()).hexdigest() != result['imageSha256']:
            raise ValueError('Rotated step pixels changed')
        return result
    clip = pymupdf.Rect(box[0]-3,box[1]-3,box[2]+3,box[3]+3)
    pix = pdf[group['keyPage']-1].get_pixmap(matrix=pymupdf.Matrix(5,5),clip=clip,alpha=False)
    Image.frombytes('RGB',(pix.width,pix.height),pix.samples).rotate(-90,expand=True).save(image)
    try:
        data = pymupdf.Pixmap(str(image)).pdfocr_tobytes(language='tur+eng',tessdata=str(APP/'veri/tessdata'))
        with pymupdf.open('pdf',data) as doc: text = '\n'.join(p.get_text() for p in doc)
        result = {'status':'OCR_READ','text':text}
    except Exception as error: result = {'status':'REVIEW_REQUIRED','errorType':type(error).__name__}
    result.update(imageSha256=hashlib.sha256(image.read_bytes()).hexdigest(),page=group['keyPage'],clip=list(clip),
                  rotationDegrees=-90,method='INDEPENDENT_TESSERACT_ORIGINAL_PIXELS_ROTATION_ONLY')
    write_json(target,result);return result


def read_key(group,pdf,module,root):
    folder = root/'independent-keys';folder.mkdir(exist_ok=True);target = folder/(group['groupId']+'.json')
    sha = group['keyImageSha256']
    if hashlib.sha256((BASE/group['keyImage']).read_bytes()).hexdigest() != sha: raise ValueError('Mock key image changed')
    if target.exists():
        result = json.loads(target.read_text(encoding='utf8'))
        if result['imageSha256'] != sha: raise ValueError('Mock cached key differs')
        return result
    images = root/'alternative-ocr';images.mkdir(exist_ok=True);native = group['matrixSourceEvidence']
    def region(box,label):return ocr(pdf,group['keyPage'],[box[0]-2,box[1]-2,box[2]+2,box[3]+2],images,group['groupId']+'-'+label)
    def bounds(boxes):return [min(b[0] for b in boxes),min(b[1] for b in boxes),max(b[2] for b in boxes),max(b[3] for b in boxes)]
    label = rotated_label(pdf,group,images)
    heading = region(native['sectionHeading']['bbox'],'section')
    numbers = region(bounds([c['bbox'] for c in native['numberHeader']]),'numbers')
    letters = region(bounds([c['answerBBox'] for c in native['answers']]),'letters')
    agrees = (step(label.get('text','')) == (group['step'],group['mock'])
              and section(heading.get('text','')) == group['sectionId']
              and same_row(numbers.get('text',''),letters.get('text',''),group['answers']))
    result = {'status':'AGREES' if agrees else 'REVIEW_REQUIRED','imageSha256':sha,'teacherApproved':False,
              'method':'INDEPENDENT_PIXEL_OCR_STEP_MOCK_SECTION_NUMBERED_MATRIX',
              'ocrEvidence':{'stepLabel':label,'sectionHeading':heading,'numbers':numbers,'letters':letters}}
    if not agrees:
        schema = {'type':'object','properties':{'step':{'type':'integer'},'mock':{'type':'integer'},
                  'sectionHeading':{'type':'string'},'answers':{'type':'object','additionalProperties':{'type':'string','enum':list('ABCDE')}},
                  'uncertainty':{'type':'boolean'}},'required':['step','mock','sectionHeading','answers','uncertainty'],'additionalProperties':False}
        keys = sorted(map(int,group['answers']))
        prompt = ('Transcribe the PRINTED answer key; never solve or infer an answer. The vertical label identifies the step (ADIM) and mock (DENEME). '
                  f'Read only section {native["sectionHeading"]["text"].strip()} and printed columns {keys[0]} through {keys[-1]}. '
                  'Other sections and rows may be visible: do not mix their letters. Return step, mock, sectionHeading, answers by printed column number, uncertainty.')
        try:
            value,hit = module.ask(prompt,image=BASE/group['keyImage'],schema=schema,model='qwen3.5:9b',max_output_tokens=1200)
            answers = {str(int(k)):v.strip().upper() for k,v in value.get('answers',{}).items()}
            agrees = (value.get('step') == group['step'] and value.get('mock') == group['mock']
                      and section(value.get('sectionHeading','')) == group['sectionId']
                      and answers == group['answers'] and value.get('uncertainty') is False)
            result = {'status':'AGREES' if agrees else 'REVIEW_REQUIRED','imageSha256':sha,'teacherApproved':False,
                      'method':'FIRST_INDEPENDENT_VISION_PRINTED_STEP_MOCK_SECTION_MATRIX','reading':value,'cacheHit':hit,'priorOcrAttemptRetained':result}
        except Exception as error: result['firstVisionErrorType'] = type(error).__name__
    write_json(target,result);return result
