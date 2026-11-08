"""Freeze six actually viewed source/bank pairs without creating new questions."""
from pathlib import Path

from yks_birlestirme import Store,read_json,write_json,digest,signature,process_lock
from yks_soru_pilotu import APP,live_bank
from yks_konu_girdileri import load_bound_cards
from yks_soru_yenilik_kontrol import same_content

SECONDARY='e9d39befc019411844d3601c000cb367c7befc4474e010eb1e02f3fb35cc1290'
BOARDS=['fddb6a99f02785f0f5ac60e6d3550fa9c7fce385062cb55b6ab9b3a865fb255a',
 '38a62137f3fc2e1d51045f1e44be915895509347e8faa0308c3c81bddd4780b3',
 '8759a2c6817c569ba8be3e8dd0856be54fbaaf5f8020ef825363afe3a1b305cb']
READINGS=[
 ('mebi-mock-05fbeafee7bc-s2-q37','sb-90145','E','Allah hiçbir şeye muhtaç olmayan paragrafı, değinilmemiştir kökü ve Vehhab/Samet/Kadir/Rezzak/Rahim seçenekleri aynıdır; dizgi ve şapka farkı anlam değiştirmez.'),
 ('mebi-mock-05fbeafee7bc-s2-q38','sb-90149','D','Ali İmran159 alıntısı, çıkarılabilecek bir sonuç değildir olumsuz kökü ve beş sonuç seçeneği aynı; vahiyle ilgili istişare D konumunda.'),
 ('mebi-mock-55a7610affc7-s2-q36','sb-90153','C','Tefsir/Hak Dini Kur’an Dili paragrafı, yazar kökü ve beş yazar seçeneği aynı; Elmalılı Hamdi Yazır C konumunda.'),
 ('mebi-mock-5f45c1de6de7-s2-q20','sb-90075','A','Ali İmran134-135 alıntısının tamamı, değinilmemiştir alt çizgisi ve takva sahiplerinin beş özelliği aynı sırada.'),
 ('mebi-mock-cb3151aeef51-s2-q17','sb-90086','A','Arı Türkçe/ilahiler/Divan/Risaletün Nushiyye paragrafı ve mutasavvıf kökü aynı; Yunus Emre ve diğer dört seçenek aynı sırada.'),
 ('mebi-mock-ff1f4b3bfaf0-s2-q19','sb-90053','E','Hac/kul hakkı hariç arınma hadisinin tamamı, ulaşılamaz kökü ve ibadet-ahlak seçeneklerinin tamamı aynı sırada; ek şekil yok.'),
]


def require_pair(source,bank,bank_text):
    match=same_content(source['text'],bank_text)
    if not match:raise ValueError('The complete source stem/options no longer match the canonical question')
    if match['letterMapping'][source['answer']]!=bank['correct_answer']:
        raise ValueError('Printed source answer conflicts with the existing canonical answer')
    if source['exam'] not in ['TYT','AYT'] or bank['exam_type'] not in ['TYT','AYT']:
        raise ValueError('Source/canonical exam is outside the reviewed YKS scope')
    return match


