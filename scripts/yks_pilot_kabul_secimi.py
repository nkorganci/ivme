"""Prepare a deliberately bounded pilot after source reading; no production writes."""
from pathlib import Path
import json

from yks_birlestirme import Store,digest,signature,read_json,write_json
from yks_soru_pilotu import APP,live_bank
from yks_pilot_kaynaklari import source_keys

# Actual source crops read by the executing AI agent. This is not a human or
# teacher decision. Hashes bind that reading to these exact three crops.
READINGS={
 'mebi-05ed1fe27201-q1':{'imageSha256':'6f635c65a8b9dcd0edac5522daa87889e45c142ec13e43cffb98dda88782873e',
  'categoryId':'excel.ayt.din.b18ae752a082a2431680',
  'questionQuote':'Tasavvuf ve Tarikat olmak üzere üç dönemde',
  'topicQuote':'Tasavvufi Düşüncenin Oluşum Dönemleri',
  'reason':'Züht, tasavvuf ve tarikat dönemleri ile tarihsel oluşum doğrudan ölçülüyor.'},
 'mebi-05ed1fe27201-q2':{'imageSha256':'ec0f880c6183636025bd425b9765180d8dc27da339cbd69cdb827fbd5073e3ad',
  'categoryId':'excel.ayt.din.b18ae752a082a2431680',
  'questionQuote':'kavramlar sistemleşmiş, sufi ve tasavvuf terimleri',
  'topicQuote':'Tasavvufi Düşüncenin Oluşum Dönemleri',
  'reason':'Tasavvufi düşüncenin sistemleşmesi ve tarikat döneminde kurumsallaşması ölçülüyor.'},
 'mebi-05ed1fe27201-q4':{'imageSha256':'ce9df3d017ea68ffc1d44de2a0c16b2347542db6a011949db8dec0715dde3cb7',
  'categoryId':'mebi.ayt.din.8869b591-3e69-4c5d-fd3f-08dce8618010',
  'questionQuote':'arındırarak güzel ahlaki niteliklerle donatmaktır.',
  'topicQuote':'Tasavvufun asıl amacı, insanı kötü huy ve ahlaktan uzaklaştırarak',
  'reason':'Tasavvufun kişiyi kötü huylardan arındırması, güzel ahlaki nitelikler ve manevi olgunluk doğrudan ölçülüyor.'}}


