"""Read the pilot's printed keys with local vision, one pass, no answer solving."""
import hashlib
import importlib.util
import json
import time
from datetime import datetime,timezone
from mebi_pratik2_tam_pdf_tarama import APP,BASE
from yks_birlestirme import write_json

PROMPT='Read only the printed question number and answer letter in this image. Do not solve anything. Return JSON with number (integer) and answer (one of A B C D E).'


def run(full=False):
    spec=importlib.util.spec_from_file_location('local_vision',APP/'scripts/ollama-sor.py')
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    package=BASE/('single-test-crops/manifest.json' if full else 'single-test-crop-pilot/reviewed-package.json')
    value=json.loads(package.read_text(encoding='utf8'))
    items=value['crops'] if full else value['items']
    if full:
        for item in items:
            item['code']=f'MEBI2-{item["sourceSha256"][:16]}-Q{item["printedNumber"]:03}'
    out=package.parent/'second-reading';out.mkdir(exist_ok=True)
    results=[]; started=time.monotonic();last_log=started;bucket=-1
    for item in items:
        image=BASE/item['keyImage'];sha=hashlib.sha256(image.read_bytes()).hexdigest()
        if sha!=item['keyImageSha256']:raise ValueError('Reviewed key pixels changed')
        target=out/(item['code']+'.json')
        if target.exists():
            result=json.loads(target.read_text(encoding='utf8'))
            if result['imageSha256']!=sha:raise ValueError('Second reading source changed')
        else:
            try:
                value,hit=module.ask(PROMPT,image=image,as_json=True,model='qwen3.5:9b')
                agree=value.get('number')==item['printedNumber'] and value.get('answer')==item['answer']
                result={'code':item['code'],'imageSha256':sha,'reading':value,'cacheHit':hit,
                    'status':'AGREES' if agree else 'REVIEW_REQUIRED','model':'qwen3.5:9b'}
            except Exception as error:
                result={'code':item['code'],'imageSha256':sha,'status':'REVIEW_REQUIRED','errorType':type(error).__name__}
            write_json(target,result)
        results.append(result); now=time.monotonic();current=len(results)*10//len(items)
        if current>bucket or now-last_log>=300 or len(results)==len(items):
            progress={'atUtc':datetime.now(timezone.utc).isoformat(),'completed':len(results),'total':len(items),
                'percent':round(100*len(results)/len(items),2),'elapsedSeconds':round(now-started,1),
                'estimatedRemainingSeconds':None,'agreed':sum(r['status']=='AGREES' for r in results)}
            with (out/'progress.jsonl').open('a',encoding='utf8') as stream:stream.write(json.dumps(progress)+'\n')
            print(json.dumps(progress),flush=True);last_log=now;bucket=current
    write_json(out/'report.json',{'status':'PASS' if all(r['status']=='AGREES' for r in results) else 'REVIEW_REQUIRED',
        'scope':'SINGLE_TEST_KEY_CANDIDATES_ONLY' if full else 'ONLY_21_PILOT_PRINTED_KEYS','results':results,'questionWrites':0,
        'sourcePackageSha256':hashlib.sha256(package.read_bytes()).hexdigest()})


if __name__=='__main__':
    import argparse
    parser=argparse.ArgumentParser();parser.add_argument('--full',action='store_true')
    run(parser.parse_args().full)
