"""Record 44 original crops actually read, without publishing questions."""
from pathlib import Path

from yks_birlestirme import Store, read_json, write_json, digest, signature
from yks_pilot_kaynaklari import APP

ACTUALLY_READ_CROP_SET = 'd811add6993ccf1635ae561d80d4de0edcb85d3d29b3715e752c2bb7547eb977'
ACTUALLY_READ_BOARD_SET = 'b0c0fb524994706a65907aa2c26e7d550701ffeb203277f8c2c2a9b489daa062'
NOTES = {
    '04fdf86a4666': 'Q2 joins left-bottom stem/diagram to right-top demand and all five options. Q3 options are separate from adjacent answer strip.',
    '070224b62912': 'Q1 three Bernoulli statements; Q2 pipe/mercury figure; Q3 three barometer figures and all five height comparisons.',
    '0779d445ea83': 'Q1 both force diagrams; Q2 graph and both spring arrangements; Q3 force/displacement graph. Decorative spring photo is outside question.',
    '0843dee78582': 'Q1 magenta area near ratio and Q3 magenta epsilon retained from source; Q2 all five field comparisons. Annotation/content concerns remain held.',
    '0da131857153': 'Two gravity/free-fall statement questions; both full three-statement lists and five options retained.',
    '1090da3956e7': 'Two specific-heat tasks; Q1 definition and five concepts; Q2 water/alcohol stem and five full statements.',
    '10f0e486b987': 'Q1 position-time graph; Q2 restores angular-speed demand/options from right-column top. Q3 malformed/misplaced symbols are in original and remain held.',
    '116697578de4': 'Q2/Q3 opened individually after correction. All letters and diagrams visible; no neighboring Q3 ink in Q2 and no key ink in Q3. Six native bounding-box intersections remain explicit geometric exceptions, not zero native cuts.',
    '17cc07ec3ed7': 'Only two Physics bodies use C/E strip. Yellow highlights and note icons retained. Three History bodies with inline E/D/A are outside this Physics package.',
    '18845c01fe46': 'Q1 includes diagram above printed number and original header; Q2 full charge statements; Q3 +2q/-7q and 2r/3r source figure retained.',
    '1a7a2b87f7a6': 'Q1 complete K/L/M energy table; Q2 graph heading above number retained; Q3 full three-statement insulation list.',
    '1b5fff0a8d3f': 'Q1 6m label retained at right edge; Q2 full I/II/III wire figure above printed number; Q3 triangular cutout and five fractions retained.',
    '1deb33fc2967': 'Q1 explicitly asks single-slit diffraction despite double-slit source title; Q2 keeps full arrows/diagram and three double-slit statements. Source title alone cannot assign fine topic.',
    '1deb72c0fd0c': 'Both shadow diagrams and all five graphical/statement options retained; no source-answer strip in crops.',
    '291086f828ca': 'Q1 circular/linear joint figure; Q2 joins left spring diagram with right-top continuation. Original malformed a symbol in word harmonic remains held. Q3 corrected top independently opened, neighboring demand ink removed; Q4 full three statements.',
    '2c2a13bb27dc': 'Q1 plane-reflector grid with K/L/M/N/P points; Q2 both reflectors/angles and all five drawings; Q3 concave-reflector source and all five wavefront options retained.',
}


def verify_crop_set(cards):
    actual = {c['sourceCode']: digest(c['image']) for c in cards}
    if len(actual) != 44 or signature(actual) != ACTUALLY_READ_CROP_SET:
        raise ValueError('Actually read crop cohort changed; fresh actual image review required')
    if any(actual[c['sourceCode']] != c['imageSha256'] for c in cards):
        raise ValueError('Saved source image hash differs')


