"""Bind actual readings of all 40 questions beneath a wrong printed TYT range.

39 subjects are clear from the original content. Nanotechnology question13
is supported by both registered Physics and Chemistry PDFs and remains open.
The original PDF, printed header and all source answers remain unchanged.
"""
from collections import Counter
from pathlib import Path
import pymupdf
from yks_birlestirme import Store,read_json,write_json,digest
from yks_soru_pilotu import APP
from yks_tam_deneme_anahtar import validate_saved

SOURCE='333642091490'
BOARDS=['b9acb970b1d375396ef3203d141fc9162faccd6eb8687de541cfc3baae3924ba',
 'a7eca8076cf415e94fe474d8f68c470efaefffe38404fbd62147325cb1d65c4f',
 '2da0fa8a8c1e72215f8f85ed547c8c84b027bafc57dfee022fc8af154a6ed032',
 '9c5aa809602069f125012a61f19779f80d89534478855bd0bffbcc6cb297aa89',
 '5895466dc5880162a4a43769db0fbb95fc5ad9820153b7a0d9cc5fbef0bba60b',
 'a627dbc387e060a1bfa6019d18c6c7c80efe541c76eb52d89b4bb30a7a9d6c7d',
 '9d93c3ccc7d30a28500b4706db4a90264f3d04f838835160b0f93e5e3fab62c0',
 'c82f4dcf19bc33323866bbbf5ca898a0ef5c4691f7d280f95ecd6dcb202e132e',
 '50f77d2ad43064d66b561831e2e8a20602a88fc5f6276b269caa8a6632f773c4',
 '20d8ccdd2440490e20f9ed6aa329112bb41abc55d9c8c52ac3ba7bcd6dfb0fd8']
