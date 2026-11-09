"""One pass over the remaining 35 summaries. A failed source is excluded, never repaired."""
from pathlib import Path
import argparse

import pymupdf
from PIL import Image, ImageDraw

from yks_birlestirme import Store, read_json, write_json, digest, signature, process_lock
from yks_pilot_kaynaklari import APP
from yks_fizik_ozet_govde_bagla import page_regions, cut_lines
from yks_istisna_kirpim import original_image, verify_image

# These page images were opened once. Boxes describe only unambiguous printed
# body panels; None is an immediate exclusion, not a task to reconstruct.
# Printed answers remain unchanged even when a source is excluded.
REVIEWS = [
 (40, '7907add4481aae15de686036c37fba306eadd094f272facab4fdf2eb5e3d80f8', (1300,1115), 'CBD',
  [[[987,207,1253,393]], [[987,404,1253,676]], [[987,687,1253,1034]]]),
 (41, 'd8eb686f23632766ba0d0b757fcb4e064ac1f91d3179baacee62ba242b8cf940', (1300,1057), 'ECA',
  [[[549,544,884,1009]], [[911,545,1240,690]], [[911,698,1240,987]]]),
 (42, '4a61d3d7b7fe1297a8d6308ca594c1ed405a79e8b64f842a42332ac81a1b371e', (1300,925), 'DAE',
  [[[946,85,1250,244]], [[946,251,1250,516]], [[946,518,1250,875]]]),
 (43, 'e0f898f11db905785005c7b28e4bd967d6a57ade0afd5dd2bc5552ab95516879', (1300,911), 'DA',
  [[[994,79,1258,522]], [[994,620,1258,797]]]),
 (44, 'ac618628a5b27b5bbc3d6d562271f49b1d301d8855ab61254764a98d4d5103aa', (1300,1150), 'DCB',
  [[[461,720,844,999]], None, None]),
 (45, '79591abbac3f45cd7a08306afed913d15e300bcc2ee88b1041b99d7c06260590', (1300,895), 'CAB',
  [[[1026,209,1251,468]], [[1026,476,1251,685]], [[1026,692,1251,847]]]),
 (46, '06fdae2086a8802df683da34629c4fd03868ec90d7d1abc17579ebd7a1337004', (1300,910), 'EBA',
  [[[739,77,976,194]], [[739,204,976,480]], [[739,490,976,870]]]),
 (47, '1a066e2b7c41d6f18f571dceb40a5c6fd87096834b7c9403e178c2569869dd96', (1300,1002), 'EB',
  [[[897,475,1250,629]], [[897,644,1250,910]]]),
 (48, 'f1a029c8448a56b471bd2603bbae8889626a6c76f7b60698bc9ab55d654126dc', (1300,1085), 'ECA',
  [[[475,432,857,670]], [[475,680,857,889]], [[880,414,1247,857]]]),
 (49, '35720499f4a4cfbb8febe5cb2ff853e37e9fd49f0b1641db3c139fd2a37405bf', (1300,1115), 'EC',
  [[[879,645,1249,737]], [[879,747,1249,1047]]]),
 (50, '1d2d3ab04815aefbcfe6d9d9311e91a35b8c8897b2899a594520af7946d35b32', (863,1003), 'DDD',
  [None, None, None]),
 (51, 'ac2e8ccf429c6a4b1df6d89bb58ab329b31e6ecea2ded68c5e8d478cf7017821', (1300,1142), 'DE',
  [[[893,426,1264,840]], [[893,857,1251,1091]]]),
 (52, '9752c88f1fa6ed05e3cb6bb1fb19df1eb41de644b33904e7d6cd0d95bd4f3517', (1300,937), 'DBC',
  [[[1035,198,1258,369]], [[1035,382,1258,722]], [[1035,733,1258,908]]]),
 (53, '811e97c6d591e5bfd41303a5d94c65f50dea9a87ca67ba164a06c9c6d88c734a', (1300,1065), 'EDEC',
  [[[558,181,1246,422]], [[558,438,1246,665]], [[558,682,1246,851]],
   [[558,857,725,1026], [725,857,989,1064], [1005,873,1246,1024]]]),
 (54, '5dd6cb3dde5fa536d5ce6485e10ad00464867169241bc4180ced0dd1f8603fdf', (1300,935), 'ECA',
  [[[750,160,1245,284]], [[750,295,1245,635]], [[750,650,1245,885]]]),
 (55, '2ba7ef2a88d7e4edc230103619a2ba0c58bba60008a454d6f1680d6e8c8962f5', (1300,1110), 'DDC',
  [[[873,221,1257,486]], [[873,492,1257,777]], [[873,782,1257,1046]]]),
 (56, '5cc10e24b9de2d349f13a8c8104e03d0f29876da18f21dca27aa367b35b2449f', (1300,1008), 'BED',
  [[[823,218,1243,377]], [[823,401,1243,716]], [[823,738,1243,945]]]),
 (57, 'a7adb6e6bbb35032936c933fb1a6a0c3324cd2a7ec5d17536b165402957d20e6', (1300,549), 'ADB',
  [[[492,224,864,374]], [[492,379,864,522]], [[876,219,1258,420]]]),
 (58, '35679e14fee3b35748980fa8ed949945ecf5884965e579595c223372f0a16705', (1300,972), 'DBC',
  [[[909,206,1246,516]], [[909,522,1246,641]], [[909,645,1246,899]]]),
 (59, '253b9a8582a8f47b410badcd245628750f842af5d7c90fc5122e11502b19fce8', (1300,1055), 'CAD',
  [[[1028,85,1255,323]], [[1028,333,1255,747]], [[1028,754,1255,1006]]]),
 (60, 'f636a845d45af43664ffea2499cade9424f04c7f402f102979b73303bda53076', (1300,1112), 'ADD',
  [[[880,779,1068,999]], [[880,1010,1068,1048], [1073,748,1251,817]], [[1073,830,1251,1037]]]),
 (61, 'd07bc969e10556a463ce225de1d0b87662d0150ca64798650edee5edbc573906', (1300,838), 'EDDC',
  [[[741,208,994,376]], [[741,384,994,765]], [[1000,162,1254,579]], [[1000,585,1254,772]]]),
 (62, '93965504a9424840cf6e05f8c954ec480310ed47f22702f504fce14da221c996', (1300,914), 'BAE',
  [[[668,715,957,849]], [[668,850,957,884], [976,683,1250,717]], [[976,719,1250,868]]]),
 (63, 'aa2c6be479290607557bbe832932145cb21dbfe6060512280415a6ac42198a24', (1300,940), 'CBA',
  [[[610,158,1258,481]], None, [[610,788,1258,866]]]),
 (64, 'c4556a9f6f09fca1b24175f695262f519e66ead840743a7a55c858a53963e1a8', (1300,916), 'EDD',
  [[[999,71,1251,373]], [[999,380,1251,655]], [[999,661,1251,855]]]),
 (65, 'b9b9a3090bf6f213d62b2df3e0f9dcf4b49912974589c0ebb66aae7cccb2ef8d', (1300,964), 'BAD',
  [[[465,211,852,490]], [[465,526,852,950]], [[876,517,1253,931]]]),
 (67, 'f4a86a5282857baa96bbea1fa35413918f44a067e8df6f04e9f3a21156adfc5a', (1300,937), 'DEB',
  [[[874,388,1257,537]], [[874,542,1257,684]], [[874,687,1257,789], [874,789,1123,889]]]),
 (68, 'e50e5da076729ba30be114c894d88e64f71832ecf208700fef684429d54596c2', (1300,921), 'ECC',
  [[[911,222,1251,345]], [[911,352,1251,672]], [[911,677,1251,875]]]),
 (69, '9284bd3093f2cc5674fc6425ee989425daea0f198b437df434524765b460bab6', (1300,944), 'EE',
  [[[1012,206,1250,455]], [[1012,465,1250,884]]]),
 (70, '4f584da6b769f642873fb1b47dfe411b4194c4a6bf3d9a19f04cefce6e8b35f7', (1300,959), 'EE',
  [[[984,125,1249,480]], [[984,491,1249,857]]]),
 (71, 'cb2f1bb72d099434d5db38e009bd0a9309e98c24579363b9b6aee59dbc63a110', (1300,1115), 'DC',
  [[[880,781,1066,988]], [[880,992,1066,1051], [1070,749,1251,1051]]]),
 (72, '65f3ee1ad7b448b6e3afd749814e46636dd312591939e6020752730abd3c9c8c', (1300,1106), 'AB',
  [None, [[897,686,1248,1014]]]),
 (73, 'e5734d996a02c3aee28326c1aecf69b40be2094a602d6040febb43e020d4422f', (1300,1014), 'BCC',
  [None, [[373,640,869,991]], [[897,157,1234,523]]]),
 (74, '20580cf2eebaf311f326c4cd3f2c8c37bf2e6f7f5a961948d1a7759137b28e83', (1300,1040), 'AE',
  [[[964,687,1257,863]], None]),
 (75, 'd591b7ed68f73d859cd125271120fd47527ca459f261e2fc1a26fe96c56dcef4', (1300,1238), 'DEED',
  [[[622,202,1255,383]], [[622,389,1255,642]], [[622,651,1255,879]], [[622,884,1255,1175]]]),
]

