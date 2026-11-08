"""Freeze three actual laboratory-question images and their correct source leaf.

This is an unpublished topic correction candidate. It is not teacher approval
or permission to import a question. Wrong earlier model outputs stay intact.
"""
from pathlib import Path
import pymupdf
from yks_birlestirme import Store,read_json,write_json,digest
from yks_soru_pilotu import APP
from yks_konu_girdileri import load_bound_cards

PRIMARY='20f1e53df5d6a03ce234bfe5c5c1bd554d8380304b21c05e98652e87b0a8d0ad'
TOPIC='excel.tyt.kimya.7e163b7eea7aa9e1bb22'
PDF='85bfa6a1cf1d8a868d81b36d0b762e9aefe62890832589a0c46e41444fad46eb'
VIEWED={
 6:('c4c5c102948b538364fb724dec71ad2231273db5eae2530dd05e6553d1d0a6a0',
    'Soru bunzen beki, pipet/mezür ve krozenin kullanımını soruyor; çevre kirliliği değil laboratuvar malzemesi seçimi ölçülür.'),
 7:('89079bc125715f5e4ba5a607a212057b444df55bb06c146b2940a5c2f1db80ec',
    'Gerçek üç araç fotoğrafı ve isimleri okunmuştur. İstenen beceri laboratuvar aracını doğru adlandırma; yalnız ayırma hunisi adı ayırma-saflaştırma konusuna yeterli değildir.'),
 8:('622c2fdd5e624353102e35c92155a33fd810113c22454307a0a11a039f38b4ab',
    'İşlem metni ile seçeneklerdeki beş araç fotoğrafı okundu. Soru deneyde hangi malzemeye ihtiyaç olmadığını soruyor; karışımların sınıflandırılması ölçülmüyor.'),
}


def main():
    store=Store(APP/'veri/yks-birlestirme');state=store.current();root=store.child(state['runId']);folder=root/'kimya-topic-pilot-actual';folder.mkdir(exist_ok=True)
    current=root/'full-question-topics/kimya/content-topic-review.json';frozen=folder/(PRIMARY+'.primary-review.json')
    if not frozen.is_file():
        if digest(current)!=PRIMARY:raise ValueError('The actually examined twelve-question primary version changed')
        frozen.write_bytes(current.read_bytes())
    if digest(frozen)!=PRIMARY:raise ValueError('Frozen actual primary review changed')
    primary={r['sourceCode']:r for r in read_json(frozen)['results']}
    retrieval=read_json(root/'full-question-topics/kimya/topic-candidates.json');cards=load_bound_cards(retrieval)
    tree_path=next(root/a['path'] for a in state['stages']['YKS-04:full']['artifacts'] if a['path'].endswith('navigation-candidate.json'))
    if digest(tree_path)!=retrieval['providerTreeSha256']:raise ValueError('Registered topic tree changed')
    topics={t['categoryId']:t for c in read_json(tree_path)['navigation'] for u in c['units'] for t in u['topics']};topic=topics[TOPIC]
    asset=next(a for a in topic['assets'] if a['kind']=='pdf' and a['sourceSha256']==PDF);path=asset['originalPath']
    if digest(path)!=PDF or topic['subjectId']!='kimya' or topic['sourceExam']!='TYT':raise ValueError('Actual registered laboratory topic PDF/exam changed')
    pages=[]
    with pymupdf.open(path) as doc:
        for number in [6,7]:
            image=folder/('registered-topic-page'+str(number)+'.png')
            if not image.is_file():raise ValueError('Actually viewed registered topic page image missing')
            pages.append({'sourcePath':path,'sourceSha256':PDF,'page':number,'quote':doc[number-1].get_text(sort=True),
                'actuallyViewedPageImage':str(image),'actuallyViewedPageImageSha256':digest(image)})
    results=[]
    for number,(image_sha,reason) in VIEWED.items():
        code='mebi-142487f3728b-q'+str(number);card=cards[code];old=primary[code]
        if digest(card['image'])!=image_sha or card['imageSha256']!=image_sha:raise ValueError('Actually read question image changed')
        if old['suggestion']['categoryId']==TOPIC:raise ValueError('This explicit wrong-model-topic review no longer matches')
        results.append({'sourceCode':code,'sourceSha256':card['sourceSha256'],'sourceImagePath':card['image'],'sourceImageSha256':image_sha,
            'status':'ACTUAL_QUESTION_AND_REGISTERED_PDF_SUPPORT_DIFFERENT_UNPUBLISHED_TOPIC_CANDIDATE',
            'originalModelCategoryId':old['suggestion']['categoryId'],'proposedCategoryId':TOPIC,
            'sourceReading':reason,'actualOriginalQuestionImageRead':True,'sourceTopicEvidence':pages,
            'categoryAssignmentWritten':False,'newQuestionAdmissionAccepted':False,'teacherApproved':False})
    output={'status':'PASS','scope':'THREE_ACTUALLY_READ_LABORATORY_QUESTION_TOPIC_CORRECTION_CANDIDATES_ONLY',
        'primaryReviewSha256':PRIMARY,'frozenPrimaryReviewPath':str(frozen),'questions':3,'results':results,
        'toolSha256':digest(Path(__file__)),'newModelCalls':0,'questionBankWrites':0,'categoryAssignmentsWritten':0,'teacherApproved':False}
    write_json(folder/'report.json',output);print({k:v for k,v in output.items() if k!='results'})


if __name__=='__main__':main()
