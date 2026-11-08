"""Record actually viewed layout sheets; never approve 75 question contents."""
from collections import Counter
from pathlib import Path

from yks_birlestirme import Store, read_json, write_json, digest, signature
from yks_pilot_kaynaklari import APP

SOURCE_ORDER_SHA256 = '662e470391b93aee559f63419f56b721c5e51c0fadaa9adb67ec8797065478c3'
VIEWED_BOARD_SHA256 = ['fa63fdda3ac680c4694a304cacc29275c60f145d9926e348151fd61df611461d', 'f3b3e4e791818cece3060078d685deef97677b029593212b712881c509206289', 'e319f4077e89a269361e7e5d7006955563dcbc637a898c95f789b67e5f303de3', '58541ba152441c086c10e23570e2b19e8604a170f0dbfe6d76afcede86d35d73', '9d34244d951306f07d909e12bdbf2adeb7dc91153b63b1b336be29c25676e5bb', 'b24fde51bd1301cc487aa563750bead8d0529009e61d21fbd5c3b06bb0a69f26', '5889e70b8926c7080ffa003a20cdb9f28208cbee8b0a650595f8a98960b76675', '6449dede07b5f7ae497f2a0398be9c118d2ccce38bfb89adb1d1f88b21858f73', '4f49cc38e5b4000299c5e4d85d7db126e7c55a8e543ddb8975b881efb00477d8', 'e574195cc4a09873b6ddeae14e74cad3d3b083ed9c59a2ed5e1f42738f32f481', '3e5cb4ee7ce535db2a467d41dc534adeaa75a6e8e262bc6662b689dee4ec5528', '180f4acafbd0709a147736acb30576fecbf4ef077ff1131031dd4268163ed8df', '6bb7d3e5ec33ef3cb1acfe0e90a00002211f3b1870bf9dc9a09417f20c9c5e80']

# These positions refer to the frozen, actually viewed thirteen contact sheets.
# The full source pages for 10/31/66/73 were also opened individually.
TWO_COLUMNS = {2, 4, 16, 18, 19, 22, 25, 27, 29, 33, 36, 38, 41, 44,
               48, 53, 57, 61, 62, 63, 65, 73, 75}
FULL_PAGE_READ = {
    10: '17cc07ec3ed7', 31: '66d6cd9275fd',
    66: 'e707d7a0c8ee', 73: 'f7abb44afd32',
}
VISIBLE_HIGHLIGHT_NOTES = {5, 10, 12, 18, 21, 22, 26, 32, 35, 44, 58, 69, 72, 73, 74}


def main():
    store = Store(APP / 'veri/yks-birlestirme')
    root = store.child(store.current()['runId'])
    path = root / 'physics-summary-body-discovery/report.json'
    source = read_json(path)
    if source['documents'] != 75 or len(source['reviewBoards']) != 13 or signature([r['sourceSha256'] for r in source['results']]) != SOURCE_ORDER_SHA256:
        raise ValueError('Actually viewed source cohort changed')
    if not source['results'][9]['sourceSha256'].startswith(FULL_PAGE_READ[10]):
        raise ValueError('Actually viewed source order changed')
    for board, viewed_sha in zip(source['reviewBoards'], VIEWED_BOARD_SHA256):
        if digest(board['path']) != board['sha256'] or board['sha256'] != viewed_sha:
            raise ValueError('Actually viewed layout sheet changed')
    rows = []
    for index, row in enumerate(source['results'], 1):
        sha = row['sourceSha256']
        if index in FULL_PAGE_READ and not sha.startswith(FULL_PAGE_READ[index]):
            raise ValueError('Actually opened full source page differs')
        board = source['reviewBoards'][(index - 1) // 6]
        if sha not in board['sources']:
            raise ValueError('Source is not on the actually viewed board')
        result = {'sourceSha256': sha, 'sourcePath': row['sourcePath'],
                  'status': 'ACTUAL_LAYOUT_READ_BODY_REGIONS_AND_CONTENT_NOT_ACCEPTED',
                  'layout': 'TWO_QUESTION_COLUMNS' if index in TWO_COLUMNS else 'SINGLE_QUESTION_COLUMN',
                  'viewedBoardPath': board['path'], 'viewedBoardSha256': board['sha256'],
                  'bodyContentAccepted': False, 'sourceQuestionAnswersBound': False,
                  'newQuestionAdmissionAccepted': False, 'teacherApproved': False}
        if index in FULL_PAGE_READ:
            if digest(row['pageImage']) != row['pageImageSha256']:
                raise ValueError('Actually opened original page changed')
            result.update(viewedWholePage=row['pageImage'],
                          viewedWholePageSha256=row['pageImageSha256'])
        if index in VISIBLE_HIGHLIGHT_NOTES:
            result['visibleHighlightOrAnnotationRequiresPreservedOriginalReview'] = True
        if index == 10:
            result.update(status='MIXED_PHYSICS_HISTORY_SOURCE_REQUIRES_SEPARATE_REGION_SCOPE',
                          layout='TWO_SUBJECT_PANELS_ON_ONE_PHYSICAL_PAGE',
                          observations=['Upper Physics panel has numbered questions 1 and 2 and printed C/E strip.',
                                        'Lower History panel has questions 1,2,3 with inline E,D,A answers.',
                                        'Lower History questions must not inherit Physics subject or C/E strip.'])
        elif index == 31:
            result['observations'] = ['Whole page shows five numbered body questions 1..5.',
                                      'A separate 1..5 number row belongs to the answer table, not five more questions.',
                                      'Printed table reads E,C,E,E,D; per-question crop binding remains separate.']
        elif index == 66:
            result.update(status='ACTUAL_THREE_BODY_NUMBERS_VS_PRINTED_1_2_4_KEY_HOLD',
                          observations=['Whole page has body questions 1,2,3, but key literally prints 1 E,2 A,4 D.',
                                        'Do not infer a question 4 or rename key cell 4 to 3.'])
        elif index == 73:
            result['observations'] = ['Question 1 diagram extends above the SORULAR heading.',
                                      'Question 1 plots contain visible source annotation/highlight.',
                                      'A crop starting at the body text or heading would lose diagram pixels.']
        rows.append(result)
    target = root / 'physics-summary-layout-actual-review/report.json'
    write_json(target, {'status': 'PASS', 'scope': 'ACTUAL_LAYOUT_REVIEW_ONLY_NOT_FULL_QUESTION_READ_OR_ADMISSION',
                        'sourceReport': str(path), 'sourceReportSha256': digest(path),
                        'documents': len(rows), 'actualLayoutBoardsRead': 13, 'actualIndividualPagesOpened': 4,
                        'states': dict(Counter(r['status'] for r in rows)), 'results': rows,
                        'questionBankWrites': 0, 'sourceQuestionAnswersBound': False,
                        'newQuestionAdmissionAccepted': False, 'teacherApproved': False,
                        'toolSha256': digest(Path(__file__))})
    print({'status': 'PASS', 'layouts': len(rows), 'questionAdmission': False})


if __name__ == '__main__':
    main()
