"""Single, bounded local Ollama physics pilot; audited in ogm_ders.llm_runs.
Run with C:/Users/nkorg/.venvs/ogm-pipeline/Scripts/python.exe -X utf8.
No cloud endpoints, no student DB access, no changes to original PDFs.
"""
from pathlib import Path
import sys, json, hashlib, argparse
ROOT = Path(__file__).resolve().parents[1]
PIPE = ROOT.parent / 'pipeline'
sys.path.insert(0, str(PIPE))
import pymupdf as fitz
from jsonschema import validate, ValidationError
from pdf_ocr_cache import model_hash, read_page
from core import configure, DB, Ollama, stamp
from model_runtime import ModelLease

OUT = ROOT / 'veri/fizik-pilot/hareket-kuvvet'
PUBLIC = ROOT / 'frontend/public/ogren/fizik/hareket-kuvvet'
CONTENT = ROOT / 'frontend/src/learn/physics/hareket-kuvvet.generated.json'
VERSION = 'physics-pilot-v3-qwen-chatml'
CATEGORY = 'excel.tyt.fizik.e8dba464c6b583c83c4c'
SECTIONS = [
 ('referans', 'Hareketi kime göre anlatıyoruz?', [7], 'Sabit hızlı tren, perona göre yolcu hareketli, trene göre durgun. Dönme/titreşim/öteleme ayrımı.'),
 ('yol', 'Geri dönünce yol silinir mi?', [7], 'Bir doğru üzerinde 0→6→2 metre, toplam 10m yol, +2m yer değiştirme. Yön ve büyüklük ayrımı.'),
 ('hiz', 'Aynı yol, farklı hız: hangisini ölçüyoruz?', [7,10], '0→6→2m, 5s: ortalama sürat 2m/s, ortalama hız +0.4m/s. Ortalama sürat=toplam yol/toplam süre, ortalama hız=yer değiştirme/toplam süre. Sürat |anlık hız|, ortalamalarda genel eşitlik yok. Tek yönde giderken ortalama HIZIN BÜYÜKLÜĞÜ ortalama sürate eşittir. Durgun cisimde sürat de sıfırdır.'),
 ('grafik', 'Grafik bir yol resmi değildir', [8,10], 'Konum-zaman eğimi hız; 0,6,2m noktaları 0,3,5s zamanlarında; iki parça hız +2,-2m/s. Hız-zaman işaretli alan yer değiştirmedir, mutlak alan yoldur. Grafik yüksekliği hız değildir.'),
 ('ivme', 'Sola giderken sağa ivmelenmek', [11], 'v0=-4m/s, a=+2m/s², önce yavaşlar, t=2s durur, sonra sağa hızlanır; ivme hız değişimidir. Sabit ivme kapsamı, durmak kalıcı değildir.'),
 ('net-kuvvet', 'Kuvvet hareketi mi, hareketin değişimini mi belirler?', [12,13,14], 'Düz yatay yüzey, m=2kg, Fsağ=6N Fsol=2N, net+4N a+2m/s². Net sıfırsa hız sabit, sıfır olmak zorunda değil. Normal ve ağırlık dengeli, yatayda Fnet=ma.'),
 ('surtunme', 'Kutu neden bazen kıpırdamaz?', [16], 'm=2kg,g=10, mu_s=0.4,mu_k=0.3: N=20N, statik en çok8N. F=5 ise fs=5N a=0. F=10 ise fk=6N a=2m/s². Başlangıç durgun, yatay sağa çekiş, Fs,max ile gerçek fs farklı; hareket halindeyken F=0 sürtünme sıfır değildir.'),
 ('etki-tepki', 'Eşit kuvvet varsa neden hareket var?', [15], 'Etkileşen iki cisme zıt eşit kuvvetler, farklı cisimlerde oldukları için tek cisimde iptal olmazlar. 40 ve80kg buz patencileri 80N ile etkileşir: ivme büyüklükleri2 ve1. Normal ile ağırlık etki-tepki çifti değildir.'),
]

def save(path, value):
 path.parent.mkdir(parents=True, exist_ok=True)
 path.write_text(json.dumps(value,ensure_ascii=False,indent=2),encoding='utf-8')

