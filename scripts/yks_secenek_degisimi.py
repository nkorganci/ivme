"""Option permutation evidence for existing questions; never copy an answer letter."""
import json
from pathlib import Path
import re
import unicodedata

from yks_birlestirme import Store,digest,signature,read_json,write_json
from yks_stages.database import Snapshot,connection

APP=Path(__file__).resolve().parents[1]
OPTIONS=re.compile(r'(?:^|\s)([A-E])\s*\)')


def choices(text):
    found=list(OPTIONS.finditer(text))
    if len(found)!=5 or ''.join(m[1] for m in found)!='ABCDE':raise ValueError('Five complete ordered option labels required')
    normalize=lambda s:re.sub(r'\s+',' ',unicodedata.normalize('NFC',s)).strip()
    stem=normalize(re.sub(r'^\s*\d+[.)]\s*','',text[:found[0].start()]))
    options={m[1]:normalize(text[m.end():found[i+1].start() if i+1<5 else len(text)]) for i,m in enumerate(found)}
    if not stem or any(not value for value in options.values()) or len(set(options.values()))!=5:
        raise ValueError('Ambiguous/empty source stem or options')
    return stem,options


def option_mapping(left,right,left_answer,right_answer):
    a,first=choices(left);b,second=choices(right)
    if a!=b or set(first.values())!=set(second.values()):raise ValueError('Question stem or option content differs; not a pure permutation')
    if left_answer not in first or right_answer not in second:raise ValueError('Missing original answer letter')
    inverse={value:key for key,value in second.items()};mapping={letter:inverse[value] for letter,value in first.items()}
    return {'letterMapping':mapping,'leftAnswer':left_answer,'rightAnswer':right_answer,
        'answerContentAgrees':mapping[left_answer]==right_answer,
        'sameLetterCanBeCopied':all(letter==target for letter,target in mapping.items()),
        'answerContent':first[left_answer],'stemSha256':signature(a),'optionsContentSha256':signature(sorted(first.values()))}


def main():
    codes=['3a-ayt-tarih-03-05','3a-tyt-tarih-01-09']
    store=Store(APP/'veri/yks-birlestirme');state=store.current();folder=store.child(state['runId']+'/pilot-riskleri');folder.mkdir(exist_ok=True)
    inventory=APP/'veri/content-labels/source-inventory.json';original={r['code']:r for r in read_json(inventory)['questions'] if r['code'] in codes}
    cmd,env=connection(APP)
    with Snapshot(cmd,env) as snapshot:
        questions=json.loads(snapshot.execute("SELECT json_agg(x ORDER BY code) FROM (SELECT code,correct_answer,image,exam_type,subject,extract(epoch FROM updated_at)::text stamp FROM questions WHERE code IN ('3a-ayt-tarih-03-05','3a-tyt-tarih-01-09')) x;"))
    by_code={q['code']:q for q in questions}
    if set(by_code)!=set(codes):raise ValueError('Existing option permutation regression pair missing')
    images={}
    for code in codes:
        row=by_code[code]
        if original[code]['updated_at']!=row['stamp'] or original[code]['image']!=row['image']:raise ValueError('Permutation source text/image is stale')
        image=(APP/'veri/resimler-pilot'/row['image']).resolve()
        if not image.is_relative_to((APP/'veri/resimler-pilot').resolve()):raise ValueError('Unsafe image root')
        images[code]={'path':str(image),'sha256':digest(image)}
    result=option_mapping(original[codes[0]]['original']['text'],original[codes[1]]['original']['text'],
        by_code[codes[0]]['correct_answer'],by_code[codes[1]]['correct_answer'])
    if not result['answerContentAgrees'] or result['sameLetterCanBeCopied']:raise ValueError('Real permutation regression did not preserve answer content')
    report={'status':'PASS','scope':'EXISTING_BANK_REAL_OPTION_PERMUTATION_REGRESSION',
        'codes':codes,'questionVersions':{c:by_code[c]['stamp'] for c in codes},'images':images,**result,
        'sourceInventorySha256':digest(inventory),'toolSha256':digest(Path(__file__)),
        'questionIdsMerged':False,'studentHistoryMoved':False,'questionBankWrites':0,'newSourceAnswerApproval':False}
    write_json(folder/'option-permutation-report.json',report)
    print(json.dumps({k:v for k,v in report.items() if k!='images'},ensure_ascii=False))


if __name__=='__main__':main()
