"""Keep actual 34 candidate-image readings, including two source variants."""
from pathlib import Path

from yks_birlestirme import Store, read_json, write_json, digest, signature
from yks_soru_pilotu import APP, live_bank

COMPARISON = 'd0147dd107b06195efcdb7fe964587580ddc49c04acb5477f36ac9003ad8218a'
BOARDS = ['36ea81d039c6ba554def4a7935015010e256748818e3929369461bac91baa472',
          '5bfe7ef94081b0e7305bc24a28e36bd016c1cd320f2d8713b89cbb4c3b648780',
          '743b293e9461d87f0c626f55288444a16f0974929f7d7c1620e7112c8c8104d6',
          '95f7f78b18b66a8f3de16433f0776706792c01460c756a3975189018f70180d2']
READINGS = {
    'mt-ayt-felsefe-grubu-11-14': 'Düzenli uyku ve dikkat süresinden tümdengelim sorusu; kaynak hareket tanımlarıdır.',
    'mt-tyt-fizik-02-06': 'Vantilatör, matkap ve bozuk yoldaki araba için üç hareket yargısı; kaynak beş tanımdan yanlışı sorar. Aynı kavram, farklı kök ve seçenekler.',
    'sb-26187': 'K makarası, L dişlisi ve M tekerleğinin dönme/ötelemesi çizilmiş; kaynak beş tanımın yanlışını sorar.',
    '3a-tyt-turkce-111-09': 'Yaşlı adam cümlesinde sözde özne sorusu; kaynak bungee/bowling/saat hareketidir.',
    'TYT-0411': 'Yağış-sıcaklık grafiğinden il merkezi sorusu; kaynak hareket türlerini sorar.',
    'sb-25825': 'Çevreye zararlı madde uyarı simgesi; kaynakların hareket/yer değiştirme kökü ve çizimleri yok.',
    'sb-25911': 'Al/Ag elektrokimyasal pilin anot/katot yargıları; hareket veya yer değiştirme sorusu değildir.',
    'sb-26128': 'X/Y/Z tablosunda iyonlaşma enerjileri; kaynak hareket türleri değildir.',
    'sb-26273': 'İyonlaşma enerjisi/atom numarası grafiği; kaynak hareket türleri değildir.',
    'sb-26429': 'Elektrolizin genel özellikleri için üç yargı; kaynak bungee/bowling/saat örnekleridir.',
    'sb-26440': 'Suyun elektrolizindeki gaz ve elektrolit miktarları; kaynak hareket türleridir.',
    'sb-26585': 'Karbon tetraklorürün formülü/özellikleri; kaynak hareket türleridir.',
    'sb-28708': 'Açısal momentum kuantum sayısında orbital yargıları; kaynak günlük hareket örnekleridir.',
    'sb-25917': 'Elektrokimyasal pilde tuz köprüsünün işlevleri; kaynak konum/yer değiştirme çizimi veya hareket türleridir.',
    'sb-26174': 'Al/Ag pil potansiyeli, pH ve su ekleme yargıları; kaynak İlker/Ada veya kroki sorusudur.',
    'sb-26432': 'Erimiş NaCl elektrolizi ve elektrot tepkimeleri; kaynak konum/kroki sorusudur.',
    'sb-26536': 'CH4 Lewis yapısı, hibritleşmesi ve geometrisi; kaynak konum/kroki sorusudur.',
    'sb-26570': 'BF3 molekül geometrisi ve bağ açısı; kaynak konum/kroki sorusudur.',
    'sb-6861': 'XY2 çözünürlük çarpımı ve iyon derişimleri; kaynak konum/yer değiştirme sorusudur.',
    '3d-tyt-08-02': 'Yarım çemberde r=50 m ve 25 saniye; kaynak r=80 m ve 40 saniyedir. İki değer aynı 1,6 katsayısıyla değişmiş, beş sürat/hız seçeneği farklı sıralanmıştır. Aynı soru kimliği değil, kaynak varyantı.',
    'dd-tyt-fizik-13-06': '80x60 m dikdörtgen pistte 100 saniyede 3/2 tur ve yalnız ortalama sürat; kaynak 80 m yarıçaplı yarım çemberde 40 saniyede sürat ve hız büyüklüğüdür.',
    'sb-19958': 'Farelerde çiçek hastalığı metninden genetik eleştiriyi destekleyen açıklama; kaynak çembersel pist sorusudur.',
    'sb-88250': 'Yarım çemberde r=50 m ve 25 saniye; kaynak r=80 m ve 40 saniyedir. Ölçekli sayı varyantıdır; seçeneklerin aynı doğru sayısal sonucu taşıması kök eşitliği veya ID birleştirme kanıtı değildir.',
    'yk-matematik-tyt-test-06-01-06': 'Yusuf/Deniz ok atışlarında 12/7/4 puanlı hedef tahtası; kaynak pistte hareket sorusudur.',
}
VARIANTS = {'3d-tyt-08-02', 'sb-88250'}


