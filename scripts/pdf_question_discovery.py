"""Find unaccounted multiple-choice regions in every YKS PDF, including lesson notes.

No answer is inferred and no question is imported. Stable source/page/rectangle
locators make the candidate queue resumable and prevent repeated extraction.
"""
from collections import Counter, defaultdict
import hashlib
import importlib.util
import json
from pathlib import Path
import re

import pymupdf

from pdf_source_scan import APP, OUT, ROOT, read_scan, read_evidence_scan, write_json

VERSION = 'mc-region-discovery-v3'
OPTION = re.compile(r'(?:^|\s)([A-E])\s*\)')


def main():
    reconciliation = json.loads((OUT / 'reconciliation.json').read_text(encoding='utf-8'))
    files = {f['sha256']: f for f in reconciliation['files']}
    known = defaultdict(list)
    for occurrence in reconciliation['occurrences']:
        # A previous discovery candidate is not proof that its source question was
        # imported. Otherwise the second scan silently erases its own work queue.
        if occurrence['evidence'].get('origin')=='PAGE_QUESTION_REGION':continue
        known[occurrence['sha256'], occurrence['page']].append(occurrence)
    spec = importlib.util.spec_from_file_location('pdf_text_regions', APP / 'scripts/pdf-metin.py')
    extractor = importlib.util.module_from_spec(spec); spec.loader.exec_module(extractor)
    # Visual detection is a later crop review; discovering candidates needs no raster pass.
    extractor.visual_inside = lambda *args: (True, 0)
    def text_lines(page):
        # Default dict extraction also decodes embedded page images, which this
        # text-only pass does not consume.
        return [{'text':''.join(s['text'] for s in line['spans']).strip(),'bbox':list(line['bbox'])}
            for block in page.get_text('dict',flags=pymupdf.TEXTFLAGS_TEXT)['blocks']
            for line in block.get('lines',[]) if ''.join(s['text'] for s in line['spans']).strip()]
    extractor.lines_of=text_lines
    pymupdf.TOOLS.mupdf_display_errors(False)
    pymupdf.TOOLS.mupdf_display_warnings(False)
    candidates, examined, ambiguous = [], 0, []
    previous_path = OUT / 'discovery.json'
    checkpoint_path=OUT/'discovery-checkpoint.json'
    resume=checkpoint_path if checkpoint_path.exists() and (not previous_path.exists() or checkpoint_path.stat().st_mtime>previous_path.stat().st_mtime) else previous_path
    previous = json.loads(resume.read_text(encoding='utf-8')) if resume.exists() else {}
    cached = previous.get('bySource', {}) if previous.get('version') == VERSION else {}
    by_source = {};cache_evidence={};ambiguous_by_source={}
    for source in reconciliation['documents']:
        sha = source['sha256']
        evidence = source['coverageEvidence']
        if evidence['rawProfile'] or evidence.get('providerPrintCheck') or source['coverageState'] in ('VERIFIED','NO_QUESTIONS'):
            continue
        identity=hashlib.sha256(json.dumps([source.get('ocrEvidenceSha256'),
            sorted((page,tuple(o['numbers'])) for (s,page),items in known.items() if s==sha for o in items)],sort_keys=True).encode()).hexdigest()
        cache_evidence[sha]=identity
        if sha in cached and previous.get('cacheEvidence',{}).get(sha)==identity:
            by_source[sha] = cached[sha]
            candidates.extend(cached[sha])
            ambiguous_by_source[sha]=previous.get('ambiguousBySource',{}).get(sha,[])
            ambiguous.extend(ambiguous_by_source[sha])
            continue
        observations = read_evidence_scan(sha,for_review=True)
        question_pages = [p for p in observations['pages'] if len(p['options']) >= 4]
        if not question_pages:
            by_source[sha] = []
            continue
        repeated = Counter(line.strip() for p in observations['pages'] for line in set(p['text'].splitlines()) if line.strip())
        local = [];local_ambiguous=[]
        with pymupdf.open(ROOT / files[sha]['path']) as document:
            for observed in question_pages:
                page = document[observed['page'] - 1]
                regions = [q for q in extractor.questions(page) if q['tur'] == 'soru'
                           and len(set(OPTION.findall(q['text']))) >= 4]
                if not regions:
                    # Slide-style questions often say "Soru" without a printed number.
                    lines = [line for line in extractor.lines_of(page)
                             if repeated[line['text']] < max(3,len(document)*.35)]
                    counts = Counter(OPTION.findall('\n'.join(line['text'] for line in lines)))
                    if len(counts) >= 4 and max(counts.values()) == 1 and lines:
                        regions = [{'number': None, 'text': '\n'.join(line['text'] for line in lines),
                                    'bbox': [min(l['bbox'][0] for l in lines),min(l['bbox'][1] for l in lines),
                                             max(l['bbox'][2] for l in lines),max(l['bbox'][3] for l in lines)]}]
                    else:
                        local_ambiguous.append({'sha256':sha,'page':observed['page'],'reason':'MULTIPLE_OR_AMBIGUOUS_QUESTION_REGIONS'})
                for region in regions:
                    if any(region['number'] in occurrence['numbers'] for occurrence in known[sha,observed['page']] if region['number'] is not None):
                        continue
                    bbox = [round(v,1) for v in region['bbox']]
                    key = hashlib.sha256(json.dumps([sha,observed['page'],bbox,VERSION]).encode()).hexdigest()[:24]
                    local.append({'sha256':sha,'locator':'region:'+key,'page':observed['page'],
                                  'number':region['number'],'bbox':bbox,'text':region['text'],
                                  'textSha256':hashlib.sha256(region['text'].encode()).hexdigest(),
                                  'status':'ANSWER_DUPLICATE_CROP_AND_CATEGORY_REVIEW_REQUIRED'})
        by_source[sha] = local
        ambiguous_by_source[sha]=local_ambiguous;ambiguous.extend(local_ambiguous)
        candidates.extend(local)
        examined += 1
        if examined % 40 == 0:
            write_json(checkpoint_path, {'version':VERSION,'bySource':by_source,'cacheEvidence':cache_evidence,
                'ambiguousBySource':ambiguous_by_source,'candidates':candidates,'ambiguousPages':ambiguous})
            print(f'Discovery: {examined} PDFs with question pages, {len(candidates)} unaccounted regions', flush=True)
    write_json(previous_path, {'version':VERSION,'bySource':by_source,'cacheEvidence':cache_evidence,
        'ambiguousBySource':ambiguous_by_source,'candidates':candidates,'ambiguousPages':ambiguous})
    print(json.dumps({'candidateRegions':len(candidates),'ambiguousPages':len(ambiguous),'sources':len(by_source)}),flush=True)


if __name__ == '__main__': main()