EXCLUSIONS = {
 (44,2): 'SOURCE_ANSWER_OPTION_HIGHLIGHTED_HOLD',
 (44,3): 'SOURCE_DUPLICATE_OPTION_C_SIX_OPTIONS_HOLD',
 (50,1): 'SOURCE_BODY_KEY_COUNTS_TWO_VS_THREE_HOLD',
 (50,2): 'SOURCE_BODY_KEY_COUNTS_TWO_VS_THREE_HOLD',
 (50,3): 'SOURCE_BODY_KEY_COUNTS_TWO_VS_THREE_HOLD',
 (63,2): 'SOURCE_VELOCITY_OPTION_SYMBOLS_NOT_PROVABLE_HOLD',
 (72,1): 'SOURCE_MAGENTA_STEM_SYMBOL_ANNOTATION_HOLD',
 (73,1): 'SOURCE_GRAPHICAL_OPTION_LETTERS_NOT_VISIBLE_HOLD',
 (74,2): 'SOURCE_MAGENTA_CHARGE_AND_OPTION_NOTE_HOLD',
}
FOLDER = 'physics-summary-final-one-pass'
ACTUALLY_READ_SET = '0b5e7914bb7388249c80fb69d3d550369d2ff1c5d16920cee061c6d31f856266'
VISUAL_EXCLUSIONS = {
 'physics-summary-e34a1d9d8ea5-q1': 'SOURCE_STEM_PRINTED_ANSWER_CONSISTENCY_NOT_PROVABLE_HOLD',
 'physics-summary-e70246aa1e6b-q1': 'SOURCE_HYDRAULIC_NUMERIC_RELATION_NOT_PROVABLE_HOLD',
}


