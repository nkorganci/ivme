"""Document conflicting printed answer editions; never overwrite canonical answers."""
from pathlib import Path

import pymupdf
from yks_birlestirme import Store,digest,signature,read_json,write_json
from yks_soru_pilotu import APP,live_bank
from yks_tam_kaynak_kontrol import verified_keys
from yks_ayri_anahtar import key_section

VISUALLY_READ={
 'mt-tyt-biyoloji-05-19':['07e40faf1b9cbd43a61b124fa8da54663b04d16705755e6be13f44dae3c3fe4a','ad9ea8f7d4a7c639e002875550da9b1c887533362646c1753985eb06d452ff3a'],
 'mt-ayt-biyoloji-17-12':['f9ce6ff4be43a3294b8426c60d73b5501a74095cdb224054fdb425e1351d2623','73dbd4fd9cce24f9d70a6416851dbd2e81bb4786523373ac54049851f98a0261'],
 'mt-ayt-fizik-09-05':['334d23beccd1829d44cba549e27e439eb447c4361255ada7e1fa26268969107a','0075ba0adeedb5f2eef8008c8034891114251efadf9f58e767bb35faa74b1257'],
 'mt-ayt-fizik-13-27':['a1e88681bf40d8f278433ab432b0591e32ceeebb0e33b600b2dcea1f93e6f5b0','21d0ca2499913fd0855a089cdca1a253cc00111530896bdfe8ab66cccc45c3ca'],
 'mt-ayt-turk-dili-ve-edebiyati-09-20':['01455266ab9c27c7288317770a28bd8c2aeaa186fa9fd1e07a8999f82f2b6f51','018587c70701bd36d60f236370ace6b218889ee5b91999e1bcea87f975a9702a']}


def edition_status(old_sections,canonical,new):
    if canonical not in 'ABCDE' or new not in 'ABCDE' or len(canonical)!=1 or len(new)!=1:
        raise ValueError('Actual source answer letters required')
    if not old_sections or {s['answer'] for s in old_sections}!={canonical}:
        raise ValueError('Actual old printed key does not unambiguously support the preserved canonical answer')
    if canonical==new:raise ValueError('Matching printed editions are not an answer-conflict case')
    return 'PRINTED_SOURCE_EDITION_ANSWER_CONFLICT'


def old_printed_number(original):
    numbers=original.get('questionNumbers',[])
    if not isinstance(numbers,list) or len(numbers)!=1 or type(numbers[0]) is not int or numbers[0]<1:
        raise ValueError('One explicit original printed number required; never copy the new edition number')
    return numbers[0]


