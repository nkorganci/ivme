"""Calibrate local crop review on the 21 body images actually read by the agent.

The model is asked about visible completeness, never to solve the question.
Failures are retained without retries; no publication decision is inferred.
"""
import hashlib
import importlib.util
import json
import time
from mebi_pratik2_tam_pdf_tarama import APP,BASE
from yks_birlestirme import write_json

PROMPT='Inspect only this question image. Do not solve it and do not state the correct answer. Report whether one complete question and all five choices A,B,C,D,E are visible, whether text or a diagram visibly touches or is cut at an image boundary, and whether shared information appears missing. JSON keys: one_question (boolean), all_five_choices_visible (boolean), visible_truncation (boolean), missing_context (boolean), uncertainty (boolean), note (short string). If unsure set uncertainty true.'


def run(full=False):
    spec=importlib.util.spec_from_file_location('local_vision',APP/'scripts/ollama-sor.py')
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    if full:
        calibration=json.loads((BASE/'single-test-crop-pilot/body-model-calibration/report.json').read_text(encoding='utf8'))
        if calibration['status']!='PASS':raise ValueError('Body model calibration did not pass; no bulk run')
        root=BASE/'single-test-crops'
        gates=json.loads((root/'gate-report.json').read_text(encoding='utf8'))['rows']
        eligible={r['code'] for r in gates if set(r['reasons']) <= {'ACTUAL_BODY_CONTENT_REVIEW_REQUIRED'}}
        items=[]
        for row in json.loads((root/'manifest.json').read_text(encoding='utf8'))['crops']:
            code=f'MEBI2-{row["sourceSha256"][:16]}-Q{row["printedNumber"]:03}'
            if code in eligible:items.append({**row,'code':code})
        out=root/'body-model-review'
    else:
        items=json.loads((BASE/'single-test-crop-pilot/reviewed-package.json').read_text(encoding='utf8'))['items']
        out=BASE/'single-test-crop-pilot/body-model-calibration'
    out.mkdir(exist_ok=True)
    pass_status='MODEL_NO_VISIBLE_ISSUE' if full else 'AGREES_WITH_AGENT_BODY_REVIEW'
    rows=[];start=time.monotonic();last_log=start;last_bucket=-1
    for item in items:
        image=BASE/item['image'];sha=hashlib.sha256(image.read_bytes()).hexdigest()
        if sha!=item['imageSha256']:raise ValueError('Reviewed pilot image changed')
        target=out/(item['code']+'.json')
        if target.exists():
            result=json.loads(target.read_text(encoding='utf8'))
            if result['imageSha256']!=sha:raise ValueError('Cached body review pixels changed')
        else:
            try:
                value,hit=module.ask(PROMPT,image=image,as_json=True,model='qwen3.5:9b',max_output_tokens=256)
                agree=(value.get('one_question') is True and value.get('all_five_choices_visible') is True
                    and value.get('visible_truncation') is False and value.get('missing_context') is False
                    and value.get('uncertainty') is False)
                result={'code':item['code'],'imageSha256':sha,'reading':value,
                    'status':pass_status if agree else 'REVIEW_REQUIRED','cacheHit':hit}
            except Exception as error:
                result={'code':item['code'],'imageSha256':sha,'status':'REVIEW_REQUIRED','errorType':type(error).__name__}
            write_json(target,result)
        rows.append(result)
        now=time.monotonic();bucket=10*len(rows)//len(items)
        if bucket>last_bucket or now-last_log>=300 or len(rows)==len(items):
            progress={'completed':len(rows),'total':len(items),'percent':round(100*len(rows)/len(items),2),
                'elapsedSeconds':round(now-start,1),'agreed':sum(r['status']==pass_status for r in rows),
                'estimatedRemainingSeconds':None}
            with (out/'progress.jsonl').open('a',encoding='utf8') as stream:stream.write(json.dumps(progress)+'\n')
            print(json.dumps(progress),flush=True);last_log=now;last_bucket=bucket
    write_json(out/'report.json',{'status':('MODEL_REVIEW_COMPLETE' if full else 'PASS') if all(r['status']==pass_status for r in rows) else 'NOT_APPROVED_FOR_BULK',
        'scope':'TECHNICAL_TOPIC_BOUND_CANDIDATES' if full else '21_AGENT_REVIEWED_PILOT_IMAGES',
        'results':rows,'questionWrites':0,'teacherApproved':False,'agentReviewInherited':not full})


if __name__=='__main__':
    import argparse
    parser=argparse.ArgumentParser();parser.add_argument('--full',action='store_true')
    run(parser.parse_args().full)
