"""Load topic inputs from prepared cohorts and printed single-subject mock ranges."""
from pathlib import Path
from yks_birlestirme import read_json,digest,signature
from yks_partiler_arasi_tekrar import COHORTS

SUBJECTS={'din':'Din Kültürü ve Ahlak Bilgisi','turkce':'Türkçe','edebiyat':'Türk Dili ve Edebiyatı',
    'matematik':'Matematik','geometri':'Geometri','fizik':'Fizik','kimya':'Kimya','biyoloji':'Biyoloji',
    'tarih':'Tarih','cografya':'Coğrafya','felsefe':'Felsefe','psikoloji':'Psikoloji','sosyoloji':'Sosyoloji','mantik':'Mantık'}


def mock_binding(card,scope,proof_path,proof_sha):
    if not scope or scope['sourceSha256']!=card['sourceSha256'] or scope['printedNumber']!=card['printedNumber']:
        return None
    subjects=scope['printedRange']['allowedSubjectIds']
    interval=scope['printedRange']
    if len(subjects)!=1 or not interval['first']<=card['printedNumber']<=interval['last']:return None
    return {'sourceSha256':card['sourceSha256'],'subjectId':subjects[0],
        'printedScopePath':str(proof_path),'printedScopeSha256':proof_sha,'sectionId':scope['sectionId']}


def full_inputs(root,subject=None):
    printed_path=root/'full-mock-comparison/printed-section-scopes.json';printed=read_json(printed_path);printed_sha=digest(printed_path)
    if printed['status'] not in ['PASS','COMPLETE_WITH_EXPLICIT_EXCEPTIONS']:raise ValueError('Printed section discipline scopes required')
    scopes={r['sourceCode']:r for r in printed['sourceCardScopes']};cards={};proofs={};bindings={};deferred=[];inputs={str(printed_path):printed_sha}
    for cohort in COHORTS+(['partial-chemistry-comparison'] if (root/'partial-chemistry-comparison/comparison-report.json').is_file() else []):
        file=root/cohort/'comparison-report.json';report=read_json(file)
        if report['status']!='PASS':raise ValueError('Complete source cohort bank comparison required')
        inputs[str(file)]=digest(file)
        for path,sha in report['sourcePackages'].items():
            if digest(path)!=sha:raise ValueError('Source question package changed')
            selected=[]
            for original in read_json(path)['cards']:
                card=dict(original)
                if cohort=='full-mock-comparison':
                    binding=mock_binding(card,scopes.get(card['code']),printed_path,printed_sha)
                    if binding is None:
                        deferred.append({'sourceCode':card['code'],'sourceSha256':card['sourceSha256'],'reason':'PRINTED_SINGLE_SUBJECT_SCOPE_NOT_PROVEN'});continue
                    card['subjectId']=binding['subjectId'];card['subject']=SUBJECTS.get(card['subjectId'],card['subjectId'])
                else:binding=None
                if subject and card['subjectId']!=subject:continue
                selected.append(card)
                if binding:bindings[card['code']]=binding
            if selected:proofs[path]=sha
            for card in selected:
                if card['code'] in cards and signature(cards[card['code']])!=signature(card):raise ValueError('Conflicting question in full topic inputs')
                cards[card['code']]=card
    return list(cards.values()),proofs,bindings,inputs,deferred


def load_bound_cards(retrieval):
    cards={};scopes={}
    for name,sha in retrieval['questionPackages'].items():
        if digest(name)!=sha:raise ValueError('Source topic question package changed')
        for original in read_json(name)['cards']:
            card=dict(original);binding=retrieval.get('sourceCardBindings',{}).get(card['code'])
            if binding:
                file=binding['printedScopePath'];expected=binding['printedScopeSha256']
                if file not in scopes:
                    if digest(file)!=expected:raise ValueError('Printed mock subject source changed')
                    scopes[file]=(expected,{r['sourceCode']:r for r in read_json(file)['sourceCardScopes']})
                if scopes[file][0]!=expected:raise ValueError('Conflicting hashes for the same printed scope proof')
                actual=mock_binding(card,scopes[file][1].get(card['code']),Path(file),expected)
                if actual!=binding:raise ValueError('Question subject is not the actual single printed scope')
                card['subjectId']=binding['subjectId'];card['subject']=SUBJECTS.get(card['subjectId'],card['subjectId'])
            cards[card['code']]=card
    return cards
