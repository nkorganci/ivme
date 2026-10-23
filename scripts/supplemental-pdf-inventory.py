"""Read PDFs outside the OGM folder, preserving hashes and page evidence.

The scope below is supported by the actual covers (booklets) and page text
(guides). Guidance summaries are secondary references, never official
curriculum approval. No answer keys become labels.
"""
import hashlib
import json
from pathlib import Path
import pymupdf

APP = Path(__file__).resolve().parents[1]
ROOT = APP.parent / 'Kaynaklar'
OUT = APP / 'veri/content-labels'
TYT = ['turkce', 'matematik', 'geometri', 'tarih', 'cografya', 'felsefe', 'din', 'fizik', 'kimya', 'biyoloji']
SAY = ['matematik', 'geometri', 'fizik', 'kimya', 'biyoloji']
SCOPE = {
    'TYT.pdf': ('TYT', [b for b in TYT if b != 'din']),
    'TYT_DinKulturu.pdf': ('TYT', ['din']),
    'AYT_DinKulturu_Sozel.pdf': ('AYT', ['din']),
    'AYT_Sayisal.pdf': ('AYT', SAY),
    'AYT_EsitAgirlik.pdf': ('AYT', ['edebiyat', 'tarih', 'cografya', 'matematik', 'geometri']),
    'AYT_Sozel.pdf': ('AYT', ['edebiyat', 'tarih', 'cografya', 'felsefe', 'psikoloji', 'sosyoloji', 'mantik']),
}


def unscoped_source(relative, checksum, pages, evidence, available=True):
    return {'id':500000000+int(hashlib.sha256(relative.encode()).hexdigest()[:7],16),
            'sourceTitle':Path(relative).stem,'exam':'UNKNOWN','subjectId':'unmapped',
            'source':'Yeni PDF — kaynak incelemesi','relativePath':relative,'sourceScope':'RESOURCES','grade':None,
            'availability':'available' if available else 'needs_repair','sourceSha256':checksum,'pageCount':pages,
            'headings':evidence,'explicitTargets':[{'categoryId':'system.kapsam-incelemesi'}],
            'explicitFormat':'KONU_ANLATIMI','reviewReasons':['NEW_SOURCE_REQUIRES_REVIEW','SCOPE_REQUIRES_MANUAL_REVIEW'],
            'pageSegments':[]}

def main():
    old_path = OUT / 'supplemental-pdf-inventory.json'
    old = {r['relativePath']: r for r in json.loads(old_path.read_text(encoding='utf8'))['sources']} if old_path.exists() else {}
    sources = []
    for p in sorted(ROOT.rglob('*.pdf')):
        if 'ogm-materyal' in p.relative_to(ROOT).parts:
            continue
        relative = p.relative_to(ROOT).as_posix()
        checksum = hashlib.sha256(p.read_bytes()).hexdigest()
        if old.get(relative, {}).get('sourceSha256') == checksum:
            sources.append(old[relative])
            continue
        if p.name not in SCOPE:
            evidence=[];pages=0;available=True
            try:
                with pymupdf.open(p) as document:
                    pages=len(document)
                    for n in range(min(3,pages)):
                        heading=' '.join(document[n].get_text().split())[:220]
                        if heading:evidence.append({'text':heading,'page':n+1,'method':'PDF_TEXT','reference':f'Kaynaklar/{relative}'})
            except (RuntimeError,pymupdf.FileDataError):available=False
            sources.append(unscoped_source(relative,checksum,pages,evidence,available))
            continue
        exam, branches = SCOPE[p.name]
        guide = relative.startswith('mufredat/')
        evidence = []
        with pymupdf.open(p) as doc:
            for n, page in enumerate(doc):
                text = page.get_text()
                method = 'PDF_TEXT'
                if n < 4 or guide:
                    heading = ' '.join(text.split())[:220]
                    if heading:
                        evidence.append({'text': heading, 'page': n+1, 'method': method,
                                         'reference': f'Kaynaklar/{relative}'})
            row = {'id': 500000000 + int(hashlib.sha256(relative.encode()).hexdigest()[:7], 16),
                'sourceTitle': p.stem.replace('_', ' '),
                'exam': exam, 'subjectId': branches[0] if len(branches) == 1 else 'genel',
                'source': 'İkincil rehberlik özeti' if guide else 'OGM çıkmış soru kitapçığı',
                'relativePath': relative, 'sourceScope': 'RESOURCES', 'grade': None,
                'availability': 'available', 'sourceSha256': checksum, 'pageCount': len(doc), 'headings': evidence,
                'explicitTargets': [{'exam': exam, 'subjectId': b,
                    'topic': 'Dersin genel kapsamı',
                    'subtopic': 'Müfredat ve soru dağılımı rehberi' if guide else 'Çıkmış soru kitapçıkları'} for b in branches],
                'explicitFormat': 'CALISMA_REHBERI' if guide else 'TEST',
                'reviewReasons': ['SECONDARY_GUIDANCE_SOURCE'] if guide else ['BOOKLET_SCOPE_REQUIRES_REVIEW'],
                'pageSegments': []}
        sources.append(row)
        print(f'Read {relative}: {row["pageCount"]} pages', flush=True)
    OUT.mkdir(exist_ok=True, parents=True)
    old_path.write_text(json.dumps({'version': 1, 'sources': sources}, ensure_ascii=False, indent=2)+'\n', encoding='utf8')
    (OUT / 'supplemental-page-ocr.json').unlink(missing_ok=True)
    print(json.dumps({'supplementalPdfs': len(sources)}))

if __name__ == '__main__':
    main()