def prepare(root):
    import pymupdf
    crop_report=read_json(root/'question-cohort/source-crop-report.json');cards={};packages={}
    for item in crop_report['results']:
        if item['status']!='PREPARED':continue
        path=Path(item['package'])
        if digest(path)!=item['packageSha256']:raise ValueError('Source question package changed')
        packages[str(path)]=item['packageSha256'];cards.update({c['code']:c for c in read_json(path)['cards']})
    comparison=read_json(root/'question-cohort/bank-comparison.json');current,_=live_bank(APP)
    if signature(current)!=comparison['bankSnapshotSha256']:raise ValueError('Whole-bank comparison stale')
    secondary=read_json(root/'question-topics/din/secondary-bank-comparison.json')
    if secondary['bankSnapshotSha256']!=comparison['bankSnapshotSha256']:raise ValueError('Secondary bank version differs')
    # The missing prose evidence is explicitly read from its actual bank crop:
    # it is an electroscope question, distinct from all three Tasavvuf stems.
    missing=secondary['questionsWithoutUsableText']
    if [m['code'] for m in missing]!=['sb-83612']:raise ValueError('Unreviewed missing bank text')
    exception=missing[0];image=APP/'veri/resimler-pilot'/exception['image']
    if exception['stamp']!='1791453684.551666' or digest(image)!='6cbf2baf7d1146a5416c85f933da84db68f8c2e11c1e60b9dbf18f2c560a17e5':
        raise ValueError('Visually read bank exception changed')
    exception_proof={'code':exception['code'],'questionVersion':exception['stamp'],'imagePath':str(image),
        'imageSha256':digest(image),'method':'EXECUTING_AI_AGENT_ACTUAL_IMAGE_READING_NOT_TEACHER_APPROVAL',
        'observedScope':'Pozitif yüklü elektroskop ve negatif yüklü iletken cismin teması; yaprakların kapanma/açılma davranışı.',
        'decision':'DISTINCT_FROM_THREE_READ_TASAVVUF_PILOT_QUESTIONS_ONLY','repairsOtherBankData':False}
    # Both textual and perceptual candidate reports remain evidence; no low
    # score automatically chooses NEW for any unselected question.
    topics=read_json(root/'question-topics/din/content-topic-review.json')
    semantics=read_json(root/'question-topics/din/semantic-topic-review.json')
    if semantics['inputReviewSha256']!=digest(root/'question-topics/din/content-topic-review.json'):
        raise ValueError('Independent topic check is stale')
    selected={r['sourceCode']:r for r in topics['results']};checks={r['sourceCode']:r for r in semantics['results']}
    tree=read_json(root/'yks-04/full/attempt-0007/navigation-candidate.json')
    nodes={t['categoryId']:t for c in tree['navigation'] for u in c['units'] for t in u['topics']}
    keys={k['sourceSha256']:k for k in source_keys(root/'pdf-on-tarama/key-cohort')}
    pixels={p['sourceCode']:p for p in read_json(root/'question-cohort/crop-integrity-report.json')['results']}
    second={r['sourceCode']:r for r in secondary['results']};first={r['sourceCode']:r for r in comparison['candidates']}
    accepted=[]
    for code,reading in READINGS.items():
        card=cards[code];topic=nodes[reading['categoryId']]
        if card['imageSha256']!=reading['imageSha256'] or digest(card['image'])!=reading['imageSha256']:
            raise ValueError('Actually read source image changed')
        if reading['questionQuote'] not in card['text'] or card['containsGraphics'] or card['reviewConcerns']:
            raise ValueError('Source reading quote/scope/visual requirements differ')
        if topic['subjectId']!=card['subjectId'] or topic['sourceExam']!=card['exam']:raise ValueError('Topic scope differs')
        model=selected[code]
        if model['status']!='MACHINE_TOPIC_CANDIDATE_SOURCE_QUOTE_BOUND' or model['suggestion']['categoryId']!=reading['categoryId']:
            raise ValueError('Local topic suggestion disagrees with actual source reading')
        if checks.get(code,{}).get('status')!='INDEPENDENT_TOPIC_SUPPORTED':raise ValueError('Independent topic content support required')
        for record,path_key,sha_key,expected_digest in [
            (model,'modelEvidencePath','modelEvidenceSha256',topics['modelDigest']),
            (checks[code],'evidencePath','evidenceSha256',semantics['modelDigest'])]:
            evidence_path=Path(record[path_key]).resolve()
            if not evidence_path.is_relative_to(root.resolve()) or digest(evidence_path)!=record[sha_key]:
                raise ValueError('Actual local topic evidence bytes changed')
            evidence=read_json(evidence_path);identity=evidence['identity'];response=evidence['response']
            if identity['modelDigest']!=expected_digest or identity['sourceTextSha256']!=card['textSha256']:
                raise ValueError('Local topic model/source identity differs')
            if response.get('done') is not True or response.get('done_reason')=='length':raise ValueError('Local topic response incomplete')
            value=json.loads(response['response'])
            if record is model:
                if value['categoryId']!=reading['categoryId']:raise ValueError('Raw topic model chose another category')
            elif value['verdict']!='SUPPORTED':raise ValueError('Raw independent topic reading does not support the selected scope')
        if topics['modelDigest']==semantics['modelDigest']:raise ValueError('Independent topic checks must use distinct models')
        if second[code]['exactContentCandidates'] or any(m['exactImage'] for m in first[code]['visualMatches']):
            raise ValueError('Unresolved existing bank content/image match')
        if any(m['score']>.25 for m in second[code]['topStemCandidates']) or any(m['similarity']>.25 for m in first[code]['textMatches']):
            raise ValueError('Pilot bank candidates require additional direct source reading')
        key=keys[card['sourceSha256']]
        answer=next(a['answer'] for a in key['sourceAnswers'] if a['number']==card['printedNumber'])
        if card['answer']!=answer or card['answerOrigin']!='EXPLICIT_PRINTED_SOURCE_KEY' or card['keyEvidenceSha256']!=key['keyEvidenceSha256']:
            raise ValueError('Printed answer proof differs')
        pixel=pixels[code]
        if not pixel['sourceAndPreparedPixelsEqual'] or digest(pixel['pixelProofPath'])!=pixel['pixelProofSha256']:
            raise ValueError('Source crop pixel proof differs')
        asset=next(a for a in topic['assets'] if a['kind']=='pdf' and a['sourceSha256']==model['suggestion']['topicEvidence']['sourceSha256'])
        if digest(asset['originalPath'])!=asset['sourceSha256']:raise ValueError('Topic PDF changed')
        with pymupdf.open(asset['originalPath']) as doc:
            native='\n'.join(p.get_text() for p in doc)
        if reading['topicQuote'] not in native:raise ValueError('Actually read topic quote is missing from its own PDF')
        accepted.append({'sourceCode':code,'action':'NEW_QUESTION_FOR_ISOLATED_PILOT_ONLY','categoryId':reading['categoryId'],
            'sourceImageSha256':reading['imageSha256'],'sourceTextSha256':card['textSha256'],'answer':card['answer'],
            'sourceReading':reading,'topicPdfSha256':asset['sourceSha256'],'independentContentCheck':checks[code],
            'teacherApproved':False,'productionImportAccepted':False})
    reuse=read_json(root/'soru-pilotu/008ffec26b7803aa/exact-reuse-report.json')
    if reuse['bankSnapshotSha256']!=signature(current) or reuse['existingQuestionsReused']!=12:
        raise ValueError('Existing-question reuse proof changed')
    current_by_code={q['code']:q for q in current}
    for old in reuse['decisions']:
        source=cards[old['sourceCode']];bank=current_by_code[old['canonicalQuestionCode']]
        if source['textFingerprint']!=old['textFingerprint'] or source['answer']!=old['answer'] or bank['correct_answer']!=old['answer']:
            raise ValueError('Source/current canonical question reuse evidence differs')
    return {'status':'PASS','scope':'TWELVE_EXISTING_PLUS_THREE_NEW_BOUND_PILOT_ONLY',
        'bankSnapshotSha256':signature(current),'sourcePackages':packages,'sourceCohortQuestions':len(cards),
        'reusedQuestions':reuse['decisions'],'newPilotQuestions':accepted,'bankTextException':exception_proof,
        'deferredSourceQuestions':sorted(set(cards)-set(READINGS)-{r['sourceCode'] for r in reuse['decisions']}),
        'questionBankWrites':0,'teacherApproved':False,'fullArchiveDuplicateAcceptance':False,'toolSha256':digest(Path(__file__))}


def main():
    store=Store(APP/'veri/yks-birlestirme');state=store.current();root=store.child(state['runId'])
    report=prepare(root);write_json(root/'question-cohort/bounded-pilot-selection.json',report)
    print({k:v for k,v in report.items() if k not in ('sourcePackages','reusedQuestions','newPilotQuestions','deferredSourceQuestions')})


if __name__=='__main__':main()
