"""Bind three actually read optics tasks to the exact unpublished MEBI leaf.

Preparation topic support and independent answer consistency do not establish
novelty, teacher approval or permission to publish the questions/catalog.
"""
import argparse
from pathlib import Path
import re

import pymupdf
from PIL import Image
from yks_birlestirme import Store,read_json,write_json,digest
from yks_pilot_kaynaklari import APP


NAV='47a1e122883ce9d931dd346259aa28ee06a06a7d77de8faa48b099a5e3bc29f5'
LEAF='mebi.tyt.fizik.e02f14b7-83e9-4f55-9d23-08dc086eb842'
TOPIC_PDF='b0adc77f0c4b653f39b3ff1e20da34c1d278fb47ae5ce5b955bf307b8c4cb390'
VIEWED_PAGES={
    1:'520c1d78db734db3632e45fff46ffc424b76fa4680cd77a16ccd543677e9ab6b',
    2:'429a09c676ef0bc7957970547cbf918c8b46db1ba76c297c41b4a57553e8b746',
    3:'091f76b9a12979765d6fc43b873817f87bda47df1898599ee5f275410b22003d',
    4:'29368d17680b749b531d72176085ae6bddc797a72b662e5f6143085ea131e174',
}
QUOTES={
    1:[(2,'Merkez noktasının aynaya uzaklığı 2f olur.'),(2,'Gelme açısı, yansıma açısına eşit olur.')],
    2:[(2,'Merkez noktasının aynaya uzaklığı 2f olur.'),(2,'Gelme açısı, yansıma açısına eşit olur.')],
    3:[(3,'Asal eksene paralel gelen ışın odaktan geçerek yansır.'),
       (3,'Merkez noktasından geçerek gelen ışın normal üzerinden geldiğinden kendi üzerinden yansır.')],
}
READINGS={
    1:('D','12 cm odak için eğrilik yarıçapı 24 cm. Eşit açılarla çizilen kesik normal merkezden geçer. Şekilde merkez-tepe uzaklığı 9+x olduğundan x=24-9=15 cm; basılı D korunur.'),
    2:('D','N, kesik yüzey normalinin asal ekseni kestiği merkezdir. Odak L ile N ortasındadır ve P-N aralığına düşer. Tümsek aynada sanal görüntünün tepeye uzaklığı gerçek noktanın uzaklığından küçük olduğundan KL=LP sonucu yoktur. II ve III, basılı D ile tutarlıdır.'),
    3:('E','Soldaki aynaya paralel gelen ışın soldan f1 uzaklıktaki odaktan geçer. Sağ aynada kendi yolundan dönen ışın sağ aynanın merkezinden geçer; aynı nokta sağdan 2f2 uzaklıktadır. Toplam f1+2f2, basılı E ile tutarlıdır.'),
}


def leaves(value):
    if isinstance(value,dict):
        if value.get('categoryId')==LEAF and value.get('assets'):yield value
        for child in value.values():yield from leaves(child)
    elif isinstance(value,list):
        for child in value:yield from leaves(child)


def normalized(text):return ' '.join(re.sub('\u00ad\\s*','',text).split())


