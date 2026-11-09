"""Incremental original summary body bindings after the frozen first 44 crops.

All positions below were read on the original saved 100-DPI pages. Source
defects are recorded explicitly. This does not admit or publish questions.
"""
from pathlib import Path

from yks_birlestirme import Store, read_json, write_json, digest, signature
from yks_pilot_kaynaklari import APP

REVIEWS = [
    (18, '63d2ecfbba0fac7eeda196354c15d2cab00502c860c9ecc1b1e95f7d3665ce7e', (1300, 1003),
     [[[498, 364, 869, 731]], [[498, 738, 869, 990], [878, 359, 1245, 477]], [[878, 484, 1245, 961]]],
     'CDC', {1: ['SOURCE_YELLOW_ANNOTATION_PRESERVED'], 2: ['CONTINUES_AT_TOP_OF_RIGHT_COLUMN'],
             3: ['SOURCE_MAGENTA_OPTION_BACKGROUND_REVIEW_REQUIRED']}),
    (19, '10b0d0f26a82222db871570e4b5729015132d594828cbf293eedc3961ffad9ab', (1300, 775),
     [[[598, 211, 916, 483]], [[598, 487, 916, 739]], [[944, 169, 1263, 452]], [[927, 452, 1263, 697]]],
     'DDBB', {}),
    (20, 'ccfa5f00049706e51a8d7ce608c15f1b34d1a398248a7ee16c4819f91bca86b7', (1300, 1015),
     [[[869, 50, 1063, 184]], [[1066, 50, 1256, 161]]], 'CB', {}),
    (21, 'e35d72159e8bc04320c41a1de38d64fc28e3949a3e36623ed01ce1e8dcdcef9f', (1300, 1112),
     [[[870, 359, 1267, 535]], [[870, 541, 1267, 754]], [[870, 760, 1267, 1065]]], 'CBD', {}),
    (22, 'e8a5186e5cb3ff8aa6be332eb99497c1983e6a999e1270c1e2a12f8d0f218674', (1300, 830),
     [[[614, 211, 1243, 324], [614, 330, 934, 440]], [[614, 447, 934, 766]], [[937, 330, 1247, 768]]],
     'AEE', {1: ['QUESTION_FIGURE_SPANS_BOTH_QUESTION_COLUMNS'],
             3: ['SOURCE_MAGENTA_WORD_BACKGROUND_AND_YELLOW_NOTE_PRESERVED_REVIEW_REQUIRED']}),
    (23, '7752a924393f886ea0dbd429a6313fa3818de51f171b9eec9b15246ffc56ad2c', (1300, 861),
     [[[1030, 214, 1254, 387]], [[1030, 398, 1254, 541]], [[1030, 551, 1254, 782]]],
     'ABD', {1: ['SOURCE_KEY_CONTENT_CONSISTENCY_REVIEW_REQUIRED'],
             2: ['SOURCE_REFERENCED_TEMPERATURE_HEAT_GRAPH_NOT_VISIBLE_HOLD']}),
    (24, '4d23019c47e6a1b86688ca4bb860bed4ce8bf0001b659bf8599f1f5ecd305f61', (1297, 1106),
     [[[783, 217, 1256, 593]], [[783, 593, 1256, 818]],
      [[783, 821, 1256, 956], [783, 956, 1102, 1052]]], 'CCC', {3: ['OPTIONS_BESIDE_KEY_REQUIRE_SEPARATE_ORIGINAL_REGION']}),
    (25, '86c3250edf5092651d1a527beff279203aad7a0a694065e8d41d32c2b537c8f1', (1300, 664),
     [[[585, 197, 913, 433]], [[585, 440, 913, 640], [919, 198, 1254, 356]], [[919, 363, 1254, 613]]],
     'DDA', {2: ['CONTINUES_AT_TOP_OF_RIGHT_COLUMN'], 3: ['SOURCE_OPTION_A_FRACTION_DENOMINATOR_MISSING_HOLD']}),
    (26, '8719237361c9ea9bb0a0a0bcbb72477d4003f761c066485904d2c914e672b6f1', (1300, 1038),
     [[[618, 504, 1251, 708]], [[618, 719, 1251, 966]]], 'BD',
     {1: ['SOURCE_FIVE_OPTIONS_NOT_PRINTED_HOLD', 'SOURCE_FULL_YELLOW_PANEL_PRESERVED'],
      2: ['SOURCE_OPTIONS_DO_NOT_MATCH_REQUESTED_NUMERIC_RATIO_HOLD', 'SOURCE_FULL_YELLOW_PANEL_PRESERVED']}),
    (27, 'd93d39d58eb6614976485bd5e2eaf3adf77c434e0fb745abcbffebf7ae0b7a9b', (1300, 971),
     [[[462, 525, 858, 739]], [[462, 742, 858, 944], [877, 160, 1258, 307]],
      [[877, 316, 1258, 612]], [[255, 797, 433, 941], [877, 624, 1258, 917]]], 'ECED',
     {2: ['CONTINUES_AT_TOP_OF_RIGHT_COLUMN'], 4: ['REFERENCED_NAIL_DIAGRAM_FROM_LEFT_TEACHING_PANEL_ATTACHED']}),
    (28, '0025e99f4770255d31b5dbb5d89b98d7dc3766c34e3c0710e7aefde47bb4c3a7', (1300, 1110),
     [[[983, 847, 1257, 913]], [[983, 917, 1257, 1047]]], 'DE', {}),
    (29, '7ef342af1a6b0ac0f8f0f7c09d6612bb13b1987b057a31a6ffa6786271f96370', (1286, 1194),
     [[[433, 346, 707, 1035]], [[716, 346, 982, 1035]], [[997, 346, 1249, 1035]]], 'CEE',
     {1: ['SOURCE_T1_T2_GRAPH_LABELS_AND_STEM_RELATION_REVIEW_REQUIRED']}),
    (30, '6dd088a28dc03f8917fdc5ba475428658441356aef6f15d5e3905d2052303453', (1300, 1163),
     [[[876, 844, 1059, 987]], [[876, 993, 1059, 1135], [1065, 844, 1258, 903]], [[1065, 911, 1258, 1135]]],
     'ADE', {1: ['SOURCE_300_MM_AND_PRINTED_FREQUENCY_OPTIONS_CONSISTENCY_HOLD'], 2: ['CONTINUES_AT_TOP_OF_RIGHT_COLUMN']}),
    (32, 'a88747670b744f2e70daea9adc62fb44d1ff082c1f51e6c00a4b7018421acb2b', (1300, 1067),
     [[[909, 66, 1252, 434]], [[909, 434, 1252, 791]], [[909, 794, 1252, 1030]]], 'CCB',
     {2: ['SOURCE_MAGENTA_FIGURE_HEADER_BACKGROUND_REVIEW_REQUIRED']}),
    (33, '62048e955ece2906d419f57c4fcb52ed4100b7865efad75cc7cddd3ae0dee229', (1295, 963),
     [[[738, 220, 990, 562]], [[738, 567, 990, 887], [1001, 220, 1245, 363]], [[1001, 364, 1245, 848]]],
     'EEC', {2: ['CONTINUES_AT_TOP_OF_RIGHT_COLUMN']}),
    (34, 'c72318ac3a748b53712f4c36022345b214449ff7396407b3c92aeb81a4a41565', (1300, 1146),
     [[[980, 78, 1256, 219]], [[980, 227, 1256, 330]], [[980, 330, 1256, 466]]], 'ECC', {}),
    (35, '8162f65c5997fbfb1d998dcac5afe07a9e7b31a2fc04d891bcf3fbcbd8df1e82', (1300, 975),
     [[[1014, 206, 1257, 615]], [[1014, 624, 1257, 933]]], 'BA', {}),
    (36, '7abae49c6f62fe5191dfb00b89984cd32c9a0d134713160eed36258e697877b4', (993, 750),
     [[[313, 208, 639, 498]], [[645, 182, 977, 718]], [[325, 515, 628, 723]]], 'CBA',
     {2: ['QUESTION_FIGURE_ABOVE_PRINTED_NUMBER_RETAINED']}),
    (37, '5138fecb57c604b62e42e0ed738bcace687d4604cedab8db2138e66affcdacae', (1268, 1099),
     [[[946, 226, 1236, 505]], [[946, 511, 1236, 779]], [[946, 784, 1236, 997]]], 'ACC', {}),
    (38, 'eb6adb82cb4e8ed95fe228c9fee240a9938ec517d6201d7824031e2b000eb20b', (1300, 1120),
     [[[618, 211, 924, 413]], [[618, 434, 924, 810]], [[618, 817, 924, 1079], [943, 205, 1252, 363]],
      [[943, 370, 1252, 553]], [[943, 564, 1252, 697]]], 'EDEEE', {3: ['CONTINUES_AT_TOP_OF_RIGHT_COLUMN']}),
    (39, 'd7a60c36e9e504cc0a8fe2e4168420422a0243a3e80747b49e69b00d508a4f86', (1300, 1240),
     [[[868, 665, 1256, 795]], [[868, 800, 1256, 994]], [[868, 997, 1256, 1200]]], 'EBD', {}),
]

