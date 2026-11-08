"""Prepare source-only contact sheets for held summary keys; record actual readings.

Board preparation is not an actual-reading claim. The separate accepted key
readings must be pinned to the exact boards inspected, with bodies unaccepted.
"""
import argparse
from collections import Counter
from pathlib import Path

from PIL import Image,ImageDraw,ImageFont
import pymupdf
from yks_birlestirme import Store,read_json,write_json,digest,process_lock
from yks_pilot_kaynaklari import APP


VIEWED_BOARDS={
    'keys-01.png':'39cd5836b39662bd5014ef563460dd6ed12a391ee2f72a49ab9cf06869d9bc22',
    'keys-02.png':'02a4e78269587ba19511b837542b34ef784dd143ec9e2375d361e3bde290d987',
    'keys-03.png':'1cb8afe498f775713e96c83d1067f22de561db3513fda2b3ebc1074341d0981a',
    'keys-04.png':'67effb7934345a1ec7366e9087d5c243e92d437f4ab1f3a6b5bbcb5f1984c256',
    'keys-05.png':'16f952ece20218303246e9a3a86265a0919e1179188e3ff50dd9e1e6fcf984cd',
    'keys-06.png':'a3134987a3e1954892728d6aba23bd5510c709cd6427b014e416722639511fdc',
    'keys-07.png':'a520ca9743b03fc7e3511df8507b4db32b0477f862c5d2caa5dcb99ed5c61c2b',
    'keys-08.png':'06bb75e6d702bfc57dda6f1e4306e8a8c9563e2e49a0e24757895896a9f00bb4',
}
ACTUAL_READINGS={
    '04c593815b31':'DDE','0843dee78582':'EEC','0da131857153':'EB','1090da3956e7':'BD','10f0e486b987':'ADC','116697578de4':'DDC',
    '17cc07ec3ed7':'CE','1a7a2b87f7a6':'ABE','1b5fff0a8d3f':'EDD','1deb72c0fd0c':'CB','291086f828ca':'DEDC','33d434764544':'CB',
    '3f0fe8983300':'AEE','41a5cdf4bf0d':'ABD','4d445cd6795e':'DDA','53ecce455f8e':'DE','54f67ec3bb52':'CEE','59c933598143':'ADE',
    '66d6cd9275fd':'ECEED','70934ce5d25d':'ECC','7be1849b70eb':'BA','7de28c9f1614':'ACC','7de80078a6ac':'EDEEE','815ede04e095':'EBD',
    '852cd2161f83':'ECA','8cb92f4ec789':'DCB','9383bfb77460':'CAB','a0d3a22efb14':'EBA','a1763599177c':'EB','b4f3f4a8fa23':'ECA',
    'bc5e453850d9':'DBC','bccc71d6f1c7':'EDEC','c05de8e6a974':'ECA','c5ca8e7a3b64':'DDC','c890c4f491db':'BED','cbbcc41ce1ee':'DBC',
    'da33b8d99abd':'ADD','e176f9ae4554':'BAE','e70246aa1e6b':'BAD',
    'e707d7a0c8ee':[(1,'E'),(2,'A'),(4,'D')],
    'f3c0cc5e5913':'EE','f5ceaec34399':'DC','f722c473fe38':'AB','f7b58819195a':'AE',
}
VIEWED_WHOLE_PAGES={
    '68c90e176b02':('73076cb51977904154e9db47c96bee145ae4bf4227e42707f15e08b5715eb24d','CCB'),
    '69dc0b0f8eec':('ec5075c74ac24bddf47641229eb39cb2dd7c3382a677f5a928a304ac6dcf08c0','EEC'),
}


def actual_rows(value):
    if value is None:return None
    pairs=list(enumerate(value,1)) if isinstance(value,str) else value
    if not pairs or any(type(n) is not int or n<1 or a not in list('ABCDE') for n,a in pairs) or len({n for n,a in pairs})!=len(pairs):
        raise ValueError('Invalid actual printed number/letter reading')
    return [{'number':n,'answer':a} for n,a in pairs]


