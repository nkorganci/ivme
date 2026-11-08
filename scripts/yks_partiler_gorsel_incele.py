"""Bind actual image readings for 36 unpublished source pairs to immutable bytes.

This is duplicate identity review, not answer correction, fine-topic approval,
teacher review or new-question admission. Both source editions are retained.
"""
from collections import Counter
from pathlib import Path

from yks_birlestirme import Store,read_json,write_json,digest,signature,process_lock
from yks_pilot_kaynaklari import APP
from yks_partiler_arasi_tekrar import body_identity

SOURCE_REPORT='766158da21575c1fa366a9b86c11beeb9bb467227a87060bbba7886817b02fe4'
VIEWED_BOARDS=[
 'ea3ff33467deb53f98b977dbd8e964de8505f417c8b384dc82b562a883c8515c',
 'caa2abe5f24f8f1350b7bd5819c8da58e1aff0d6cea5e43a946c41afc9d24d55',
 'cd1bf7329a10c77ed15ec78dd8b25ae18a4905a4fa115d7d845c8ea6b9bda4f3',
 '83b66305db59daa13ab98e4c6f639d896d86d6bcb3ee77363a76834b41d3d1f5',
 '0040e78d2e5e03c7882d0fd8ae4b8ab7448aed73eede79e68579d18fe34a07b3',
 '1a63953091f8d979fd088524a0378c25eb312970578b13d0154e72d2b7fe13e7',
 '398b86af5cff4b902aab6f0954d3a1105e58765fade6def4948f49096c0c86f7',
 '9e175e7860b82f9cc0adbd41ad2e2db083539204cbe88a5a079642ca2e66626a',
 '0ce7884380605748d8c2f8f1d816149239b3f6e5201bf12510feeb3500ac71a6',
 '2e21edfe527e02f02f4ba1eebd1d08c7d75ba5fa0b0f3e3d1dbf1e95e1074f57',
 '7d4eb417796888cf3c6a9574599ba590441d2f53e1899951a324be71bc99a06f',
 'c0830493780c69e9d26f6974c087a3987b6fde183ef69e0268f8d30b66df9a43',
]
READINGS=[
 'Toplumsal değişim paragrafı ve vurgulanmaktadır kökü aynıdır; beş seçenek ve D konumu aynıdır; ek şekil yok.',
 'Cömertlik ve Hadid7 paragrafı, ulaşılamaz alt çizgisi, A-E seçenekleri iki görüntüde aynıdır.',
 'Genç hekim/el-Kanun fi’t-Tıp paragrafı ve beş âlim seçeneği aynıdır; seçeneklerin satıra dağılımı farklıdır.',
 'GDO/sağlık/etik paragrafının tamamı, ulaşılamaz olumsuz kökü ve beş seçenek aynıdır.',
 'Mahremiyet tanımı ve beş hak seçeneği aynıdır; gövdeyi değiştiren çizim yoktur.',
 'Hucurat6 güvenilir haber alıntısı, vurgu kökü ve beş seçenek iki görüntüde aynıdır.',
 'Yanan mum/Hatice/Mümin39 kökü aynıdır; ilk iki seçenek A/B yer değiştirmiştir; diğer üç seçenek aynıdır.',
 'İslamofobi sebepleri değildir kökü ve A-E içeriği aynıdır; olumsuzluk her iki görselde korunur.',
 'Enam76-77 yıldız/batanlar/Rabbim alıntısı ve beş peygamber seçeneği aynıdır.',
 'Tasavvuf/ahlaki arınma paragrafı, değildir alt çizgisi ve A-E seçenekleri aynıdır; pilot q4 korunmalıdır.',
 'Aşırılık ve eksik/ihmalkâr davranış boşlukları ile beş kavram çifti aynı sıradadır.',
 'İşveren/işçi sorumluluğu paragrafı ve ilişkilendirilemez alt çizgisi aynı; beş seçenek aynı sıradadır.',
 'Dinin bireysel/toplumsal kapsamı ve ahiret sorumluluğu paragrafı, söylenemez ve A-E aynıdır.',
 'Hinduizm yanlıştır kökü ve beş iddianın tamamı aynı sıradadır.',
 'Budizm/iyi alışkanlıklar/kararlılık paragrafı ve beş doğru-yol seçeneği aynı sıradadır.',
 'Helal kazanç paragrafı, ilgili değildir alt çizgisi ve beş ayet/hadis seçeneği aynı sıradadır.',
 'Yunus5 güneş/ay/menziller alıntısının tamamı ve Tıp/Felsefe/Astronomi/Coğrafya/Tarih seçenekleri aynıdır.',
 'Kan-doku-organ nakli paragrafı, şartlardan değildir alt çizgisi ve beş koşul aynı sıradadır.',
 'Eşyada ibaha sanat kökü aynıdır; müzik ve mimari A/C yer değiştirir; heykel D iki kaynakta da aynı içeriktedir.',
 'Yi King/Lao-tzu/Bodhgaya/Wu-wei/Yin ve Yang/Tao Te King listesi ve 2-6 sayılı seçenekler aynıdır; anahtarlar C/D çelişir.',
 'Din16-20 yönergesi ve Anıl Bey altı D/Y önermesi aynıdır; beş D/Y dizisi aynı, sadece dizgi/kalınlık ve boşluk farklıdır.',
 'Alevi Bektaşi ölüm/defin kökü aynı; Anma/Taziye B/C yer değiştirir; diğer içerikler aynıdır.',
 'Yasak yiyecek/içecek ve irade/ahlaki denge paragrafı, ulaşılamaz ve A-E aynıdır.',
 'Konfüçyanizm dört ritüel/sembol önermesi ve I-IV seçeneklerinin tamamı aynı sıradadır.',
 'Rahman19-20 iki deniz/tuzluluk paragrafı aynı; A/C/E seçenekleri yer değiştirmiş, bütün seçenek içerikleri korunmuştur.',
 'Taoizm ilkeleri/ritüelleri söylenemez kökü ve beş seçenek aynı sıradadır.',
 'Ömer/Sevde/İhsan/Betül imanın mahiyeti önermeleri aynı; B/D/E seçenekleri çevrilmiş, C içeriği aynı kalmıştır.',
 'Gıda/helal kazanç/israf paragrafı, ulaşılamaz alt çizgisi ve A-E aynı sıradadır.',
 'Bakara177 erdem/infak/ahde vefa alıntısı, sayılmamıştır ve beş özellik aynı sıradadır.',
 'Vahiy/derin bilgi/güven/fiil dört tanımı ve dışta kalır kökü aynı; beş kavramın içeriği ve sırası aynıdır.',
 'Budizm dört önerme (Bodhi elma iddiası dahil) ve I-IV seçenekleri aynıdır; iddia düzeltilmeden kaynak korunur.',
 'Duyu/akıl/vahiy bilgi paragrafı ve en kapsamlı yargı kökü ile A-E aynı sıradadır.',
 'Dini emirler/yarar/zarar paragrafı ve örnek gösterilemez kökü aynı; beş ayet seçeneği aynıdır.',
 'Ali İmran104 hayra çağırma alıntısı ve beş kavram aynı sıradadır.',
 'Selim akıl/keşif/ilham/salim duyu/rüya/mütevatir haber listesi ve beş I-VI seçeneği aynı sıradadır.',
 'Mülkiyet/emanet/sorumluluk paragrafı, ulaşılamaz alt çizgisi ve beş seçenek aynı sıradadır.',
]