def prepare():
 configure(); OUT.mkdir(parents=True,exist_ok=True); PUBLIC.mkdir(parents=True,exist_ok=True)
 db=DB(False)
 try:
  sources=[]
  for n in [7,8,10,11,12,13,14,15,16]:
   rows=db.all("SELECT id,path,filename,sha256 FROM pdfs WHERE folder LIKE %s AND filename LIKE %s ORDER BY id",('%Fizik%Konu Ozetleri 9. Sinif%',f'{n:02} - %'))
   if len(rows)!=1: raise ValueError(f'Expected one exact physics note {n}: {len(rows)}')
   row=rows[0]; path=Path(row['path'])
   if hashlib.sha256(path.read_bytes()).hexdigest()!=row['sha256']: raise ValueError('Source hash changed')
   with fitz.open(path) as doc:
    pages=[]
    for i,page in enumerate(doc):
     filename=f'kaynak-{n:02}-{i+1}.webp'
     page.get_pixmap(matrix=fitz.Matrix(1.8,1.8),alpha=False).pil_save(str(PUBLIC/filename),format='WEBP',quality=85)
     cached_ocr=read_page(row['sha256'],i+1,model_hash())
     if not cached_ocr or cached_ocr['status']!='EXTRACTED': raise ValueError(f'Readable cached OCR missing for K{n}, page {i+1}')
     pages.append({'page':i+1,'text':cached_ocr['text'],'extraction':'existing Turkish OCR cache','textSha256':cached_ocr['textSha256'], 'rawPdfText':page.get_text(),'image':f'/ogren/fizik/hareket-kuvvet/{filename}',
      'imageSha256':hashlib.sha256((PUBLIC/filename).read_bytes()).hexdigest()})
    chunks=db.all('SELECT id,start_page,end_page FROM chunks WHERE pdf_id=%s ORDER BY ordinal',(row['id'],))
    sources.append({**row,'note':n,'pages':pages,'chunks':chunks})
  book=db.one('SELECT id,path,sha256 FROM pdfs WHERE id=1124')
  with fitz.open(book['path']) as doc:
   book_text=[{'page':i+1,'text':page.get_text()} for i,page in enumerate(doc)]
  summary=PIPE/'topics/taxonomy_v4/Fizik/Hareket ve Kuvvet/333_Hareket ve Kuvvet.md'
  pack={'categoryId':CATEGORY,'timestamp':stamp(),'summary':summary.read_text(encoding='utf-8'),
    'summarySha256':hashlib.sha256(summary.read_bytes()).hexdigest(),'sources':sources,'questionBook':{**book,'pages':book_text},
    'review':'Source text extracted; page images exported. Visual review is a separate explicit step. No teacher approval.'}
  save(OUT/'sources.json',pack)
  print('Prepared',len(sources),'note PDFs plus 40-page question book',flush=True)
  return pack
 finally: db.close()