def main():
    store=Store(APP/'veri/yks-birlestirme');state=store.current();root=store.child(state['runId']);folder=root/'full-question-comparison'
    folders=[folder,root/'full-question-repair-comparison'];reviews=[];comparisons=[]
    for directory in folders:
        controlled=read_json(directory/'controlled-repeat-review.json');comparison=read_json(directory/'comparison-report.json')
        if controlled['comparisonReportSha256']!=digest(directory/'comparison-report.json'):raise ValueError('Controlled comparison changed')
        reviews.append(controlled);comparisons.append(comparison)
    controlled=reviews[0]
    bank,_=live_bank(APP)
    if any(signature(bank)!=r['bankSnapshotSha256'] for r in reviews):raise ValueError('Live bank candidate comparison stale')
    current={q['code']:q for q in bank};original={q['code']:q for q in read_json(APP/'veri/content-labels/source-inventory.json')['questions']}
    cards={};keys={r['sourceSha256']:r for r in verified_keys(root)}
    for comparison in comparisons:
        for path,sha in comparison['sourcePackages'].items():
            if digest(path)!=sha:raise ValueError('Source package changed')
            cards.update({c['code']:c for c in read_json(path)['cards']})
    matches=[e for review in reviews for q in review['results'] for e in q['exactTextCandidates'] if 'PRINTED_SOURCE_AND_BANK_ANSWER_DISAGREE' in e['issues']]
    if {m['code'] for m in matches}!=set(VISUALLY_READ):raise ValueError('Answer conflicts differ from the actually read image pairs')
    results=[];crop_folder=folder/'answer-edition-crops';crop_folder.mkdir(exist_ok=True)
    for match in matches:
        code=match['code'];card=cards[match['sourceCode']];key=keys[card['sourceSha256']];old=original[code]
        image=APP/'veri/resimler-pilot'/current[code]['image']
        if [digest(card['image']),digest(image)]!=VISUALLY_READ[code]:raise ValueError('Actually read source/bank image pair changed')
        old_pdf=(APP.parent/'Kaynaklar/ogm-materyal'/old['original']['file']).resolve()
        if not old_pdf.is_relative_to((APP.parent/'Kaynaklar/ogm-materyal').resolve()):raise ValueError('Unsafe original source reference')
        source_sha=digest(old_pdf);sections=[];old_number=old_printed_number(old['original'])
        with pymupdf.open(old_pdf) as doc:
            for page in doc:
                section=key_section(page,card['exam'],key['testNumber'])
                if not section:continue
                answer=next((a['answer'] for a in section['answers'] if a['number']==old_number),None)
                if not answer:continue
                crop=crop_folder/(code+'-old-key-page-'+str(section['page'])+'.png')
                page.get_pixmap(dpi=220,clip=pymupdf.Rect(section['bboxPt']),alpha=False).save(crop)
                sections.append({'page':section['page'],'bboxPt':section['bboxPt'],'answer':answer,
                    'nativeTextSha256':signature(section['text']),'image':str(crop),'imageSha256':digest(crop)})
        status=edition_status(sections,current[code]['correct_answer'],card['answer'])
        if digest(old_pdf)!=source_sha:raise ValueError('Old original PDF changed during source reading')
        results.append({'canonicalQuestionCode':code,'sourceCode':card['code'],'status':status,
            'canonicalAnswerPreserved':current[code]['correct_answer'],'canonicalQuestionVersion':current[code]['stamp'],
            'newSourcePrintedAnswer':card['answer'],'newSourceSha256':card['sourceSha256'],
            'oldPrintedNumber':old_number,'newPrintedNumber':card['printedNumber'],
            'newSourceKeyPhysicalPage':card['sourceKeyPage'],'newSourceKeyEvidenceSha256':card['keyEvidenceSha256'],
            'oldPrintedPdfPath':str(old_pdf),'oldPrintedPdfSha256':source_sha,'oldPrintedAnswerSections':sections,
            'actualImageReading':{'method':'EXECUTING_AI_AGENT_SOURCE_AND_BANK_IMAGES_NOT_TEACHER_APPROVAL',
                'sourceImageSha256':card['imageSha256'],'bankImageSha256':digest(image),
                'observation':'Görünen soru kökü ve seçenekler aynı. '+('Fizik çizimindeki tel/çember/ok yönleri de aynı göründü. ' if card['subjectId']=='fizik' else '')+
                    'Farklı basılı anahtarlar için soru ID veya geçmiş taşınmaz.'},
            'action':'KEEP_BOTH_PRINTED_KEY_VERSIONS_BLOCK_MERGE_OR_REIMPORT_PENDING_SOURCE_CORRECTION',
            'canonicalAnswerOverwritten':False,'studentHistoryRewritten':False,'teacherApproved':False})
    after,_=live_bank(APP)
    if signature(after)!=controlled['bankSnapshotSha256']:raise ValueError('Live bank changed during answer-edition review')
    report={'status':'REVIEW_REQUIRED','scope':'ACTUALLY_READ_IMAGE_PAIRS_WITH_CONFLICTING_PRINTED_SOURCE_EDITIONS',
        'conflicts':len(results),'bankSnapshotSha256':controlled['bankSnapshotSha256'],
        'controlledReviewSha256':digest(folder/'controlled-repeat-review.json'),'toolSha256':digest(Path(__file__)),
        'controlledReviews':{str(d/'controlled-repeat-review.json'):digest(d/'controlled-repeat-review.json') for d in folders},
        'questionBankWrites':0,'modelSolutionsGenerated':0,'teacherApproved':False,'results':results}
    write_json(folder/'answer-edition-conflicts.json',report)
    print({k:v for k,v in report.items() if k!='results'})


if __name__=='__main__':main()
