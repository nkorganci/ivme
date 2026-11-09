"""Compare five actually viewed summary bodies without changing the main queue.

Transcripts are retrieval aids, not replacements for the original graphics.
The old independent key-image reading is reused, never a generated solution.
"""
import argparse
from collections import defaultdict
import hashlib
import json
from pathlib import Path

from yks_birlestirme import Store, read_json, write_json, digest, signature, process_lock
from yks_pilot_kaynaklari import APP
from yks_fizik_ozet_bes_govde import SOURCE, ANSWERS, ACTUALLY_VIEWED_CROP_SHA256
from yks_anahtar_gorsel import checked_reading
from yks_soru_pilotu import compare, live_bank
from yks_gorsel_aday import VisualCandidates
from yks_partiler_arasi_tekrar import body_identity
from yks_bekleyen_tekrar_kontrol import old_location_id, classify_relation

TEXTS = [
    '''1. Hareket ile ilgili verilen bilgilerden hangisi yanlıştır?
A) Bir cismin hızını ve yönünü belirtmek için seçilen noktaya referans noktası denir.
B) Cismi oluşturan parçacıklar, birlikte aynı yönde hareket ediyorsa cisim öteleme hareketi yapmaktadır.
C) Cisim sabit bir nokta etrafında çember çizerek hareket ediyorsa dönme hareketi yapmaktadır.
D) Cisim iki nokta arasında gidip gelme hareketi yapıyorsa titreşim hareketi yapmaktadır.
E) Evrendeki cisimlerin hareketi için sabit bir referans noktası vardır.''',
    '''2. Hareket türleri ile ilgili,
I. Bungee jumping (bangi camping) yapan sporcunun hareketi
II. Bir bowling topunun yuvarlanarak ilerlemesi
III. Saatin yelkovanının hareketi
örneklerden hangileri birden fazla hareket türünü içerir?
A) Yalnız I
B) Yalnız II
C) I ve II
D) II ve III
E) I, II ve III''',
    '''3. İlker ve Ada'nın konumları şekil üzerinde verilmiştir.
İlker, bulunduğu konumdan S yolunu izleyerek Ada'nın bulunduğu yere ulaşıyor. Buna göre;
I. İlker'in aldığı yol S yörüngesinin uzunluğuna eşittir.
II. Ada'nın İlker'e göre konum vektörü Y vektörüdür.
III. İlker'in yer değiştirmesi Y vektörünün uzunluğuna eşittir.
yargılarından hangileri doğrudur?
A) Yalnız I
B) Yalnız II
C) I ve II
D) I ve III
E) I, II ve III''',
    '''4. Defne, Ceren ve Mehmet'in konumları kroki üzerinde verilmiştir. Ceren ve Mehmet bulundukları konumlardan Defne'nin yanına eşit sürelerde gidiyor.
Buna göre, Ceren ve Mehmet'in yer değiştirmelerinin büyüklükleri eşittir.
Mehmet'in sürati Ceren'inkinden büyüktür.
Mehmet'in aldığı yol, Ceren'in aldığı yoldan büyüktür.
yargılarından hangileri doğrudur?
A) Yalnız I
B) Yalnız II
C) I ve III
D) II ve III
E) I, II ve III''',
    '''5. Yarıçapı r = 80 m olan çember şeklindeki pistin A noktasından koşmaya başlayan kişi, 40 saniye sonra B noktasına ulaşıyor.
Buna göre koşucunun sürati ve hızının büyüklüğü kaç m/s'dir? (π = 3 alınız.)
Sürat / Hız
A) 12 / 4
B) 6 / 6
C) 4 / 6
D) 6 / 4
E) 12 / 6''',
]