def prepare(root, folder):
    if pymupdf.VersionBind != '1.28.2':
        raise ValueError('Use the recorded project renderer')
    marker = folder / 'attempt-started.json'
    if marker.exists():
        raise ValueError('This one-pass batch has already been attempted; do not retry sources')
    discovery = read_json(root / 'physics-summary-body-discovery/report.json')
    keys_path = root / 'physics-summary-effective-key-regions/report.json'
    keys = {r['sourceSha256']: r for r in read_json(keys_path)['results']}
    write_json(marker, {'sourceRepairAttempts': 0, 'onePassOnly': True})
    results, sources, crops = [], [], []
    for index, actual_hash, canvas, answers, bodies in REVIEWS:
        row = discovery['results'][index - 1]
        sha = row['sourceSha256']
        source_problem = None
        try:
            if digest(row['pageImage']) != actual_hash or digest(row['sourcePath']) != sha:
                raise ValueError('Original source differs')
            key = keys[sha]
            if not key['contiguousPrintedNumbers'] or len(bodies) != len(answers) or key['printedRegionAnswers'] != [
                    {'number': n, 'answer': a} for n, a in enumerate(answers, 1)]:
                raise ValueError('Printed source body/key identity cannot be bound')
            doc = pymupdf.open(row['sourcePath'])
            if len(doc) != 1:
                doc.close()
                raise ValueError('Unexpected physical source pages')
        except Exception as exc:
            source_problem = f'SOURCE_VERIFICATION_FAILED_HOLD:{type(exc).__name__}'
            doc = None
        out = folder / sha[:16]
        out.mkdir(exist_ok=True)
        for n, rectangles in enumerate(bodies, 1):
            card = {'sourceCode': f'physics-summary-{sha[:12]}-q{n}', 'sourceSha256': sha,
                'sourcePath': row['sourcePath'], 'pdfPage': 1, 'printedNumber': n,
                'printedAnswer': answers[n-1], 'sourceConcerns': [], 'preparedCropActuallyRead': False,
                'questionContentAccepted': False, 'newQuestionAdmissionAccepted': False,
                'teacherApproved': False, 'learnerVisible': False, 'productionImportAllowed': False}
            problem = source_problem or EXCLUSIONS.get((index,n))
            if not problem:
                try:
                    regions = page_regions(rectangles, canvas, doc[0])
                    cuts = cut_lines(doc[0], regions)
                    if cuts:
                        card['nativeGeometryIntersections'] = cuts
                        raise ValueError('Native body/option bounds intersect; skipped without repair')
                    image = out / f'question-{n}.webp'
                    pixels, _ = original_image(doc, regions)
                    pixels.save(image, format='WEBP', lossless=True)
                    proof = verify_image(doc, regions, image)
                    card.update(sourceRegions=regions, image=str(image), imageSha256=digest(image),
                        originalSourcePixelsEqual=True, pixelProof=proof, nativeLineCuts=0,
                        actualWholePage=row['pageImage'], actualWholePageSha256=actual_hash)
                    crops.append(card)
                except Exception as exc:
                    problem = 'SOURCE_CROP_NOT_VERIFIABLE_FIRST_PASS_HOLD:' + str(exc)
            if problem:
                card['sourceConcerns'] = [problem]
                card['action'] = 'EXCLUDE_NO_RETRY'
            else:
                card['action'] = 'PREPARED_SINGLE_PASS_VISUAL_CHECK'
            results.append(card)
        if doc is not None:
            doc.close()
        sources.append({'sourceSha256':sha,'sourcePath':row['sourcePath'],
            'printedKeyCellsAssessed':len(bodies),'questionBankWrites':0,'repairAttempts':0})
    boards=[]
    for offset in range(0,len(crops),3):
        chunk=crops[offset:offset+3]
        sheet=Image.new('RGB',(1800,1450),'#dddddd');draw=ImageDraw.Draw(sheet)
        for j,c in enumerate(chunk):
            with Image.open(c['image']) as im:
                im.thumbnail((590,1400));sheet.paste(im,(600*j+5,40))
            draw.text((600*j+5,5),c['sourceCode']+' key:'+c['printedAnswer'],fill='black')
        file=folder/f'board-{offset//3+1:02d}.png';sheet.save(file)
        boards.append({'path':str(file),'sha256':digest(file),'sourceCodes':[c['sourceCode'] for c in chunk]})
    write_json(folder/'preparation-tool.json',{'sha256':digest(Path(__file__))})
    (folder/'preparation-tool.py').write_bytes(Path(__file__).read_bytes())
    report={'status':'PASS','scope':'ALL_REMAINING_35_SUMMARIES_ONE_PASS_NOT_ADMISSION',
        'documents':len(sources),'questionsAssessed':len(results),'cropsPrepared':len(crops),
        'excludedWithoutRetry':len(results)-len(crops),'results':results,'sourceDispositions':sources,
        'reviewBoards':boards,'keyEvidence':str(keys_path),'keyEvidenceSha256':digest(keys_path),
        'sourceRepairAttempts':0,'newModelCalls':0,'newOcrCalls':0,'questionBankWrites':0,
        'fullStageAccepted':False,'teacherApproved':False,'toolSha256':digest(Path(__file__))}
    write_json(folder/'prepared.json',report)
    print({k:report[k] for k in ['status','documents','questionsAssessed','cropsPrepared','excludedWithoutRetry']})