READINGS=[
 ('fizik','Sürtünmeli yatay zemin, duvara dayalı kalas ve tepki/tork dengesi şekli.'),
 ('fizik','Alfa, beta ve gama bozunmalarında çekirdek kararlılığı kökü.'),
 ('fizik','Yüklü paralel levhalar, düzgün elektrik alan ve parçacığın hareket süresi şekli.'),
 ('fizik','Fotoelektrik etki; ışık, eşik enerji ve fotoelektron kinetik enerjisi.'),
 ('fizik','Üçgendeki elektrik yükleri ve elektriksel kuvvetlere karşı yapılan iş.'),
 ('fizik','Basit harmonik harekette genlik, hız, frekans, ivme ve geri çağırıcı kuvvet.'),
 ('fizik','Farklı hızlarla düşey atılan iki cismin yere ulaşma süresi/yüksekliği şekli.'),
 ('fizik','Kütle çekim kuvvetinin özellikleri ve merkezler arası uzaklık.'),
 ('fizik','Sıkışmış yay, m/3m kütleleri, kuvvetlerin işi ve kinetik enerji şekli.'),
 ('fizik','Elektromanyetik spektrum, alan bileşenleri ve dalga özellikleri.'),
 ('fizik','İdeal transformatör, sarım sayıları, alternatif gerilim ve ampul devresi.'),
 ('fizik','Akım taşıyan paralel teller ve bileşke manyetik alan şekli.'),
 (None,'Nanoteknolojik yüzeylerin su itmesi/kir tutmaması; iki kayıtlı ders PDF’si de bu uygulamayı içerir. Salt konumdan Fizik atanmaz.'),
 ('fizik','Sürtünmeli virajda hızlanan aracın merkezcil kuvveti/torku şekli.'),
 ('kimya','Periyodik sistemde f ve d blok elementlerinin özellikleri.'),
 ('kimya','CH4 gazının mol, sıcaklık, hacim ve basınç değişimleri.'),
 ('kimya','İki sulu çözeltinin derişim, yoğunluk ve doygunluk karşılaştırması şekli.'),
 ('kimya','Kimyasal tepkime hızının gaz basıncı değişimiyle izlenmesi.'),
 ('kimya','Tepkime entalpisini etkileyen hâl, sıcaklık/basınç, yol ve katalizör.'),
 ('kimya','Baş/açısal momentum kuantum sayıları ve orbitalde elektron sayısı.'),
 ('kimya','N2O4/NO2 tepkimesi, derişime bağlı denge sabiti ve kap hacmi.'),
 ('kimya','Asit-baz çözeltilerinde H+ derişimi, pH/pOH ve nötralleşme.'),
 ('kimya','ZnS/Zn(NO3)2 ortak iyonlu çözeltide çözünürlük çarpımı.'),
 ('kimya','H2O2/Fe2+ iyon tepkimesi, yükseltgenme basamağı ve elektron aktarımı.'),
 ('kimya','Organik bileşiklerin tarihsel tanımı ve organik/inorganik bileşik ayrımı.'),
 ('kimya','Fenol, anilin ve toluenin aromatik hidrokarbon kapsamında incelenmesi.'),
 ('kimya','Organik bileşiklerin polar yapı ve sudaki çözünürlüğü.'),
 ('biyoloji','Radyoaktif karbon yalnız işaretleyicidir; asıl ölçülen böbrek/kalp/organlar arasında alyuvar dolaşımıdır.'),
 ('biyoloji','Botulinum toksini, sinaptik asetilkolin salgısı ve kasların uyarılması.'),
 ('biyoloji','İnsan nefronunun numaralanmış yapısı ve süzülme/geri emilim şekli.'),
 ('biyoloji','Erkek üreme sisteminde spermatogenezin gerçekleştiği yapı.'),
 ('biyoloji','Bitkide fotosentezin ışığa bağlı/bağımsız reaksiyonları ve ETS.'),
 ('biyoloji','Mimikri/adaptasyon tanımı ve canlılar arası benzerlik örnekleri.'),
 ('biyoloji','Griffith deneylerinin dört aşaması; bakteriler arasında genetik aktarım şekilleri.'),
 ('biyoloji','Ekosistemde canlı çeşitliliği, abiyotik faktörler, enerji akışı ve madde döngüleri.'),
 ('biyoloji','Çizgili kaslarda asetilkolin, kalsiyum, aktin/miyozin ve kasılma.'),
 ('biyoloji','Genetik araştırmalarında model organizmalarda aranan özellikler.'),
 ('biyoloji','Bitki ve insan hücrelerinde glikoliz, Krebs ve Calvin döngüsü karşılaştırması.'),
 ('biyoloji','Stoma bekçi hücreleri ile komşu epidermis hücrelerinde metabolik olaylar.'),
 ('biyoloji','Yaprak enine kesitinde örtü/palizat ve iletim dokularının işlevleri şekli.'),
]


