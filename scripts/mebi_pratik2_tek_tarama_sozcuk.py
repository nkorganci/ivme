"""One bounded alternate word-box pass for individual Tarama crop boundaries."""
import json
from mebi_pratik2_tam_pdf_tarama import BASE
from yks_birlestirme import write_json,process_lock
import mebi_pratik2_sozcuk_kirpim as reader

OUT=BASE/'individual-tarama-word-expansion'
PENDING=BASE/'individual-tarama-word-pending-evidence'
CROPS=BASE/'individual-tarama-word-crops'


def run():
    OUT.mkdir(exist_ok=True);PENDING.mkdir(exist_ok=True)
    if (OUT/'chapter-packages.json').exists():
        if not (PENDING/'chapter-packages.json').exists():raise ValueError('Incomplete word package pair')
        return
    reader.OUT=CROPS;reader.run(directories=['individual-tarama-crops'],prepare=False)
    reports=json.loads((CROPS/'report.json').read_text(encoding='utf8'))['sources']
    items=[];keys={}
    for source in reports:
        data=json.loads((CROPS/(source['sourceSha256']+'.json')).read_text(encoding='utf8'))
        items.extend(data['items']);keys.update({g['groupId']:g for g in data['keyGroups']})
    for directory,want_topic in [(OUT,True),(PENDING,False)]:
        selected=[r for r in items if bool(r.get('categoryId'))==want_topic];used={r['groupId'] for r in selected}
        write_json(directory/'chapter-packages.json',{'status':'INDIVIDUAL_TARAMA_ALTERNATE_WORD_GEOMETRY_CANDIDATES_NOT_IMPORTED',
            'items':selected,'keyGroups':[keys[g] for g in sorted(used)],'candidateBodies':len(selected),
            'questionWrites':0,'questionComparisons':0,'teacherApprovalsCreated':0,'studentVisible':False})
    print(json.dumps({'newCrops':len(items),'controlledTopicCandidates':sum(bool(r.get('categoryId')) for r in items),
        'questionWrites':0,'questionComparisons':0}),flush=True)


if __name__=='__main__':
    with process_lock(BASE/'.jobs/individual-tarama-word-preparation.lock'):run()
