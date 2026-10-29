"""Frozen readings of answer-key dividers and unused ruled notes pages.

These pages contain no question, but are not empty/unreadable PDF pages. A
disposition removes only that page's OCR blocker, never an unlinked question.
"""
import hashlib
import json

import pymupdf

from pdf_source_scan import OUT, ROOT, digest, read_scan, read_evidence_scan, write_json

READINGS = {
    ('25b41a8bdc51f9370004787de51c6e344707eedc95f75ba6c61216841457a6f8',114):'00c7f33eb9623dd4157a3133409f55659328114ae6ee97af3571998ff2cb79cb',
    ('293f7f2a888c6275c9bba9157a66af821eaa52f34fdac131aab1bce0a76fbd37',87):'5a3c150c56c4844c49314d0eafa479ae3ee526a5c92711f397005b3401a4fb97',
    ('349543471a1a909b0b19c091bd3250fc5f25e1f19aa63acf73a649ec32e590cb',169):'cf618659009fa6caeddee3ef2a4d83160682e7e01adaace777221cf9e954706d',
    ('460aae366aaeec1484cc6541d90677a2dc1f3fea677aa77ccb9ebe9c59a9565f',105):'212d00b390e4c7ac482e79e8def1e272c36e013be1c9282eba442fdd3df5228b',
    ('ad53e46d182b7028d912625dae1e3a3f0f0b69423fec0fa57169a12647a5073b',124):'b2d96735eb750fdbe2eb90bbfbc74b02d732243ae01e83b1ee569d1bcc23e64e',
    ('ca70d3dcf86b66ae754cb3e1de7b7d3a18f444f4ee13534db90979c30f67c6fe',127):'b615fe0935893d22c685f26f4e51255251cac4333494413170de918c0bf12966',
    ('da339fbece2cbe869b9ad81a8fc8a5c4012d450b11a9632a0846fa60fc49894b',92):'2fc5f06fee8ced1b5bc7f50a00f93d784ea40ed9a40fb0f188d48c4621c9eaba',
    ('e5b1f154aef8fd349235195ce5169719519ae8acab3ba216616aaa61719229f7',78):'6819e2c3eb6a3cbd0e47d07aedd7d445f58a0400963620ad895438fbf19fd679',
    ('ee4a7e7c202e7b1464f63b61f7896582826d7a5b6f3afa3961942fec695d4d1f',26):'5ce778718ed4f58b74700800d844f9eac9a073f58672537ea11cfe6dc0c148b2',
    ('ee4a7e7c202e7b1464f63b61f7896582826d7a5b6f3afa3961942fec695d4d1f',128):'e5fb26779ea6ba7db71625aad1ba7ee6771d8502988bca171bfadf1636d24699',
    ('ee4a7e7c202e7b1464f63b61f7896582826d7a5b6f3afa3961942fec695d4d1f',140):'358b4c6fb01fbb0aa73f209e492dccdbf92c28c688210c06d38ebd4fbc13c23f',
}
FIELDS = ['sourceSha256','page','nativeTextSha256','ocrTextSha256','renderSha256']


def validate(row, sha, page):
    expected=READINGS.get((sha,page['page']))
    if not expected or row['sourceSha256']!=sha or row['page']!=page['page']:
        raise ValueError('Unreviewed source page disposition')
    signature=hashlib.sha256(json.dumps({key:row[key] for key in FIELDS},sort_keys=True).encode()).hexdigest()
    native_sha=page.get('rawTextSha256',page['textSha256'])
    if signature!=expected or row['nativeTextSha256']!=native_sha or row['ocrTextSha256']!=page.get('ocr',{}).get('textSha256'):
        raise ValueError('Reviewed page evidence changed')
    if row.get('teacherApproved') is not False or row['disposition'] not in ('ANSWER_KEY_DIVIDER','UNUSED_RULED_NOTES_PAGE'):
        raise ValueError('Invalid nonquestion disposition')
    return row


def main():
    data=json.loads((OUT/'reconciliation.json').read_text(encoding='utf-8'))
    files={f['sha256']:f['path'] for f in data['files']}
    rows=[]
    for (sha,number),signature in READINGS.items():
        source=ROOT/files[sha]
        if digest(source)!=sha:raise ValueError('Reviewed PDF changed')
        native=read_scan(sha)['pages'][number-1]
        observed=read_evidence_scan(sha,True)['pages'][number-1]
        with pymupdf.open(source) as document:
            render=document[number-1].get_pixmap(dpi=72,colorspace=pymupdf.csGRAY,alpha=False)
            row={'sourceSha256':sha,'page':number,'nativeTextSha256':native['textSha256'],
                 'ocrTextSha256':observed['ocr']['textSha256'],'renderSha256':hashlib.sha256(render.samples).hexdigest()}
        notes='Notlarım' in native['text']
        row.update({'disposition':'UNUSED_RULED_NOTES_PAGE' if notes else 'ANSWER_KEY_DIVIDER',
                    'sourceReading':'Notlarım başlıklı kullanılmamış kareli not sayfası; soru veya cevap seçeneği yok.' if notes else
                                    'Yalnız Cevap Anahtarı ve ders adını içeren ayraç sayfası; soru veya cevap listesi değil.',
                    'teacherApproved':False})
        rows.append(validate(row,sha,observed))
    write_json(OUT/'page-dispositions.json',{'reviewMethod':'EXPLICIT_SOURCE_PAGE_READING','pages':rows})
    print(json.dumps({'reviewedNonquestionPages':len(rows)}))


if __name__=='__main__':main()