FOLDER = 'physics-summary-bound-bodies-02'
ACTUAL_CROP_SET = '0cbd3205465cb22283b6839329f60cf411881974de854da0aa22118200855137'
ACTUAL_NOTES = {
    '318d7ab84e46': 'Q1 all three elastic-collision statements and source highlights; Q2 full right-top continuation; Q3 magenta option background excluded from selection without repair.',
    '318d84428ad4': 'Four complete motion graphs. Q3 right time label and Q4 printed number independently reopened after wider immutable crops.',
    '33d434764544': 'Two separate top-right text tasks and all five choices, correctly separated from shared source answer strip.',
    '37957d72ac7a': 'Q1 2q/-q field geometry, Q2 +4q/-2q charge-sharing figure, Q3 all three field-line diagrams and statements.',
    '3f0fe8983300': 'Q1 full-width five-body momentum figure precedes left-column demand; Q2 tennis-ball wall rebound; annotated Q3 excluded without reinspection.',
    '41a5cdf4bf0d': 'Source q1 key-content concern and q2 absent referenced graph are excluded without further attempts; q3 alcohol/water full stem/options retained.',
    '43c11bbab032': 'All three projectile diagrams and answer tables retained. Q3 separate table region excludes adjacent printed key.',
    '4d445cd6795e': 'Q1 full force/pendulum diagram; Q2 joins opposite-column three statements and choices. Q3 fraction denominator absent in original; excluded without repair.',
    '4e6ccddfb9c0': 'Both yellow source panels read. Q1 has no five printed options; Q2 prints verbal choices for numeric ratio demand. Both excluded; no options invented.',
    '4fce972d10ba': 'Q2 right-top continuation and full table. Q4 original hammer/nail S1/S2 figure from left panel is joined to four statements and choices; corrected composite independently reopened.',
    '53ecce455f8e': 'Q1 partial photon transfer; Q2 three common light-property statements. All five options remain visible.',
    '54f67ec3bb52': 'Q1 source t1/t2 inconsistency excluded; Q2 full acceleration graph and statements; Q3 full Earth illustration and reference-frame statements independently reopened.',
    '59c933598143': 'Q1 printed 300 mm/frequency option inconsistency excluded. Q2 X-ray use statements joined to right-top options; Q3 full electromagnetic-wave type task.',
    '68c90e176b02': 'Q1 all five field-line graphical options; annotated q2 excluded; Q3 full parallel-plate proton/neutron/electron paths.',
    '69dc0b0f8eec': 'Q1 resonance statements; Q2 right-top continuation and five choices; Q3 both length labels and pendulum diagrams retained.',
    '70934ce5d25d': 'All three radioactivity tasks retain source stems, statements and five options; no answer strip in crops.',
    '7be1849b70eb': 'Both pulley arrangements complete, including inclined-plane K/L/M/N labels and 5T/support/pulley weights.',
    '7d46c7125ab2': 'Original printed order is 1/3 left and 2 right; q2 has full above-number figure plus five separate force diagrams.',
    '7de28c9f1614': 'Q1 velocity graph, q2 complete vertical throw diagram/height options, q3 constant-friction statements all visible.',
    '7de80078a6ac': 'All five interference tasks retain diagrams and options; q3 spans both columns, q4/q5 stay separate from answer strip.',
    '815ede04e095': 'All three excitation tasks retain both energy-level diagrams and original five statement choices.',
}


