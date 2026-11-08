"""Isolate PDF tag warnings from original glyph layout and raster content.

Never repair/overwrite the PDF, discard native observations or approve questions.
ActualText alternatives are kept in the earlier observations; this view uses
visible glyph positions only. Damaged streams stay quarantined.
"""
from collections import Counter
import hashlib
import math
from pathlib import Path
import re

import pymupdf
from yks_birlestirme import Store,read_json,write_json,digest,process_lock
from yks_pilot_kaynaklari import APP

FLAGS=pymupdf.TEXTFLAGS_TEXT|pymupdf.TEXT_IGNORE_ACTUALTEXT


def tag_only(warning):
    lines=[s.strip() for s in warning.splitlines() if s.strip()]
    return bool(lines) and all(s in {
        'ActualText with no position. Text may be lost or mispositioned.',
        'Repairing missing parent (P) in parent tree nodes'} or re.fullmatch(r'\.\.\. repeated \d+ times\.\.\.',s) for s in lines)


def inspect(row):
    sha=row['sourceSha256'];source=Path(row['sourcePath'])
    if digest(source)!=sha:raise ValueError('Source changed before tag/glyph check')
    bad=[i for i in row['issues'] if not tag_only(i.get('decoderWarning',i.get('warning','')))]
    if bad:return {'sourceSha256':sha,'sourcePath':str(source),'status':'DAMAGED_OR_NON_TAG_STREAM_REVIEW_REQUIRED',
        'issues':bad,'bodyContentAccepted':False,'sourceWrites':0,'questionBankWrites':0,'teacherApproved':False}
    pages=[];pymupdf.TOOLS.mupdf_warnings(reset=True)
    with pymupdf.open(source) as doc:
        opening=pymupdf.TOOLS.mupdf_warnings(reset=True)
        if opening and not tag_only(opening):raise ValueError('New non-tag opening warning')
        for number in sorted({i['page'] for i in row['issues'] if i['page'] is not None}):
            pymupdf.TOOLS.mupdf_warnings(reset=True);page=doc[number-1]
            original=page.get_text();original_warning=pymupdf.TOOLS.mupdf_warnings(reset=True)
            glyph_text=page.get_text(flags=FLAGS);glyphs=page.get_text('dict',flags=FLAGS)
            glyph_warning=pymupdf.TOOLS.mupdf_warnings(reset=True)
            if glyph_warning and not tag_only(glyph_warning):raise ValueError('Non-tag glyph decoding warning')
            pixmap=page.get_pixmap(dpi=row['renderDpi'],alpha=False);raster_warning=pymupdf.TOOLS.mupdf_warnings(reset=True)
            if raster_warning and not tag_only(raster_warning):raise ValueError('Render has a non-tag decoding warning')
            raster=hashlib.sha256(pixmap.samples).hexdigest();prior=row['pages'][number-1]
            if raster!=prior['rgbSha256'] or [pixmap.width,pixmap.height]!=prior['renderedPixels']:
                raise ValueError('Original rendered source pixels changed')
            lines=[{'text':''.join(s['text'] for s in line['spans']),'bbox':list(line['bbox'])}
                for block in glyphs['blocks'] for line in block.get('lines',[])]
            if not lines or any(len(l['bbox'])!=4 or not all(math.isfinite(v) for v in l['bbox']) or
                l['bbox'][0]>=l['bbox'][2] or l['bbox'][1]>=l['bbox'][3] for l in lines):
                raise ValueError('Missing/invalid original glyph position')
            pages.append({'page':number,'originalText':original,'originalWarning':original_warning,
                'glyphText':glyph_text,'glyphLines':lines,'glyphExtractionWarning':glyph_warning,
                'renderWarning':raster_warning,'rgbSha256':raster,'matchesOriginalPixelProof':True,
                'extractionFlags':FLAGS,'semanticTextAccepted':False,'bodyContentAccepted':False})
    if digest(source)!=sha:raise ValueError('Source changed during tag/glyph check')
    return {'sourceSha256':sha,'sourcePath':str(source),'status':'TAG_METADATA_WARNINGS_ISOLATED_ORIGINAL_RENDER_UNCHANGED',
        'pages':pages,'affectedPages':len(pages),'originalAlternativeTextPreserved':True,
        'visibleGlyphLayoutAvailable':True,'questionCropExtractionMustUseFlags':FLAGS,
        'semanticTextAccepted':False,'bodyContentAccepted':False,'sourceWrites':0,'questionBankWrites':0,'teacherApproved':False}


def main():
    store=Store(APP/'veri/yks-birlestirme');root=store.child(store.current()['runId']);source=root/'pdf-on-tarama/mock-decoding/report.json'
    original=read_json(source)
    if original['status']!='COMPLETE':raise ValueError('Complete original native/raster decoding check first')
    folder=root/'pdf-on-tarama/mock-tag-review';folder.mkdir(exist_ok=True);results=[];hits=0
    with process_lock(folder/'.writer.lock'):
        for row in original['results']:
            if not row['issues']:continue
            identity={'sourceSha256':row['sourceSha256'],'originalDecodeReportSha256':digest(source),
                'rendererVersion':pymupdf.VersionBind,'flags':FLAGS,'toolSha256':digest(Path(__file__))}
            file=folder/(row['sourceSha256']+'.json');old=read_json(file) if file.is_file() else {}
            if old.get('identity')==identity:
                if digest(row['sourcePath'])!=row['sourceSha256']:raise ValueError('Saved tag source changed')
                result=old['result'];hits+=1
            else:result=inspect(row);write_json(file,{'identity':identity,'result':result})
            results.append({**{k:v for k,v in result.items() if k not in ['pages']},'evidencePath':str(file),'evidenceSha256':digest(file)})
        report={'status':'COMPLETE','scope':'ONLY_PREVIOUSLY_WARNED_MOCK_SOURCE_PAGES_TAG_AND_GLYPH_LAYOUT_CHECK',
            'documents':len(results),'states':dict(Counter(r['status'] for r in results)),
            'checkedTagPages':sum(r.get('affectedPages',0) for r in results),'cachedSourcesThisPass':hits,
            'originalDecodeReportSha256':digest(source),'sourceWrites':0,'questionBankWrites':0,'teacherApproved':False,'results':results}
        write_json(folder/'report.json',report)
    print({k:v for k,v in report.items() if k!='results'})


if __name__=='__main__':main()