def main():
    store=Store(APP/'veri/yks-birlestirme');root=store.child(store.current()['runId']);folder=root/'full-question-topics/din'
    secondary_path=folder/'secondary-bank-comparison.json';secondary=read_json(secondary_path)
    if digest(secondary_path)!=SECONDARY:raise ValueError('The actually viewed source/bank comparison changed')
    index=read_json(folder/'exact-bank-image-review/index.json')
    if index['secondaryReportSha256']!=SECONDARY or len(index['boards'])!=len(BOARDS):raise ValueError('Viewed board scope changed')
    bank,_=live_bank(APP);bank_sha=signature(bank)
    if bank_sha!=secondary['bankSnapshotSha256']:raise ValueError('Canonical bank changed after the actual image readings')
    by_code={q['code']:q for q in bank};rows={r['sourceCode']:r for r in secondary['results']}
    cards=load_bound_cards(read_json(folder/'topic-candidates.json'))
    inventory_path=APP/'veri/content-labels/source-inventory.json'
    if digest(inventory_path)!=secondary['sourceInventorySha256']:raise ValueError('Original bank text evidence changed')
    originals={q['code']:q for q in read_json(inventory_path)['questions']}
    results=[]
    with process_lock(folder/'.actual-bank-image-writer.lock'):
        for i,(code,canonical,answer,observation) in enumerate(READINGS):
            board=index['boards'][i//2]
            if board['sha256']!=BOARDS[i//2] or digest(board['path'])!=BOARDS[i//2]:raise ValueError('Actually viewed board bytes changed')
            viewed=board['pairs'][i%2];card=cards[code];question=by_code[canonical]
            if viewed['sourceCode']!=code or viewed['bankCode']!=canonical:raise ValueError('Viewed pair order changed')
            if (digest(card['image'])!=viewed['sourceImageSha256'] or digest(viewed['bankImagePath'])!=viewed['bankImageSha256']
                    or question['stamp']!=viewed['bankStamp'] or card['answer']!=answer):raise ValueError('Viewed source/bank version or printed answer changed')
            actual_bank=(APP/'veri/resimler-pilot'/question['image']).resolve()
            if actual_bank!=Path(viewed['bankImagePath']).resolve():raise ValueError('Current canonical image path changed')
            if card['subjectId']!='din' or 'Din' not in question['subject']:raise ValueError('Source/canonical discipline differs')
            exact=[r for r in rows[code]['exactContentCandidates'] if r['code']==canonical and r['version']==question['stamp']]
            if not exact:raise ValueError('Whole-bank comparison no longer includes this exact pair')
            text=next(r['bankText'] for r in rows[code]['topStemCandidates'] if r['code']==canonical and r['sameStem'] and r['allOptionsSameContent'])
            original=originals[canonical]
            if original['updated_at']!=question['stamp'] or original['image']!=question['image']:raise ValueError('Canonical original text version changed')
            proof=require_pair(card,question,text)
            if proof['letterMapping']!=viewed['optionMapping']:raise ValueError('Viewed option mapping differs')
            results.append({'sourceCode':code,'sourceSha256':card['sourceSha256'],'canonicalCode':canonical,
                'status':'ACTUAL_SOURCE_AND_BANK_IMAGES_AND_PRINTED_KEY_AGREE_KEEP_EXISTING_ID',
                'canonicalVersion':question['stamp'],'sourcePrintedAnswer':answer,'currentBankAnswer':question['correct_answer'],
                'sourceExam':card['exam'],'currentBankExam':question['exam_type'],
                'examAssociationNeedsReview':card['exam']!=question['exam_type'],'examAssociationWritten':False,
                'sourceImagePath':card['image'],'sourceImageSha256':viewed['sourceImageSha256'],
                'bankImagePath':str(actual_bank),'bankImageSha256':viewed['bankImageSha256'],
                'actualImagePairRead':True,'sourceReading':observation,'textComparison':proof,
                'viewedBoardPath':board['path'],'viewedBoardSha256':board['sha256'],
                'intakeAction':'KEEP_EXISTING_CANONICAL_ID_DO_NOT_REIMPORT','fineTopicAccepted':False,
                'newQuestionAdmissionAccepted':False,'teacherApproved':False})
        after,_=live_bank(APP)
        if signature(after)!=bank_sha:raise ValueError('Canonical bank changed during reuse proof')
        output={'status':'PASS','scope':'SIX_ACTUALLY_VIEWED_EXISTING_BANK_QUESTION_IDENTITIES_ONLY',
            'sourceComparisonSha256':SECONDARY,'bankSnapshotSha256':bank_sha,'questions':len(results),
            'sourceQuestionImagesRead':12,'toolSha256':digest(Path(__file__)),'results':results,
            'newModelCalls':0,'newOcrCalls':0,'questionBankWrites':0,'teacherApproved':False}
        write_json(folder/'exact-bank-image-review/report.json',output)
    print({k:v for k,v in output.items() if k!='results'})


if __name__=='__main__':main()
