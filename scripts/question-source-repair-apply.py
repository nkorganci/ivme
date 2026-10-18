"""Install reviewed PDF renderings as hash-bound overrides; preserve originals and learner rows."""
import hashlib
import json
from pathlib import Path
from PIL import Image

APP=Path(__file__).resolve().parents[1]
STATE=APP/'veri/content-labels/source-repair'

def checksum(path):
    with path.open('rb') as stream:return hashlib.file_digest(stream,'sha256').hexdigest()

def main():
    preview=json.loads((STATE/'manifest.json').read_text(encoding='utf-8'))
    sources={p['key']:p for p in json.loads((APP/'backend/src/main/resources/pdf-review-labels.json').read_text(encoding='utf-8'))['items']}
    root=APP/'veri/resimler-pilot';target=root/'onarilmis';target.mkdir(exist_ok=True)
    records=[]
    # Validate the entire package before installing any override.
    for record in preview['records']:
        original=root/record['oldImage'];candidate=APP/record['candidateImage'];proof=record['sourcePdf']
        source=APP.parent/'Kaynaklar/ogm-materyal'/sources[proof['sourceKey']]['relativePath']
        if checksum(original)!=record['oldImageSha256'] or checksum(candidate)!=record['candidateImageSha256'] or checksum(source)!=proof['sourceSha256']:
            raise ValueError('Repair evidence changed: '+record['key'])
        if not original.resolve().is_file() or not candidate.resolve().is_relative_to(STATE.resolve()):
            raise ValueError('Unexpected repair input path')
    for record in preview['records']:
        relative=Path(record['oldImage']);output=target/relative
        if relative.is_absolute() or '..' in relative.parts:raise ValueError('Unsafe image path')
        output.parent.mkdir(parents=True,exist_ok=True)
        temp=output.with_suffix('.tmp.webp')
        with Image.open(APP/record['candidateImage']) as im:im.convert('RGB').save(temp,format='WEBP',lossless=True)
        temp.replace(output)
        records.append({**record,'state':'APPLIED_DERIVED_RENDER','renderedImage':output.relative_to(root).as_posix(),
            'renderedImageSha256':checksum(output),'originalSha256':record['oldImageSha256'],
            'originalImage':record['oldImage'],'sourceOrLearnerWrites':0})
    manifest={'version':1,'status':'APPLIED_DERIVED_RENDER','records':records,'sourceOrLearnerWrites':0}
    payload=json.dumps(manifest,ensure_ascii=False,indent=2)+'\n'
    pending=target/'manifest.tmp';pending.write_text(payload,encoding='utf-8');pending.replace(target/'manifest.json')
    (STATE/'applied.json').write_text(payload,encoding='utf-8')
    print(json.dumps({'status':manifest['status'],'records':len(records),'sourceOrLearnerWrites':0}))

if __name__=='__main__':main()