def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--record',action='store_true');args=parser.parse_args()
    store=Store(APP/'veri/yks-birlestirme');root=store.child(store.current()['runId']);source=root/'physics-summary-key-readings/report.json';source_sha=digest(source)
    report=read_json(source)
    if report['status']!='COMPLETE':raise ValueError('Complete bounded local source key pass required')
    cases=[r for r in report['results'] if r['status']=='SOURCE_KEY_STRIP_READING_DISAGREEMENT_HOLD']
    by_source={r['sourceSha256']:r for r in cases}
    folder=root/'physics-summary-key-actual-review';folder.mkdir(exist_ok=True)
    with process_lock(folder/'.writer.lock'):
        if not args.record:
            boards=[];font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',20)
            for start in range(0,len(cases),6):
                items=cases[start:start+6];panels=[];members=[]
                for row in items:
                    if digest(row['cropPath'])!=row['cropSha256']:raise ValueError('Original key strip changed')
                    with Image.open(row['cropPath']) as image:
                        image=image.convert('RGB');image.thumbnail((1200,460));panels.append(image.copy())
                    members.append({'sourceSha256':row['sourceSha256'],'cropPath':row['cropPath'],'cropSha256':row['cropSha256']})
                board=Image.new('RGB',(1240,sum(p.height+42 for p in panels)+20),'#eeeeee');draw=ImageDraw.Draw(board);y=12
                for panel,row in zip(panels,items):
                    draw.text((16,y),row['sourceSha256'][:12],fill='black',font=font);y+=30
                    board.paste(panel,(16,y));y+=panel.height+12
                target=folder/('keys-'+str(start//6+1).zfill(2)+'.png');board.save(target)
                boards.append({'path':str(target),'sha256':digest(target),'members':members})
            write_json(folder/'boards.json',{'status':'PREPARED_NOT_YET_ACTUALLY_READ','sourceReportSha256':source_sha,'questionsAccepted':0,'boards':boards})
            print({'status':'BOARDS_PREPARED_NOT_READ','sourceKeyRegions':len(cases),'boards':len(boards)});return
        manifest=read_json(folder/'boards.json')
        if manifest['sourceReportSha256']!=source_sha:raise ValueError('Original local key report changed')
        results=[]
        for board in manifest['boards']:
            if digest(board['path'])!=board['sha256'] or VIEWED_BOARDS.get(Path(board['path']).name)!=board['sha256']:raise ValueError('Exact board not actually read or changed')
            for member in board['members']:
                code=member['sourceSha256'][:12]
                if code not in ACTUAL_READINGS:raise ValueError('Missing explicit actual key reading')
                if digest(member['cropPath'])!=member['cropSha256']:raise ValueError('Actually read original strip changed')
                if digest(by_source[member['sourceSha256']]['sourcePath'])!=member['sourceSha256']:raise ValueError('Actually read original PDF changed')
                answers=actual_rows(ACTUAL_READINGS[code])
                contiguous=answers is not None and [r['number'] for r in answers]==list(range(1,len(answers)+1))
                results.append({**member,'viewedBoardPath':board['path'],'viewedBoardSha256':board['sha256'],
                    'status':'ACTUAL_ORIGINAL_PRINTED_KEY_REGION_READ_BODY_ENUMERATION_REQUIRED' if contiguous else 'ACTUAL_PRINTED_NUMBER_GAP_HOLD_NO_RENUMBER' if answers else 'ACTUAL_KEY_REGION_STILL_INCOMPLETE_HOLD',
                    'actualPrintedAnswers':answers,'contiguousPrintedNumbers':contiguous,
                    'sourceQuestionAnswersBound':False,'wholeSourceKeyCompletenessAccepted':False,'newQuestionAdmissionAccepted':False,'teacherApproved':False})
        retry_path=root/'physics-summary-native-key-readings/report.json';retry=read_json(retry_path)
        for original in retry['results']:
            prefix=original['sourceSha256'][:12]
            if prefix not in VIEWED_WHOLE_PAGES:continue
            sha,letters=VIEWED_WHOLE_PAGES[prefix];image=folder/(prefix+'-whole-page.png')
            if digest(image)!=sha or digest(original['sourcePath'])!=original['sourceSha256']:raise ValueError('Actually viewed whole source page changed')
            with pymupdf.open(original['sourcePath']) as doc,Image.open(image) as saved:
                if len(doc)!=1:raise ValueError('Expected one actual original page')
                pix=doc[0].get_pixmap(dpi=110,alpha=False)
                if saved.mode!='RGB' or saved.size!=(pix.width,pix.height) or saved.tobytes()!=pix.samples:raise ValueError('Whole viewed page is not the original PDF render')
            results.append({'sourceSha256':original['sourceSha256'],'sourcePath':original['sourcePath'],
                'viewedBoardPath':str(image),'viewedBoardSha256':sha,'sourceViewScope':'WHOLE_ORIGINAL_PAGE_USED_ONLY_TO_READ_ITS_PRINTED_KEY',
                'status':'ACTUAL_ORIGINAL_PRINTED_KEY_REGION_READ_BODY_ENUMERATION_REQUIRED','actualPrintedAnswers':actual_rows(letters),'contiguousPrintedNumbers':True,
                'sourceHighlightsRequireBodyReview':prefix=='68c90e176b02',
                'sourceQuestionAnswersBound':False,'wholeSourceKeyCompletenessAccepted':False,'newQuestionAdmissionAccepted':False,'teacherApproved':False})
        write_json(folder/'report.json',{'status':'PASS','scope':'ONLY_ACTUALLY_READ_HELD_KEY_REGIONS_NOT_FULL_QUESTION_OR_SOURCE_ACCEPTANCE',
            'sourceReportSha256':source_sha,'regionsActuallyRead':len(results),'states':dict(Counter(r['status'] for r in results)),'results':results,'sourceQuestionAnswersBound':False,
            'stripRegionsActuallyRead':44,'wholePagesActuallyReadForKeys':2,'nativeHeadingRetryReportSha256':digest(retry_path),
            'wholeSourceKeyCompletenessAccepted':False,'newQuestionAdmissionAccepted':False,'questionBankWrites':0,'teacherApproved':False,'toolSha256':digest(Path(__file__))})
        print({'status':'PASS','regionsActuallyRead':len(results)})


if __name__=='__main__':main()