def main():
    store = Store(APP / 'veri/yks-birlestirme')
    root = store.child(store.current()['runId'])
    folder = root / 'physics-summary-bound-bodies'
    source = folder / 'report.json'
    report = read_json(source)
    cards = []
    inputs = {str(source): digest(source)}
    for row in report['results']:
        if digest(row['package']) != row['packageSha256']:
            raise ValueError('Source-bound preparation changed')
        inputs[row['package']] = row['packageSha256']
        cards.extend(read_json(row['package'])['cards'])
    verify_crop_set(cards)
    boards = sorted(folder.glob('crop-board-*.png'))
    if len(boards) != 15 or signature([digest(p) for p in boards]) != ACTUALLY_READ_BOARD_SET:
        raise ValueError('Actually read contact sheets changed')
    results = []
    for card in cards:
        prefix = card['sourceSha256'][:12]
        if prefix not in NOTES:
            raise ValueError('Unknown actual source review')
        concerns = card['sourceConcerns']
        results.append({'sourceCode': card['sourceCode'],
            'sourceSha256': card['sourceSha256'], 'printedNumber': card['printedNumber'],
            'printedAnswer': card['printedAnswer'], 'image': card['image'],
            'imageSha256': card['imageSha256'], 'sourceRegions': card['sourceRegions'],
            'status': 'ORIGINAL_CROP_AND_PRINTED_KEY_BINDING_ACTUALLY_READ',
            'actualReadingNote': NOTES[prefix], 'sourceConcerns': concerns,
            'nativeGeometryExceptions': card['nativeGeometryExceptions'],
            'preparedCropActuallyRead': True, 'visibleBodyOptionCuts': 0,
            'originalSourcePixelsEqual': card['pixelProof']['sourceAndPreparedPixelsEqual'],
            'questionContentAccepted': False, 'fineTopicAccepted': False,
            'newQuestionAdmissionAccepted': False, 'teacherApproved': False})
    known_sources = {c['sourceSha256'] for c in cards}
    for previous, count in [('physics-summary-discovery/report.json', 3),
                            ('physics-summary-five-body-preparation-v2/report.json', 5)]:
        previous_path = root / previous
        proof = read_json(previous_path)
        if proof['questions'] != count or proof.get('questionBankWrites'):
            raise ValueError('Previous bounded source preparation changed')
        known_sources.add(proof['sourceSha256'])
        inputs[str(previous_path)] = digest(previous_path)
    key_path = root / 'physics-summary-effective-key-regions/report.json'
    keys = read_json(key_path)
    inputs[str(key_path)] = digest(key_path)
    remaining = [r for r in keys['results'] if r['contiguousPrintedNumbers'] and r['sourceSha256'] not in known_sources]
    remaining_path = folder / 'remaining-sources.json'
    write_json(remaining_path, {'scope': 'CONTIGUOUS_PRINTED_KEY_SOURCES_WITHOUT_EXPLICIT_BODY_BINDINGS',
        'results': remaining, 'teacherApproved': False, 'questionBankWrites': 0})
    output = {'status': 'PASS', 'scope': 'FORTY_FOUR_ACTUALLY_READ_CROPS_ONLY',
        'documents': report['documents'], 'questions': len(results), 'results': results,
        'inputs': inputs, 'actualContactSheetsRead': 15,
        'additionalIndividualCropsRead': ['physics-summary-116697578de4-q2', 'physics-summary-116697578de4-q3', 'physics-summary-291086f828ca-q3'],
        'supersededQ2ImageOnBoard7NotAccepted': True,
        'supersededQ3ImageOnBoard14NotAccepted': True,
        'actualContactSheets': [{'path': str(p), 'sha256': digest(p)} for p in boards],
        'visibleBodyOptionCuts': 0, 'nativeGeometryIntersectionsRetained': report['nativeLineCuts'],
        'sourceContentReviewQuestions': [r['sourceCode'] for r in results if any(
            'REVIEW_REQUIRED' in note for note in r['sourceConcerns'])],
        'mixedPageHistoryInlineQuestionsNotBoundToPhysics': 3,
        'remainingContiguousSummaryDocuments': len(remaining),
        'remainingPrintedKeyCells': sum(len(r['printedRegionAnswers']) for r in remaining),
        'remainingSources': str(remaining_path), 'remainingSourcesSha256': digest(remaining_path),
        'printedNumberGapSourceRemainsHeld': True,
        'mainPreparedQueueUnchanged': 12052, 'questionBankWrites': 0,
        'fullStageAccepted': False, 'teacherApproved': False, 'toolSha256': digest(Path(__file__))}
    write_json(folder / 'actual-crop-review.json', output)
    print({k: v for k, v in output.items() if k not in ['results', 'inputs', 'actualContactSheets']})


if __name__ == '__main__':
    main()