def generate(pack):
 configure(); db=DB(False); api=Ollama(db)
 def call(model,prompt,schema,name,limit):
  dest=OUT/(name+'.json')
  payload={'model':model,'prompt':prompt,'stream':False,'format':schema,'think':'low' if model.startswith('gpt-oss') else False,
    'keep_alive':'10m','options':{'num_ctx':8192,'num_predict':limit,'temperature':0.2}}
  if model.startswith('qwen3.5'):
   # The installed custom GGUF has TEMPLATE {{ .Prompt }}, so /generate otherwise
   # samples a raw text continuation instead of an instruction-following answer.
   # Bound the model with its ChatML turns locally; preserve the user's model.
   payload['raw']=True
   payload['prompt']='<|im_start|>system\nSen Türkçe anlatan dikkatli bir fizik öğretmenisin. Yalnız istenen bölüm ve JSON şeması.\n<|im_end|>\n<|im_start|>user\n'+prompt+'\n<|im_end|>\n<|im_start|>assistant\n<think>\n\n</think>\n'
   payload['options'].update(presence_penalty=0,repeat_penalty=1.0,stop=['<|im_end|>','<|im_start|>'])
  digest=hashlib.sha256(json.dumps(payload,ensure_ascii=False,sort_keys=True).encode()).hexdigest()
  if dest.exists():
   cached=json.loads(dest.read_text(encoding='utf-8'))
   if cached.get('inputSha256')==digest: return cached['output']
  for attempt in range(2):
   print('Generating',name,model,'attempt',attempt+1,flush=True)
   response=api.call('/api/generate',payload,'physics_pilot_'+name,VERSION)
   try:
    if response.get('done_reason')=='length': raise ValueError('Output truncated')
    value=json.loads(response['response'])
    validate(value,schema)
    save(dest,{'inputSha256':digest,'model':model,'timestamp':stamp(),'output':value,
      'metrics':{k:response.get(k) for k in ('eval_count','prompt_eval_count','total_duration')}})
    return value
   except (ValueError,KeyError,ValidationError) as error:
    if attempt: raise
    payload['prompt'] += '\nÖnceki çıktı kesildi/bozuldu. Daha kısa tut, bütün alanları doldur, yalnız geçerli JSON üret.'
  raise RuntimeError('No validated response')
 try:
  with ModelLease('planner','gpt-oss:20b + qwen3.5:9b',wait_seconds=600):
   api.unload_all()
   source_text='\n'.join(f"K{r['note']}: "+' '.join(p['text'] for p in r['pages'])[:850] for r in pack['sources'])
   outline=call('gpt-oss:20b', 'Bütün çıktı Türkçe. Fizik öğretim tasarımcısısın. Tek pilot TYT 9. sınıf Hareket ve Kuvvet. '
    'Kaynakların izin verdiği aşağıdaki 8 aşamanın her biri için bir somut öğrenci eylemi ve kritik yanılgıyı öner. '
    'Anlatım değil kısa plan yaz. Üçüncü yasa kuvvetleri farklı cisimlerde. Sabit hız için net kuvvet sıfır. '
    'Statik sürtünme her zaman maksimum değildir. Eşitlik sınırında durgun kutu durgun kalabilir. '
    'Konum-zaman grafiğinin ALANI yer değiştirme DEĞİLDİR: yalnız hız-zaman grafiğinin işaretli alanı yer değiştirmedir. '
    'Trende oturan yolcu perona göre hareketlidir, trene göre durgundur. '
    'Yanılgıyı tırnakta yazıp arkasından doğru açıklamayı ekle. Bir yanlış ifadeyi etkinliğin doğru bilgisi gibi ASLA yazma. '
    'Görseli görmüş gibi iddia yazma.\n'+json.dumps(SECTIONS,ensure_ascii=False)+'\n'+source_text,
    {'type':'object','properties':{'rationale':{'type':'string'},'activities':{'type':'array','minItems':8,'maxItems':8,'items':{'type':'string'}}},'required':['rationale','activities'],'additionalProperties':False},'plan',1300)
   api.unload_all()
   fields=['story','intuition','connection','deeper','workedQuestion','workedSolution','workedQuestion2','workedSolution2','shortcut','trap','inquiry','inquiryAnswer']
   schema={'type':'object','properties':{k:{'type':'string','minLength':60} for k in fields},'required':fields,'additionalProperties':False}
   sections=[]
   for i,(key,title,notes,guard) in enumerate(SECTIONS):
    evidence=[s for s in pack['sources'] if s['note'] in notes]
    excerpts='\n'.join(f"K{s['note']} sayfa {p['page']}: {p['text'][:2100]}" for s in evidence for p in s['pages'])[:7000]
    prompt=('Kaynaklı Türkçe FİZİK dersi yaz. Öğrenci hiç bilmiyor. Yalnız istenen bölüm, sade açıklama ve neden-sonuç. '
     'Başlık '+title+'. '
     'Doğruluk koşulları: '+guard+'. '
     'story: gündelik durum 2 cümle, intuition: temelden 4 cümle, connection: bağlantıları kur 3 cümle, deeper: koşullar/ileri düşünme 3 cümle. '
     'workedQuestion ve workedSolution: yukarıdaki doğruluk koşulundaki örneği gerekçeli çöz; workedQuestion2 ve workedSolution2: farklı sayılı özgün örnek ve adım adım gerekçesi. '
     'shortcut: geçerlilik koşuluyla pratik yol; trap: somut yanlış düşünce ve nedeni. inquiry: açık uçlu günlük soru; inquiryAnswer: gerekçeli örnek cevap. '
     'Toplam 450 kelimeyi aşma. Her alan en az 60 karakter. Sayısal sorular özgün alıştırmadır, çıkmış soru/kitap sorusu iddiası yazma. '
     'Şu denetlenmiş gerçekleri ihlal etme: Trende oturan yolcu PERONA GÖRE HAREKETLİ, trene göre durgun. '
     'Referans yalnız gözlemcinin konumu değil seçilen koordinat sistemidir. Yol SIFIR DA OLABİLİR. '
     'Ortalama sürat=toplam yol/toplam süre. Ortalama hız=yer değiştirme/toplam süre. '
     'Konum-zaman: eğim hızdır; KONUM-ZAMANIN ALANI NE YOL NE YER DEĞİŞTİRME verir. '
     'Hız-zaman: işaretli alan yer değiştirme, mutlak alan yol. Her alan dediğinde hangi grafikten söz ettiğini yaz. '
     'Negatif eğimin artması -4ten-2ye gelmek olabilir; bu yavaşlamadır; eğim büyüklüğü ile işaretini ayır. '
     'İvme genel olarak yön değiştirebilir, BU deneyde sabit. Durma süresi -v0/a yalnız v0*a<0 ve sabit ivme sürerse geçerli. '
     'Net kuvvet sıfır değilse ivme vardır; hareket yönünü tek başına kuvvet belirlemez. '
     'Sürtünmede yüzeyler ayrılmaz, teması sürer. Başlangıç durgunken F=mu_s*N eşitliğinde statik denge mümkün, zorunlu kayma YOK. '
     'Kinetik sürtünme BAĞIL KAYMAYA zıttır; yürüyen kişinin ayağına statik sürtünme ileri olabilir. '
     'Normal ve ağırlık aynı cisme etki ettiği için etki-tepki çifti DEĞİL. '
     'Pratik yolun geçerlilik koşulunu yaz; yanılgı alanında yanlışın neden yanlış olduğunu açıkça belirt. '
     'Öğretmen onayı iddia etme. Görülmemiş görseli tarif etme. Latex gerekirse $...$ içinde, JSON ters eğik çizgilerini kaçır. '
     'Sadece şemaya uygun JSON. Kapsam dışına çıkma. Kaynak metin:\n'+excerpts)
    value=call('qwen3.5:9b',prompt,schema,key,2400)
    sections.append({'id':key,'title':title,'sourceNotes':notes,**value})
    save(OUT/'progress.json',{'timestamp':stamp(),'sectionsDone':len(sections),'total':8})
   api.unload_all()
   review=call('qwen3.5:9b','Fizik doğruluk denetimi yap. Yanlış/yanıltıcı ifadeleri bul; onay uydurma. '
    'Net kuvvet hız değil ivme belirler; negatif hız negatif ivme demek değildir; statik sürtünme uyarlanır; '
    'eşitlik sınırında statik denge mümkün; etki-tepki farklı cisimlerde; model örneklerinde g=10 ve yatay zemin. '
    'Aşağıdaki sekiz bölümün her birinin id değeriyle bulguları kısa yaz:\n'+json.dumps(sections,ensure_ascii=False)[:23000],
    {'type':'object','properties':{'findings':{'type':'array','items':{'type':'string'}}},'required':['findings'],'additionalProperties':False},'review',1600)
   save(OUT/'draft-local.json',{'id':'hareket-kuvvet','categoryId':CATEGORY,'title':'Hareket ve Kuvvet','sections':sections,
    'provenance':{'promptVersion':VERSION,'models':['gpt-oss:20b','qwen3.5:9b'],'teacherApproved':False,
     'summarySha256':pack['summarySha256']},
    'sources':[{'note':s['note'],'filename':s['filename'],'sha256':s['sha256'],
      'pages':[{k:p[k] for k in ['page','image','imageSha256']} for p in s['pages']]} for s in pack['sources']]})
   print('Draft retained in veri; source review and --curate produce the application lesson.',flush=True)
 finally:
  try: api.unload_all()
  finally: db.close()