def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--prepare-pages',action='store_true');args=parser.parse_args()
    store=Store(APP/'veri/yks-birlestirme');root=store.child(store.current()['runId']);folder=root/'physics-summary-topic-review';folder.mkdir(exist_ok=True)
    nav_path=root/'yks-04/full/attempt-0007/navigation-candidate.json';nav=read_json(nav_path)
    if digest(nav_path)!=NAV:raise ValueError('Unpublished authoritative MEBI navigation changed')
    found=list(leaves(nav['navigation']))
    if len(found)!=1:raise ValueError('Unique registered original MEBI leaf required')
    leaf=found[0];definition=next(c for c in nav['categoryDefinitions'] if c['id']==LEAF)
    if leaf['subjectId']!='fizik' or leaf['sourceExam']!='TYT' or definition['subjectId']!='fizik' or definition['exam']!='TYT':raise ValueError('Actual subject/exam authority differs')
    pdfs=[a for a in leaf['assets'] if a['kind']=='pdf' and a['sourceSha256']==TOPIC_PDF]
    if len(pdfs)!=1 or digest(pdfs[0]['originalPath'])!=TOPIC_PDF:raise ValueError('Exact registered topic PDF required')
    package_path=root/'physics-summary-discovery/candidates.json';package=read_json(package_path)
    key_path=root/'physics-summary-discovery/source-key.json';key=read_json(key_path)
    duplicate_path=root/'physics-summary-discovery/actual-bank-image-review.json';duplicates=read_json(duplicate_path)
    if duplicates['status']!='PASS' or duplicates['sourcePackageSha256']!=digest(package_path):raise ValueError('Actual source/bank candidate image readings required')
    with pymupdf.open(pdfs[0]['originalPath']) as doc:
        if len(doc)!=4:raise ValueError('Original complete four-page topic PDF required')
        if args.prepare_pages:
            pages=[]
            for page in doc:
                target=folder/('topic-page-'+str(page.number+1)+'.png');page.get_pixmap(dpi=110,alpha=False).save(target)
                pages.append({'page':page.number+1,'path':str(target),'sha256':digest(target)})
            write_json(folder/'pages.json',{'status':'PREPARED_NOT_ACTUALLY_READ','categoryId':LEAF,'topicPdfSha256':TOPIC_PDF,'pages':pages})
            print({'status':'PREPARED_NOT_ACTUALLY_READ','pages':4});return
        pages=read_json(folder/'pages.json')['pages']
        for row in pages:
            if VIEWED_PAGES.get(row['page'])!=row['sha256'] or digest(row['path'])!=row['sha256']:raise ValueError('Exact actual topic page not read or changed')
            pix=doc[row['page']-1].get_pixmap(dpi=110,alpha=False)
            with Image.open(row['path']) as viewed:
                if viewed.mode!='RGB' or viewed.size!=(pix.width,pix.height) or viewed.tobytes()!=pix.samples:raise ValueError('Viewed topic pixels differ from the original')
        results=[]
        for card in package['cards']:
            n=card['printedNumber'];answer,reason=READINGS[n]
            if card['exam']!='TYT' or card['subjectId']!='fizik' or card['answer']!=answer or digest(card['image'])!=card['imageSha256']:raise ValueError('Actually read source version/scope/answer changed')
            if not any(a['number']==n and a['answer']==answer for a in key['sourceAnswers']):raise ValueError('Original printed key differs')
            quotes=[]
            for page,quote in QUOTES[n]:
                if quote not in normalized(doc[page-1].get_text()):raise ValueError('Literal actual same-leaf PDF quote differs')
                quotes.append({'pdfPage':page,'quote':quote,'pdfSha256':TOPIC_PDF})
            results.append({'sourceCode':card['code'],'sourceSha256':card['sourceSha256'],'sourceImageSha256':card['imageSha256'],
                'status':'ACTUAL_SOURCE_TASK_AND_REGISTERED_MEBI_LEAF_MATCH_FOR_PREPARATION_ONLY','categoryId':LEAF,
                'categoryDefinition':definition,'topicPdfPath':pdfs[0]['originalPath'],'topicPdfSha256':TOPIC_PDF,'sourceQuotes':quotes,
                'sourcePrintedAnswer':answer,'independentPhysicsConsistencyChecked':True,'actualSourceTaskReading':reason,
                'fineTopicAcceptedForPreparation':True,'productionCategoryAssociationWritten':False,'noveltyAccepted':False,
                'newQuestionAdmissionAccepted':False,'teacherApproved':False})
    write_json(folder/'report.json',{'status':'PASS','scope':'ONLY_THREE_ACTUALLY_READ_OPTICS_TASKS_UNPUBLISHED_TOPIC_SUPPORT_AND_PRINTED_ANSWER_CONSISTENCY',
        'questions':len(results),'actualTopicPdfPagesRead':4,'navigationCandidateSha256':NAV,'sourcePackageSha256':digest(package_path),
        'actualBankCandidateReviewSha256':digest(duplicate_path),'sourceKeyEvidenceSha256':digest(key_path),'topicPdfSha256':TOPIC_PDF,
        'results':results,'categoryPublished':False,'questionBankWrites':0,'newQuestionAdmissionAccepted':False,'teacherApproved':False,'toolSha256':digest(Path(__file__))})
    print({'status':'PASS','questions':3,'actualTopicPages':4,'newQuestionAdmissionAccepted':False})


if __name__=='__main__':main()
