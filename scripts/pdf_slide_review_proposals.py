"""Cache local source/duplicate/topic review proposals for staged lesson questions.

No bank, teacher or learner writes. A model decision is a proposal and does not
admit a question or turn a PDF's coverage state into VERIFIED.
"""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path

from kaynakli_arastirma_db import db_connection,query
from pdf_source_scan import APP,OUT,write_json,digest


def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--limit',type=int,default=0);args=parser.parse_args()
    connection=db_connection('ivme')
    categories=json.loads(query(connection,"SELECT json_agg(definition) FROM learning_catalog.current_categories WHERE definition->>'canonicalUnit'='true' AND definition->>'exam' IN ('TYT','AYT')"))
    live={r['code']:r for r in json.loads(query(connection,"SELECT json_agg(x) FROM (SELECT code,correct_answer,extract(epoch FROM updated_at)::text stamp FROM questions WHERE active AND exam_type IN ('TYT','AYT')) x"))}
    pending={r['code'] for r in json.loads(query(connection,"SELECT coalesce(json_agg(x),'[]') FROM (SELECT evidence->>'sourceCode' code FROM learning_catalog.pdf_question_occurrences WHERE status IN ('CANDIDATE','NEEDS_REVIEW') AND evidence->>'origin'='STAGED_TWO_ANSWER_READINGS') x"))}
    comparison_path=OUT/'text-duplicate-candidates.json';comparison=json.loads(comparison_path.read_text(encoding='utf-8'))
    comparisons={r['code']:r for r in comparison['candidates']}
    originals={r['code']:r.get('original',{}).get('text','') for r in json.loads((APP/'veri/content-labels/source-inventory.json').read_text(encoding='utf-8'))['questions']}
    observations=json.loads(query(connection,"""SELECT coalesce(json_agg(x),'[]') FROM (
      SELECT DISTINCT ON(o.question_code) o.question_code,o.observations->>'text' text
      FROM learning_catalog.question_content_observations o JOIN questions q ON q.code=o.question_code
      AND extract(epoch FROM q.updated_at)::text=o.observations->>'questionStamp'
      WHERE q.active AND q.exam_type IN ('TYT','AYT') ORDER BY o.question_code,o.recorded_at DESC) x"""))
    for row in observations:
        if sum(c.isalpha() for c in row['text'])>sum(c.isalpha() for c in originals.get(row['question_code'],'')):
            originals[row['question_code']]=row['text']
    spec=importlib.util.spec_from_file_location('local_ollama',APP/'scripts/ollama-sor.py')
    local=importlib.util.module_from_spec(spec);spec.loader.exec_module(local);local.ensure_server()
    output=[];processed=0
    for path in sorted((OUT/'slide-candidates').glob('*/candidates.json')):
        package=json.loads(path.read_text(encoding='utf-8'))
        subject={'Felsefe':'felsefe','Tarih':'tarih'}.get(package['sourceSubject'])
        if not subject:continue
        allowed=[c for c in categories if c['subjectId']==subject]
        for card in package['cards']:
            if card['code'] not in pending:continue
            if args.limit and processed>=args.limit:break
            top=[{**match,'text':originals.get(match['code'],''),'answer':live[match['code']]['correct_answer'],
                  'stamp':live[match['code']]['stamp']} for match in comparisons.get(card['code'],{}).get('matches',[]) if match['code'] in live]
            for index,match in enumerate(top):match['index']=index+1
            schema={'type':'object','properties':{
                'categoryIndex':{'type':'integer','minimum':1,'maximum':len(allowed)},
                'decision':{'type':'string','enum':['MATCH','NEW','UNCERTAIN']},
                'matchIndex':{'type':'integer','minimum':0,'maximum':len(top)},
                'confidence':{'type':'string','enum':['LOW','MEDIUM','HIGH']},
                'reason':{'type':'string','maxLength':200}},
                'required':['categoryIndex','decision','matchIndex','confidence','reason'],'additionalProperties':False}
            prompt=('Bir eğitim içeriği inceleme yardımcısısın. Bu sonuç öğretmen onayı veya otomatik aktarım değildir. '
                'Sorunun gerçekten ölçtüğü konuyu kayıtlı kategorilerden seç; yalnız parçada anılan kişiye göre konu değiştirme. '
                'Ortak TYT/AYT kaynağında doğru konu hangi sınavda tanımlıysa onu kullan. '
                'Ayrıca kaynak soruyla mevcut banka adaylarının soru kökü VE bütün seçeneklerini karşılaştır. '
                'Benzer konu/aynı yazar/aynı beceri tek başına aynı soru değildir. Sayı, olumsuzluk ve seçenek farkını kontrol et. '
                'Aynı soru veya yalnız ifade/seçenek sırası varyantıysa MATCH; farklıysa NEW; bilgi eksikse UNCERTAIN. '
                'MATCH ise matchIndex 1..N arasındaki banka adayını göstermeli; NEW/UNCERTAIN için 0 kullan. '
                'Banka adayı yoksa MATCH verilemez. Banka adayının metni eksik/bozuksa UNCERTAIN ver. '
                'Yalnız en yakın beş banka adayı verilmiştir; NEW bütün bankada benzersizlik kanıtı değildir.\n'
                'Kategoriler: '+json.dumps(
                    [{'index':index+1,'exam':c['exam'],'unit':c['unit'],'topic':c['topic']} for index,c in enumerate(allowed)],ensure_ascii=False)
                +'\nKaynak başlığı: '+package['sourceTitle']
                +'\nKaynak soru: '+json.dumps({'text':card['text'],'answer':card['answer']},ensure_ascii=False)
                +'\nBanka karşılaştırma adayları: '+json.dumps(
                    [{k:m[k] for k in ('index','text','answer')} for m in top],ensure_ascii=False))
            payload={'model':local.MODEL,'prompt':prompt,'format':schema,'stream':False,'think':False,
                     'options':{'temperature':0,'num_ctx':8192,'num_predict':600}}
            key=hashlib.sha256(json.dumps(payload,ensure_ascii=False,sort_keys=True).encode()).hexdigest()
            cache=OUT/'local-slide-review-cache'/(key+'.json')
            if cache.exists():proposal=json.loads(cache.read_text(encoding='utf-8'))
            else:
                proposal=json.loads(local.api('/api/generate',payload)['response'])
                write_json(cache,proposal)
            if not 1<=proposal['categoryIndex']<=len(allowed):raise ValueError('Unknown proposed scope')
            proposal={**proposal,'categoryId':allowed[proposal['categoryIndex']-1]['id'],
                'canonicalCode':top[proposal['matchIndex']-1]['code'] if 0<proposal['matchIndex']<=len(top) else 'NONE'}
            if proposal['decision']=='MATCH' and proposal['canonicalCode']=='NONE':
                proposal={**proposal,'rawModelDecision':'MATCH','rawModelConfidence':proposal['confidence'],
                    'decision':'UNCERTAIN','confidence':'LOW','validationIssue':'MODEL_MATCH_HAS_NO_PROVEN_BANK_CODE'}
            output.append({'sourceCode':card['code'],'sourceSha256':package['sourceSha256'],'packageSha256':digest(path),
                'imageSha256':card['imageSha256'],'sourceTextSha256':hashlib.sha256(card['text'].encode()).hexdigest(),
                'model':local.MODEL,'promptSha256':key,'proposal':proposal,'teacherApproved':False})
            processed+=1
            write_json(OUT/'slide-review-proposals.json',{'comparisonSha256':digest(comparison_path),
                'status':'PROPOSALS_NOT_ACCEPTED','complete':False,'reviews':output})
            print(f'Slide review proposal {processed}: {card["code"]} {proposal["decision"]} {proposal["confidence"]}',flush=True)
        if args.limit and processed>=args.limit:break
    write_json(OUT/'slide-review-proposals.json',{'comparisonSha256':digest(comparison_path),
        'status':'PROPOSALS_NOT_ACCEPTED','complete':True,'reviews':output})
    print(json.dumps({'reviewProposals':processed,'teacherApproved':False}),flush=True)


if __name__=='__main__':main()