def main():
    store=Store(APP/'veri/yks-birlestirme');state=store.current();root=store.child(state['runId']);folder=root/'mock-actual-subject-review'/SOURCE
    index=read_json(folder/'index.json')
    if len(index['boards'])!=10 or index['questions']!=len(READINGS):raise ValueError('Actually read source image scope changed')
    for board,sha in zip(index['boards'],BOARDS):
        if board['sha256']!=sha or digest(board['path'])!=sha:raise ValueError('Actually viewed question image-board bytes changed')
    comparison_path=root/'full-mock-comparison/comparison-report.json';comparison=read_json(comparison_path);cards={};packages={}
    for path,sha in comparison['sourcePackages'].items():
        package=read_json(path);selected=[c for c in package['cards'] if c['code'].startswith('mebi-mock-'+SOURCE+'-s4-')]
        if selected:
            if digest(path)!=sha:raise ValueError('Original source question package changed')
            packages[path]=sha;cards.update({c['printedNumber']:c for c in selected})
    if set(cards)!=set(range(1,41)):raise ValueError('All forty source questions required')
    key_path=root/'pdf-on-tarama/full-mock-keys/progress.json';key_report=read_json(key_path)
    key=next(r for r in key_report['results'] if r['sourceSha256']==cards[1]['sourceSha256'])
    validate_saved(key,{'digest':key_report['identity']['visualModelDigest']})
    section=next(s for s in key['sections'] if s['sectionId']=='AYT:4')
    answers={a['number']:a['answer'] for a in section['answers']}
    tree_path=next(root/a['path'] for a in state['stages']['YKS-04:full']['artifacts'] if a['path'].endswith('navigation-candidate.json'))
    nano=[]
    for course in read_json(tree_path)['navigation']:
        for unit in course['units']:
            for topic in unit['topics']:
                if topic['sourceExam']=='AYT' and 'nanoteknoloji' in topic['title'].casefold():
                    for asset in topic['assets']:
                        if asset['kind']!='pdf':continue
                        if digest(asset['originalPath'])!=asset['sourceSha256']:raise ValueError('Actual registered nanotechnology topic PDF changed')
                        with pymupdf.open(asset['originalPath']) as doc:
                            pages=[{'page':p.number+1,'text':p.get_text(sort=True)} for p in doc if 'kumaş' in p.get_text(sort=True).casefold()]
                        if pages:nano.append({'subjectId':topic['subjectId'],'categoryId':topic['categoryId'],'sourcePath':asset['originalPath'],'sourceSha256':asset['sourceSha256'],'actualNativePages':pages})
    if {r['subjectId'] for r in nano}!={'fizik','kimya'}:raise ValueError('Both actual registered nanotechnology source scopes must remain explicit')
    results=[]
    for number,(subject,observation) in enumerate(READINGS,1):
        card=cards[number];board=index['boards'][(number-1)//4]
        if card['exam']!='AYT' or digest(card['image'])!=card['imageSha256'] or answers[number]!=card['answer']:
            raise ValueError('Actually read source exam, original image or bound printed answer changed')
        indexed=next(c for c in board['questions'] if c['printedNumber']==number)
        if indexed['imageSha256']!=card['imageSha256']:raise ValueError('Actually read question/board membership changed')
        results.append({'sourceCode':card['code'],'sourceSha256':card['sourceSha256'],'sourceImagePath':card['image'],
            'sourceImageSha256':card['imageSha256'],'sourceTextSha256':card['textSha256'],'physicalPage':card['pdfPage'],
            'printedNumber':number,'sectionId':'AYT:4','exam':'AYT','subjectId':subject,
            'allowedSubjectIds':[subject] if subject else ['fizik','kimya'],
            'status':'ACTUAL_SOURCE_QUESTION_CONTENT_SUBJECT_REVIEWED_FOR_PREPARATION' if subject else 'REGISTERED_CROSS_SUBJECT_NANOTECHNOLOGY_REVIEW_REQUIRED',
            'actualOriginalQuestionImageRead':True,'sourceReading':observation,'viewedBoardPath':board['path'],'viewedBoardSha256':board['sha256'],
            'sourceSubjectAcceptedForPreparation':subject is not None,'sourcePrintedAnswerPreserved':card['answer'],
            'sourceKeyEvidenceSha256':card['keyEvidenceSha256'],'wrongPrintedTytHeaderPreserved':True,
            'categoryAssignmentWritten':False,'newQuestionAdmissionAccepted':False,'teacherApproved':False})
    output={'status':'PASS','scope':'ACTUALLY_READ_40_AYT_SCIENCE_QUESTIONS_WITH_WRONG_TYT_PRINTED_RANGE',
        'sourcePackages':packages,'sourceComparisonSha256':digest(comparison_path),'sourceKeyReportSha256':digest(key_path),
        'providerTreeSha256':digest(tree_path),'questions':40,'actuallyReadOriginalQuestionImages':40,
        'clearSubjectQuestions':39,'subjectCounts':dict(Counter(r['subjectId'] for r in results if r['subjectId'])),
        'ambiguousCrossSubjectQuestions':[13],'nanotechnologyActualRegisteredPdfEvidence':nano,'results':results,
        'toolSha256':digest(Path(__file__)),'newModelCalls':0,'newOcrCalls':0,'sourceWrites':0,'questionBankWrites':0,'teacherApproved':False}
    write_json(folder/'report.json',output);print({k:v for k,v in output.items() if k not in ['sourcePackages','nanotechnologyActualRegisteredPdfEvidence','results']})


if __name__=='__main__':main()