def curate(pack):
 """Reproducible, explicit source review overlay; never portray a draft as approved."""
 editorial=json.loads(CONTENT.with_name('hareket-kuvvet.editorial.json').read_text(encoding='utf-8'))
 sections=[]; evidence=[]
 for key,title,notes,guard in SECTIONS:
  draft_path=OUT/(key+'.json')
  draft=json.loads(draft_path.read_text(encoding='utf-8'))
  value={**draft['output'],**editorial['corrections'][key]}
  sections.append({'id':key,'title':title,'sourceNotes':notes,**value})
  evidence.append({'id':key,'model':draft['model'],'inputSha256':draft['inputSha256'],
   'draftSha256':hashlib.sha256(draft_path.read_bytes()).hexdigest(),'editoriallyCorrected':True})
 for s in pack['sources']:
  for page in s['pages']:
   if hashlib.sha256((ROOT/'frontend/public'/page['image'].lstrip('/')).read_bytes()).hexdigest()!=page['imageSha256']:
    raise ValueError('Reviewed source image changed')
 result={'id':'hareket-kuvvet','categoryId':CATEGORY,'title':'Hareket ve Kuvvet','sections':sections,
  'provenance':{'promptVersion':VERSION,'models':['gpt-oss:20b','qwen3.5:9b'],
    'roles':{'gpt-oss:20b':'Plan candidate; not accepted as physics evidence','qwen3.5:9b':'Section drafts; source-grounded technical corrections applied'},
    'teacherApproved':False,'editoriallyCorrected':True,'reviewType':editorial['reviewType'],
    'reviewedSourceNotes':editorial['reviewedSourceNotes'],'summarySha256':pack['summarySha256'],
    'editorialSha256':hashlib.sha256(CONTENT.with_name('hareket-kuvvet.editorial.json').read_bytes()).hexdigest(),'draftEvidence':evidence},
  'sources':[{'note':s['note'],'filename':s['filename'],'sha256':s['sha256'],
   'pages':[{k:p[k] for k in ['page','image','imageSha256']} for p in s['pages']]} for s in pack['sources']]}
 encoded=json.dumps(result,ensure_ascii=False,indent=2)
 if not CONTENT.exists() or CONTENT.read_text(encoding='utf-8')!=encoded:
  CONTENT.parent.mkdir(parents=True,exist_ok=True); CONTENT.write_text(encoded,encoding='utf-8')
 save(OUT/'accepted-manifest.json',{'contentSha256':hashlib.sha256(CONTENT.read_bytes()).hexdigest(),
  'editorialSha256':result['provenance']['editorialSha256'],'reviewedSourceNotes':editorial['reviewedSourceNotes'],
  'teacherApproved':False,'rawDraftsAreNotFinalLesson':True})
 print('Exported reviewed pilot; raw model drafts retained',flush=True)