def current_prepared(root, inputs):
    path = root / 'source-intake-queue/report.json'
    report = read_json(path)
    inputs[str(path)] = digest(path)
    if report['status'] != 'PASS':
        raise ValueError('Current prepared source queue must be valid')
    selected = {r['sourceCode']: r for r in report['results']}
    cards = {}
    for file, sha in report['sourcePackages'].items():
        if digest(file) != sha:
            raise ValueError('Prepared source package changed')
        inputs[file] = sha
        for card in read_json(file)['cards']:
            row = selected.get(card['code'])
            if row and row['sourceImageSha256'] == card['imageSha256'] and row['sourceTextSha256'] == card['textSha256']:
                if hashlib.sha256(card['text'].encode()).hexdigest() != card['textSha256']:
                    raise ValueError('Current prepared text changed')
                if card['code'] in cards and signature(cards[card['code']]) != signature(card):
                    raise ValueError('Conflicting current source versions')
                cards[card['code']] = card
    if set(cards) != set(selected):
        raise ValueError('Every main source must use its current amended version')
    return report, cards


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--compare-bank', action='store_true')
    args = parser.parse_args()
    store = Store(APP / 'veri/yks-birlestirme')
    root = store.child(store.current()['runId'])
    folder = root / 'physics-summary-five-body-comparison'
    folder.mkdir(exist_ok=True)
    inputs = {}

    def load(relative):
        path = root / relative
        inputs[str(path)] = digest(path)
        return read_json(path)

    prep = load('physics-summary-five-body-preparation-v2/report.json')
    if prep['status'] != 'PASS' or not prep['cropImagesActuallyRead'] or digest(prep['package']) != prep['packageSha256']:
        raise ValueError('Five actually opened complete corrected source crops required')
    inputs[prep['package']] = prep['packageSha256']
    raw_cards = read_json(prep['package'])['cards']
    base = load('physics-summary-key-readings/report.json')
    actual = load('physics-summary-key-actual-review/report.json')
    machine = next(r for r in base['results'] if r['sourceSha256'] == SOURCE)
    human = next(r for r in actual['results'] if r['sourceSha256'] == SOURCE)
    expected = [{'number': n, 'answer': a} for n, a in enumerate(ANSWERS, 1)]
    for key in ['crop', 'evidence']:
        path = machine[key + 'Path']
        if digest(path) != machine[key + 'Sha256']:
            raise ValueError('Saved independent key-image evidence changed')
        inputs[path] = machine[key + 'Sha256']
    observed = read_json(machine['evidencePath'])
    if observed['identity']['cropSha256'] != machine['cropSha256']:
        raise ValueError('Independent reading belongs to another source strip')
    if checked_reading(observed['response']) != expected or human['actualPrintedAnswers'] != expected:
        raise ValueError('Actual source and saved independent image reading disagree')
    if digest(human['viewedBoardPath']) != human['viewedBoardSha256'] or human['cropSha256'] != machine['cropSha256']:
        raise ValueError('Actual region reading does not share the same source crop')
    inputs[human['viewedBoardPath']] = human['viewedBoardSha256']
    if len(raw_cards) != len(TEXTS) or digest(raw_cards[0]['sourcePath']) != SOURCE:
        raise ValueError('Complete unchanged five-body cohort required')
    cards = []
    for n, (raw, text) in enumerate(zip(raw_cards, TEXTS), 1):
        if raw['printedNumber'] != n or digest(raw['image']) != ACTUALLY_VIEWED_CROP_SHA256[n - 1]:
            raise ValueError('Actually viewed corrected source image changed')
        if body_identity(text) is None:
            raise ValueError('Retrieval transcript requires a full stem and five distinct options')
        cards.append({**raw, 'code': raw['sourceCode'], 'answer': raw['printedAnswer'],
                      'text': text, 'textSha256': hashlib.sha256(text.encode()).hexdigest(),
                      'textReadingMethod': 'ACTUAL_SOURCE_IMAGE_RETRIEVAL_TRANSCRIPT_NOT_DIAGRAM_RECONSTRUCTION',
                      'sourceStatementMarkersInserted': False, 'independentPrintedKeyReadingReused': True,
                      'independentKeyModelDigest': observed['identity']['modelDigest'],
                      'newQuestionAdmissionAccepted': False, 'teacherApproved': False})
    with process_lock(folder / '.writer.lock'):
        package = folder / 'candidates.json'
        write_json(package, {'cards': cards, 'transcriptsForRetrievalOnly': True,
                             'questionBankWrites': 0, 'teacherApproved': False})
        # Reuse the old original pending observations, not newly extracted text.
        # Freeze the already verified baseline: a later archive of this very
        # batch must not invalidate its pending-source provenance recursively.
        for name in ['archive-report.json', 'manifest.json']:
            baseline = folder / ('baseline-' + name)
            if not baseline.is_file():
                write_json(baseline, read_json(root / 'database-archive' / name))
        archive = load('physics-summary-five-body-comparison/baseline-archive-report.json')
        manifest = load('physics-summary-five-body-comparison/baseline-manifest.json')
        manifest_sha = hashlib.sha256((json.dumps(manifest, ensure_ascii=False, sort_keys=True,
                                                 separators=(',', ':')) + '\n').encode()).hexdigest()
        if archive['status'] != 'PASS' or archive['checkpoint'] != manifest_sha or archive['secondSaveInsertedArtifacts'] != 0:
            raise ValueError('Verified immutable evidence archive required')
        pending_path = root / 'pending-source-reuse/pending-source-observations.json'
        pending = load('pending-source-reuse/pending-source-observations.json')['results']
        frozen = {r['logicalPath']: r['sha256'] for r in manifest['files']}
        if digest(pending_path) != frozen['run/pending-source-reuse/pending-source-observations.json']:
            raise ValueError('Original archived pending observations changed')
        if len(pending) != len({old_location_id(r) for r in pending}):
            raise ValueError('Original pending identities collide')
        intake, prepared = current_prepared(root, inputs)
        groups, old_groups, locations = defaultdict(list), defaultdict(list), defaultdict(list)
        parsed_prepared = parsed_pending = 0
        for card in prepared.values():
            body = body_identity(card['text'])
            if body:
                groups[body['identity']].append(card)
                parsed_prepared += 1
        for old in pending:
            body = body_identity(old['text'])
            if body:
                old_groups[body['identity']].append(old)
                parsed_pending += 1
            if len(old['printedNumbers']) == 1:
                locations[old['sourceSha256'], old['physicalPage'], old['printedNumbers'][0]].append(old)
        results = []
        for card in cards:
            body = body_identity(card['text'])
            matches = groups.get(body['identity'], [])
            related = {old_location_id(r): r for r in locations.get((SOURCE, 1, card['printedNumber']), [])}
            related.update({old_location_id(r): r for r in old_groups.get(body['identity'], [])})
            results.append({'sourceCode': card['code'], 'sourceSha256': SOURCE,
                            'status': 'REVIEW_REQUIRED_NOT_NEW',
                            'preparedBodyCandidates': [r['code'] for r in matches],
                            'originalPendingRelations': [classify_relation(card, old) for old in related.values()],
                            'sourceStatementMarkerReviewRequired': card['sourceStatementMarkerReviewRequired'],
                            'newQuestionAdmissionAccepted': False, 'teacherApproved': False})
        bank_report = folder / 'bank-comparison' / 'bank-comparison.json'
        if args.compare_bank:
            bank_report.parent.mkdir(exist_ok=True)
            compare(cards, bank_report.parent, source_sha=SOURCE,
                    shared_cache_folder=root / 'question-cohort', visual_matcher_factory=VisualCandidates)
        bank, _ = live_bank(APP)
        bank_sha = signature(bank)
        if bank_sha != intake['bankSnapshotSha256']:
            raise ValueError('Current bank differs from the prepared-source baseline')
        bank_comparison = read_json(bank_report) if bank_report.is_file() else None
        if bank_comparison and (bank_comparison['bankSnapshotSha256'] != bank_sha or len(bank_comparison['candidates']) != 5):
            raise ValueError('Five-body bank comparison is stale')
        if any(digest(p) != sha for p, sha in inputs.items()):
            raise ValueError('Frozen source evidence changed during comparison')
        report = {'status': 'PASS', 'scope': 'ONLY_FIVE_SUMMARY_BODIES_NOT_FULL_ARCHIVE_ACCEPTANCE',
                  'questions': 5, 'sourceSha256': SOURCE, 'package': str(package),
                  'packageSha256': digest(package), 'inputs': inputs,
                  'independentKeyReading': 'ACTUAL_SOURCE_REGION_AND_OLD_QWEN_IMAGE_READING_AGREE',
                  'preparedSourcesCompared': len(prepared), 'preparedCompleteFiveOptionBodies': parsed_prepared,
                  'originalPendingCompared': len(pending), 'pendingCompleteFiveOptionBodies': parsed_pending,
                  'results': results, 'bankSnapshotSha256': bank_sha,
                  'bankComparisonPath': str(bank_report) if bank_comparison else None,
                  'bankComparisonSha256': digest(bank_report) if bank_comparison else None,
                  'bankQuestionsCompared': bank_comparison['bankQuestions'] if bank_comparison else 0,
                  'newModelCalls': 0, 'newOcrCalls': 0, 'newSourceRenders': 0,
                  'questionBankWrites': 0, 'noveltyAccepted': False,
                  'newQuestionAdmissionAccepted': False, 'teacherApproved': False,
                  'toolSha256': digest(Path(__file__))}
        write_json(folder / 'report.json', report)
    print({k: v for k, v in report.items() if k not in ['inputs', 'results']})


if __name__ == '__main__':
    main()