def permutation(left,right):
    a=body_identity(left);b=body_identity(right)
    if not a or not b or a['identity']!=b['identity']:raise ValueError('Actually read pair no longer has the same complete stem and options')
    return {k:next(letter for letter,value in b['options'].items() if value==option) for k,option in a['options'].items()}


def select_preferred(members):
    # This is a preferred source locator, never a newly invented bank ID.
    pilot={'mebi-05ed1fe27201-q1','mebi-05ed1fe27201-q2','mebi-05ed1fe27201-q4'}
    existing=[m['sourceCode'] for m in members if m['sourceCode'] in pilot]
    if existing:return existing[0]
    return min(members,key=lambda m:('din-book-' in m['sourceCode'],m['sourceCode']))['sourceCode']


def main():
    store=Store(APP/'veri/yks-birlestirme');root=store.child(store.current()['runId']);folder=root/'cross-source-candidates'
    path=folder/'report.json';report=read_json(path)
    if digest(path)!=SOURCE_REPORT or len(report['results'])!=36:raise ValueError('The actually read source-pair set changed; extend explicit readings first')
    boards=read_json(folder/'actual-review-boards/index.json')['boards']
    if len(boards)!=len(VIEWED_BOARDS):raise ValueError('Actually read image-board scope differs')
    for board,sha in zip(boards,VIEWED_BOARDS):
        if digest(board['path'])!=sha or board['sha256']!=sha:raise ValueError('Actually read image-board bytes changed')
    cards={}
    for file,sha in report['sourcePackages'].items():
        if digest(file)!=sha:raise ValueError('Source package changed after actual image readings')
        cards.update({c['code']:c for c in read_json(file)['cards']})
    results=[]
    with process_lock(folder/'.actual-review-writer.lock'):
        for index,(cluster,observation) in enumerate(zip(report['results'],READINGS)):
            members=cluster['members'];board=boards[index//3]
            if len(members)!=2 or cluster['clusterId'] not in board['clusterIds']:raise ValueError('Actual board pair membership differs')
            a,b=[cards[m['sourceCode']] for m in members]
            for m,c in zip(members,[a,b]):
                if digest(c['image'])!=m['imageSha256'] or c['answer']!=m['printedAnswer']:raise ValueError('Actually read original question bytes or printed key changed')
            mapping=permutation(a['text'],b['text']);agree=mapping[a['answer']]==b['answer']
            if agree!=cluster['sameCorrectOptionContent']:raise ValueError('Printed correct-option mapping differs from original source report')
            if not agree and index!=19:raise ValueError('New unresolved printed answer conflict outside actual review')
            preferred=select_preferred(members)
            results.append({'clusterId':cluster['clusterId'],'status':'ACTUAL_IMAGES_AND_MAPPED_PRINTED_KEYS_PROVE_DUPLICATE_SOURCE_QUESTION' if agree else
                'ACTUAL_IMAGES_SAME_BODY_PRINTED_KEYS_CONFLICT_EXCLUDE_BOTH_FROM_NEW_INTAKE',
                'sourceCode':preferred,'sourceSha256':next(m['sourceSha256'] for m in members if m['sourceCode']==preferred),
                'members':members,'leftToRightOptionMapping':mapping,'printedCorrectOptionAgrees':agree,
                'actualImagePairRead':True,'sourceReading':observation,'viewedBoardPath':board['path'],'viewedBoardSha256':board['sha256'],
                'reviewMethod':'EXECUTING_AGENT_VIEWED_BOTH_ORIGINAL_QUESTION_IMAGES_AND_ALL_OPTIONS',
                'preferredSourceLocator':preferred if agree else None,'newCanonicalBankCode':None,
                'maximumCanonicalQuestionsForGroup':1 if agree else 0,'allSourceEditionsRetained':True,
                'newQuestionAdmissionAccepted':False,'fineTopicAccepted':False,'teacherApproved':False})
        output={'status':'PASS','scope':'ACTUAL_SOURCE_PAIR_DUPLICATE_IDENTITY_AND_PRINTED_OPTION_MAPPING_ONLY',
            'sourceReportSha256':SOURCE_REPORT,'sourcePairs':len(results),'sourceQuestionImagesRead':72,
            'states':dict(Counter(r['status'] for r in results)),'optionPermutedPairs':sum(any(k!=v for k,v in r['leftToRightOptionMapping'].items()) for r in results),
            'toolSha256':digest(Path(__file__)),'newModelCalls':0,'newOcrCalls':0,'questionBankWrites':0,'sourceWrites':0,
            'teacherApproved':False,'results':results}
        write_json(folder/'actual-image-pair-review.json',output)
    print({k:v for k,v in output.items() if k!='results'})


if __name__=='__main__':main()