def review_final():
 configure(); db=DB(False); api=Ollama(db)
 content=json.loads(CONTENT.read_text(encoding='utf-8'))
 excerpt=[{k:section[k] for k in ['id','intuition','workedSolution2','shortcut']} for section in content['sections']]
 try:
  with ModelLease('planner','gpt-oss:20b final pilot audit',wait_seconds=600):
   api.unload_all()
   # A whole-lesson medium-reasoning attempt exhausted its output budget before
   # emitting a final answer. Review two sections at a time; never count an empty
   # or truncated response as a clean audit.
   runs=[]
   for start in range(0,len(excerpt),2):
    group=excerpt[start:start+2]
    small_prompt=('Review ONLY these two Turkish physics sections. Find actual physics errors; '
     'return {"issues":[]} if none. Each issue must quote an exact wrong phrase. '
     'Be brief. No teacher approval. '+json.dumps(group,ensure_ascii=False))
    result=api.call('/api/chat',{'model':'gpt-oss:20b','messages':[
     {'role':'system','content':'You are a careful physics reviewer. Give a short, precise final JSON answer.'},
     {'role':'user','content':small_prompt}], 'stream':False,'think':'low','keep_alive':'10m',
     'format':{'type':'object','properties':{'issues':{'type':'array','items':{'type':'string'}}},'required':['issues'],'additionalProperties':False},
     'options':{'num_ctx':4096,'num_predict':1600,'temperature':.1,'presence_penalty':0}},'physics_pilot_final_small_review','physics-final-review-v2',240)
    response=result.get('message',{}).get('content','')
    try:
     decoded=json.loads(response)
     complete=result.get('done_reason')!='length' and isinstance(decoded.get('issues'),list)
    except (ValueError,AttributeError): complete=False
    runs.append({'sections':[s['id'] for s in group],'status':'complete' if complete else 'incomplete',
     'response':response,'doneReason':result.get('done_reason'),'evalCount':result.get('eval_count')})
    save(OUT/'final-local-review.json',{'model':'gpt-oss:20b','contentSha256':hashlib.sha256(CONTENT.read_bytes()).hexdigest(),
      'runs':runs,'teacherApproval':False,'status':'complete' if len(runs)==4 and all(r['status']=='complete' for r in runs) else 'incomplete'})
    print('Small audit',start//2+1,runs[-1]['status'],flush=True)
   api.unload_all()
   print('Bounded local audit retained; technical inspection remains required')
 finally: db.close()

if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--prepare',action='store_true');parser.add_argument('--curate',action='store_true');parser.add_argument('--review',action='store_true');args=parser.parse_args()
 pack=prepare() if args.prepare or not (OUT/'sources.json').exists() else json.loads((OUT/'sources.json').read_text(encoding='utf-8'))
 if args.review: review_final()
 elif args.curate: curate(pack)
 elif not args.prepare: generate(pack)