def review(folder):
    path=folder/'prepared.json';prepared=read_json(path)
    cards=[r for r in prepared['results'] if r.get('image') and not r['sourceConcerns']]
    if ACTUALLY_READ_SET is None or signature({c['sourceCode']:c['imageSha256'] for c in cards}) != ACTUALLY_READ_SET:
        raise ValueError('Open the prepared crop set before recording actual reading')
    boards=prepared['reviewBoards']
    if len(boards)!=21 or any(digest(b['path'])!=b['sha256'] for b in boards):
        raise ValueError('Actually opened contact sheets must remain unchanged')
    results=[]
    for original in prepared['results']:
        card=dict(original)
        problem=VISUAL_EXCLUSIONS.get(card['sourceCode'])
        if problem:
            card['sourceConcerns']=[problem]
            card['action']='EXCLUDE_NO_RETRY'
        if not card['sourceConcerns']:
            if digest(card['image'])!=card['imageSha256']:
                card['sourceConcerns']=['SOURCE_SAVED_CROP_CHANGED_HOLD']
                card['action']='EXCLUDE_NO_RETRY'
            else:
                card.update(preparedCropActuallyRead=True,visibleBodyOptionCuts=0,
                    action='SOURCE_BODY_KEY_EVIDENCE_VERIFIED_NOT_ADMISSION')
        results.append(card)
    report={'status':'PASS','scope':'ALL_REMAINING_SUMMARIES_ASSESSED_WITH_FINAL_EXCLUSIONS',
        'documents':prepared['documents'],'questions':len(results),'results':results,
        'sourceDispositions':prepared['sourceDispositions'],
        'actualCropImagesRead':len(cards),'actualCropBoardsRead':len(boards),
        'actuallyReadCropSetSha256':ACTUALLY_READ_SET,
        'actuallyReadBoards':boards,
        'sourceEvidenceCandidates':sum(not c['sourceConcerns'] for c in results),
        'excludedWithoutRetry':sum(bool(c['sourceConcerns']) for c in results),
        'inputs':{str(path):digest(path)},'sourceRepairAttempts':0,'newModelCalls':0,'newOcrCalls':0,
        'questionBankWrites':0,'fullStageAccepted':False,'teacherApproved':False,
        'toolSha256':digest(Path(__file__))}
    write_json(folder/'report.json',report)
    print({k:report[k] for k in ['status','documents','questions','sourceEvidenceCandidates','excludedWithoutRetry']})


def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--prepare',action='store_true');args=parser.parse_args()
    store=Store(APP/'veri/yks-birlestirme');root=store.child(store.current()['runId']);folder=root/FOLDER;folder.mkdir(exist_ok=True)
    with process_lock(folder/'.writer.lock'):
        if args.prepare:prepare(root,folder)
        else:review(folder)


if __name__=='__main__':main()
