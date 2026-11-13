"""Keep accepted counts and the active full-archive task visible without restart."""
import argparse
import json
import subprocess
import sys
import time
from datetime import datetime,timezone
from mebi_pratik2_tam_pdf_tarama import APP,BASE
from yks_birlestirme import write_json,process_lock


def accepted_snapshot():
    pilot=json.loads((BASE/'publication-preparation/publication-result.json').read_text(encoding='utf8'))
    count=pilot['questionsAppended'];accepted=[];latest=None
    for folder in sorted(BASE.glob('verified-source-batch-*')):
        receipt=folder/'bank-acceptance.json'
        if not receipt.exists():continue
        value=json.loads(receipt.read_text(encoding='utf8'))
        if value['status']!='PASS':continue
        count+=value.get('newQuestions',0);accepted.append(folder.name)
        ui=folder/'live-bank-read-report.json'
        if ui.exists():latest=json.loads(ui.read_text(encoding='utf8'))
    scopes={}
    for name in ['curated-chapter-expansion','word-boundary-expansion']:
        path=BASE/name/'progress-current.json'
        if path.exists():scopes[name]=json.loads(path.read_text(encoding='utf8'))
    return {'atUtc':datetime.now(timezone.utc).isoformat(),'status':'FULL_ARCHIVE_IN_PROGRESS',
        'acceptedPublishedQuestions':count,'acceptedBatches':accepted,'activeSourcePasses':scopes,
        'liveCounts':latest['checks'][0]['counts'] if latest else None,
        'overallArchivePercent':None,'estimatedRemainingSeconds':None,'allPrintedQuestionsExtracted':False}


def sync_docs(data):
    label=f"{data['acceptedPublishedQuestions']:,}".replace(',','.')
    line=f'**Güncel canlı kabul:** {label} soru; ana görev **SURUYOR**, bütün arşiv kabulü açık.'
    for name in ['docs/plan/15-soru-bankasi-pratik-2.md','docs/devam.md']:
        path=APP/name;text=path.read_text(encoding='utf8');lines=text.splitlines()
        matches=[i for i,value in enumerate(lines) if value.startswith('**Güncel canlı kabul:**')]
        if matches:lines[matches[0]]=line
        else:lines[2:2]=[line,'']
        path.write_text('\n'.join(lines)+'\n',encoding='utf8')
    path=APP/'docs/gorev-durumu.md';lines=path.read_text(encoding='utf8').splitlines()
    for i,value in enumerate(lines):
        if value.startswith('| MEBI-PRACTICE-2 / 15 |'):
            lines[i]=f'| MEBI-PRACTICE-2 / 15 | Soru Çöz & Pratik 2 — **SURUYOR / tam arşiv** |{label} soru canlı kabulden geçti; önceki banka korunur. İlk geçiş veya inceleme teslimi ana görev kapanışı değildir | [Plan](plan/15-soru-bankasi-pratik-2.md); `archive-continuation-progress.json`, `verified-source-batch-*/bank-acceptance.json` | Kalan kitaplar, konu eşleme, yeni gövdeler ve diğer kaynak düzenleri; tekrar devam talimatı beklenmez |'
    path.write_text('\n'.join(lines)+'\n',encoding='utf8')


def run(watch=False):
    previous=None;last=0
    while True:
        data=accepted_snapshot();now=time.monotonic()
        state=(data['acceptedPublishedQuestions'],tuple((k,int(v.get('percent',0)//10)) for k,v in data['activeSourcePasses'].items()))
        if previous!=state or now-last>=300:
            if previous is None or previous[0]!=state[0]:
                for script in ['mebi_pratik2_guncel_kuyruk.py','mebi_pratik2_arsiv_kararlari.py']:
                    subprocess.run([sys.executable,'scripts/'+script],cwd=APP,check=True,stdout=subprocess.DEVNULL)
                sync_docs(data)
            write_json(BASE/'archive-continuation-progress.json',data)
            with (BASE/'archive-continuation-events.jsonl').open('a',encoding='utf8') as stream:stream.write(json.dumps(data)+'\n')
            print(json.dumps(data),flush=True);last=now;previous=state
        final=BASE/'archive-closeout.json'
        if not watch or (final.exists() and json.loads(final.read_text(encoding='utf8')).get('status')=='FULL_ARCHIVE_ACCEPTED'):break
        time.sleep(10)


if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--watch',action='store_true');a=p.parse_args()
    with process_lock(BASE/'.jobs/archive-continuation-status.lock'):run(a.watch)
