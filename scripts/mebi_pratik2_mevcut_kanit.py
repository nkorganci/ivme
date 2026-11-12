"""Reuse only source/body/key evidence from MEBI; never inherit import decisions.

Practice 2 permits overlap with the established bank. Prior novelty decisions
therefore do not decide admission here; topic/content acceptance still must be
established separately. All original evidence remains immutable.
"""
import hashlib
import json
from pathlib import Path
from collections import Counter
from mebi_pratik2_tam_pdf_tarama import APP,BASE,SOURCE
from yks_birlestirme import write_json


def run():
    source=APP/'veri/yks-birlestirme/20261107t212333-f17dbdba/selected-yks07-acceptance/source-candidates.json'
    cards=json.loads(source.read_text(encoding='utf8'))['cards']
    inventory=json.loads((BASE/'inventory.json').read_text(encoding='utf8'))['items']
    by_path={str((SOURCE/r['relativePath']).resolve()):r['sha256'] for r in inventory}
    checked={};rows=[];review=[];outside=0
    def verify(path,sha):
        path=Path(path).resolve()
        if not path.is_relative_to(APP/'veri') or not path.is_file():return False
        key=(str(path),sha)
        if key not in checked:
            with path.open('rb') as stream: checked[key]=hashlib.file_digest(stream,'sha256').hexdigest()==sha
        return checked[key]
    for card in cards:
        path=Path(card['sourcePath']).resolve();keypath=Path(card.get('sourceKeyPath','')).resolve()
        if not path.is_relative_to(SOURCE) or not keypath.is_relative_to(SOURCE):outside+=1;continue
        reasons=[]
        if by_path.get(str(path))!=card['sourceSha256']:reasons.append('BODY_SOURCE_NOT_IN_CURRENT_MEBI_INVENTORY')
        if by_path.get(str(keypath))!=card.get('sourceKeyDocumentSha256'):reasons.append('KEY_SOURCE_NOT_IN_CURRENT_MEBI_INVENTORY')
        if not card.get('yks07SourceEvidenceVerified') or card.get('answer') not in 'ABCDE':reasons.append('PRIOR_SOURCE_PROOF_NOT_VERIFIED')
        if not verify(card['image'],card['imageSha256']):reasons.append('PRIOR_CROP_MISSING_OR_CHANGED')
        pixel=card.get('pixelProof',{})
        if not pixel.get('path') or not verify(pixel['path'],pixel.get('sha256')):reasons.append('PRIOR_PIXEL_PROOF_MISSING_OR_CHANGED')
        identity={'sourceSha256':card['sourceSha256'],'sourcePath':str(path),'sourceCode':card['code']}
        if reasons:
            review.append({**identity,'reasons':reasons,'studentVisible':False,
                'queue':'MEBI_PRACTICE_2_REVIEW_QUEUE','status':'PRIOR_EVIDENCE_REVIEW_REQUIRED'});continue
        rows.append({'sourceEvidence':card,'sourceEvidenceManifest':str(source),
            'bank':'MEBI_PRACTICE_2','status':'PRIOR_BODY_KEY_PROOF_REUSED_TOPIC_REVIEW_REQUIRED',
            'studentVisible':False,'questionWrites':0,'noveltyCheckRequired':False,
            'contentAndTopicAcceptanceInherited':False})
    output={'status':'PRIOR_SOURCE_PROOF_RECONCILED','candidates':rows,
        'sourceCandidates':len(rows),'reviewQueueAdditions':review,'outsideMebiScope':outside,
        'originalManifestSha256':hashlib.sha256(source.read_bytes()).hexdigest(),
        'topicAcceptanceRequired':True,'questionWrites':0}
    write_json(BASE/'prior-source-proof-reuse.json',output)
    print(json.dumps({k:v for k,v in output.items() if k not in ('candidates','reviewQueueAdditions')}))


if __name__=='__main__':run()