def main():
    store = Store(APP / 'veri/yks-birlestirme')
    root = store.child(store.current()['runId'])
    folder = root / 'physics-summary-five-body-comparison'
    comparison_path = folder / 'bank-comparison/bank-comparison.json'
    if digest(comparison_path) != COMPARISON:
        raise ValueError('Actually read bank-candidate scope changed')
    comparison = read_json(comparison_path)
    boards_path = folder / 'bank-review-boards.json'
    boards = read_json(boards_path)
    if boards['comparisonSha256'] != COMPARISON or [b['sha256'] for b in boards['boards']] != BOARDS:
        raise ValueError('Actually viewed candidate image boards differ')
    images = {}
    for board in boards['boards']:
        if digest(board['path']) != board['sha256']:
            raise ValueError('Actually viewed board changed')
        for member in board['members']:
            if digest(member['path']) != member['sha256']:
                raise ValueError('Actually viewed original bank image changed')
            images[member['code']] = member
    if set(images) != set(READINGS):
        raise ValueError('Every retrieved canonical image must have a real reading')
    package_path = folder / 'candidates.json'
    cards = {c['code']: c for c in read_json(package_path)['cards']}
    bank, _ = live_bank(APP)
    if signature(bank) != comparison['bankSnapshotSha256']:
        raise ValueError('Bank changed after actual image readings')
    bank_by_code = {q['code']: q for q in bank}
    rows = []
    for row in comparison['candidates']:
        card = cards[row['sourceCode']]
        if digest(card['image']) != card['imageSha256']:
            raise ValueError('Actual source image changed')
        for code in sorted({x['code'] for key in ['textMatches', 'visualMatches'] for x in row[key]}):
            image = images[code]
            if bank_by_code[code]['stamp'] != image['version'] or bank_by_code[code]['correct_answer'] != image['answer']:
                raise ValueError('Canonical source version or answer changed')
            variant = card['printedNumber'] == 5 and code in VARIANTS
            rows.append({'sourceRelationId': card['code'] + '::' + code,
                         'sourceCode': card['code'], 'sourceSha256': card['sourceSha256'],
                         'canonicalCandidateCode': code,
                         'status': 'SOURCE_NUMBER_AND_OPTION_VARIANT_KEEP_SEPARATE' if variant else 'ACTUAL_DIFFERENT_QUESTION_BODY_OR_DIAGRAM_KEEP_SEPARATE',
                         'actualReading': READINGS[code], 'viewedBankImagePath': image['path'],
                         'viewedBankImageSha256': image['sha256'], 'canonicalVersion': image['version'],
                         'sourcePrintedAnswer': card['answer'], 'canonicalAnswerPreserved': image['answer'],
                         'sourceImagePath': card['image'], 'sourceImageSha256': card['imageSha256'],
                         'sameQuestionAccepted': False, 'oldIdsMerged': False,
                         'noveltyAccepted': False, 'newQuestionAdmissionAccepted': False, 'teacherApproved': False})
    if len(rows) != 34 or sum(r['status'] == 'SOURCE_NUMBER_AND_OPTION_VARIANT_KEEP_SEPARATE' for r in rows) != 2:
        raise ValueError('Actually read relation/variant scope differs')
    write_json(folder / 'actual-bank-image-review.json', {
        'status': 'PASS', 'scope': 'ONLY_34_RETRIEVED_IMAGE_RELATIONS_NOT_MANUAL_REVIEW_OF_WHOLE_BANK',
        'sourceQuestions': 5, 'sourceCandidateRelationsActuallyRead': len(rows),
        'distinctCanonicalImagesActuallyRead': len(images), 'sourceVariantRelations': 2,
        'sourcePackageSha256': digest(package_path), 'comparisonSha256': COMPARISON,
        'bankSnapshotSha256': comparison['bankSnapshotSha256'], 'results': rows,
        'externalEvidenceFiles': {m['path']: m['sha256'] for m in images.values()},
        'inputs': {str(boards_path): digest(boards_path)},
        'questionBankWrites': 0, 'oldIdsMerged': False, 'noveltyAccepted': False,
        'newQuestionAdmissionAccepted': False, 'teacherApproved': False,
        'toolSha256': digest(Path(__file__))})
    print({'status': 'PASS', 'imageRelations': len(rows), 'distinctImages': len(images), 'variantsKeptSeparate': 2})


if __name__ == '__main__':
    main()