def review_cached(folder):
    """Use finished pixels; no rerender, OCR, model, source repair or retries."""
    source = folder / 'report.json'
    report = read_json(source)
    inputs = {str(source): digest(source)}
    cards = []
    for row in report['results']:
        if digest(row['package']) != row['packageSha256']:
            raise ValueError('Original prepared package changed')
        inputs[row['package']] = row['packageSha256']
        cards.extend(read_json(row['package'])['cards'])
    if signature({c['sourceCode']: c['imageSha256'] for c in cards}) != ACTUAL_CROP_SET:
        raise ValueError('Actually read original image set changed')
    actual = []
    for c in cards:
        if digest(c['image']) != c['imageSha256']:
            raise ValueError('Actually read source pixels changed')
        prefix = c['sourceSha256'][:12]
        actual.append({**{k: c[k] for k in ['sourceCode', 'sourceSha256', 'printedNumber',
            'printedAnswer', 'sourceRegions', 'image', 'imageSha256', 'sourceConcerns']},
            'status': 'ACTUAL_ORIGINAL_CROP_AND_SOURCE_KEY_BINDING_READ',
            'actualReadingNote': ACTUAL_NOTES[prefix], 'preparedCropActuallyRead': True,
            'originalSourcePixelsEqual': True, 'visibleBodyOptionCuts': 0,
            'questionContentAccepted': False, 'newQuestionAdmissionAccepted': False, 'teacherApproved': False})
    output = {'status': 'PASS', 'scope': 'INCREMENTAL_ACTUAL_CROP_READING_NOT_ADMISSION',
        'documents': len(report['results']), 'questions': len(actual), 'results': actual,
        'inputs': inputs, 'actualContactSheetsRead': 21,
        'individuallyReadCorrectedCrops': ['physics-summary-318d84428ad4-q3', 'physics-summary-318d84428ad4-q4',
            'physics-summary-4fce972d10ba-q4', 'physics-summary-54f67ec3bb52-q3'],
        'sourceBankOrTeacherApprovalGranted': False, 'fullStageAccepted': False,
        'sourceRepairAttempts': 0, 'questionBankWrites': 0, 'teacherApproved': False,
        'toolSha256': digest(Path(__file__))}
    write_json(folder / 'actual-crop-review.json', output)
    print({k: output[k] for k in ['status', 'documents', 'questions', 'sourceRepairAttempts', 'questionBankWrites']})


def main():
    store = Store(APP / 'veri/yks-birlestirme')
    root = store.child(store.current()['runId'])
    review_cached(root / FOLDER)


if __name__ == '__main__':
    main()
