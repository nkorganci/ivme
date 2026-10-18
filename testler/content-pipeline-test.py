import argparse
import json
import importlib.util
from pathlib import Path
import tempfile
import unittest
import sys

APP = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(APP / 'scripts'))


def module(name, filename):
    spec = importlib.util.spec_from_file_location(name, APP / 'scripts' / filename)
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


pipeline = module('pipeline', 'content-label-refresh.py')
pdf = module('pdf_locations', 'pdf-topic-locations.py')
fallback = module('pdf_fallback', 'pdf-readability-fallback.py')
supplemental = module('supplemental_inventory', 'supplemental-pdf-inventory.py')
import pdf_ocr_cache


class PipelineTest(unittest.TestCase):
    def test_unknown_pdf_enters_controlled_manual_scope_without_inventing_subject(self):
        source=supplemental.unscoped_source('new/new.pdf','a'*64,4,[])
        self.assertEqual(source['exam'],'UNKNOWN')
        self.assertEqual(source['explicitTargets'],[{'categoryId':'system.kapsam-incelemesi'}])
        self.assertIn('SCOPE_REQUIRES_MANUAL_REVIEW',source['reviewReasons'])
        broken=supplemental.unscoped_source('new/broken.pdf','b'*64,0,[],False)
        self.assertEqual(broken['availability'],'needs_repair')
    def test_topic_boundaries_do_not_cross_unreadable_pages_or_reuse_another_topic(self):
        pages=[dict(page=n,needsOcr=n==4,isContents=False) for n in range(1,9)]
        self.assertEqual(pdf.bounded_ranges([pages[1]],pages,{2,7}),[dict(start=2,end=3,nextTopicPage=7)])
        self.assertEqual(pdf.bounded_ranges([pages[6]],pages,{2,7}),[dict(start=7,end=7,nextTopicPage=None)])
    def test_sparse_diagrams_are_not_classified_as_blank(self):
        self.assertEqual(fallback.disposition('',0),'BLANK_CANDIDATE')
        self.assertEqual(fallback.disposition('Met büyük alt birim',.08),'VISUAL_OR_UNREADABLE')
        self.assertEqual(fallback.disposition('Bu sayfada okunabilen yeterince uzun bir konu açıklaması var.',.02),'EXTRACTED')
    def test_resume_rejects_changed_inputs_and_changed_output(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / 'input').write_text('old')
            (root / 'output').write_text('result')
            step = dict(inputs=['input'], outputs=['output'])
            saved = dict(status='COMPLETE', inputSignature=pipeline.input_signature(root, ['input']),
                         outputs={'output': pipeline.file_hash(root / 'output')})
            self.assertTrue(pipeline.can_resume(step, saved, root))
            (root / 'output').write_text('tampered')
            self.assertFalse(pipeline.can_resume(step, saved, root))
            (root / 'output').write_text('result')
            (root / 'input').write_text('new')
            self.assertFalse(pipeline.can_resume(step, saved, root))

    def test_failed_and_database_dependent_stages_do_not_skip(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            self.assertFalse(pipeline.can_resume(dict(inputs=[], always=True), {'status':'COMPLETE'}, root))
            self.assertFalse(pipeline.can_resume(dict(inputs=[]), {'status':'FAILED'}, root))

    def test_check_mode_never_generates_ocr_or_publishes(self):
        args = argparse.Namespace(check=True, publish=False, limit=None, database='ivme')
        commands = [' '.join(s['command']) for s in pipeline.stages('node', args)]
        self.assertFalse(any('headings.py' in c or 'publish.py' in c or 'pdf-topic-locations' in c for c in commands))
        self.assertTrue(any('content-labels.mjs --check' in c for c in commands))

    def test_bounded_ocr_follows_scan_and_remaps_before_labels(self):
        args = argparse.Namespace(check=False,publish=False,limit=None,ocr_pages=3,database='ivme')
        steps = pipeline.stages('node',args)
        names = [s['name'] for s in steps]
        self.assertLess(names.index('pdf-pages'),names.index('pdf-ocr'))
        self.assertLess(names.index('pdf-ocr'),names.index('pdf-ocr-remap'))
        self.assertLess(names.index('pdf-ocr-remap'),names.index('labels'))
        self.assertEqual(steps[names.index('pdf-ocr')]['command'][-2:],['--limit','3'])

    def test_pdf_contents_page_is_not_a_topic_anchor(self):
        category = dict(topic='Hareket', subtopic='')
        pages = [dict(page=1, headings=['Hareket'], needsOcr=False, isContents=True),
                 dict(page=8, headings=['Hareket'], needsOcr=False, isContents=False)]
        self.assertEqual([p['page'] for p in pdf.match_pages(category, pages, [])], [8])

    def test_unreadable_and_general_scope_do_not_get_fabricated_ranges(self):
        pages = [dict(page=1, headings=['Hareket'], needsOcr=True, isContents=False)]
        self.assertEqual(pdf.match_pages(dict(topic='Hareket'), pages, []), [])
        self.assertEqual(pdf.match_pages(dict(topic='Dersin genel kapsamı'), pages, []), [])

    def test_ocr_contents_and_unreadable_pages_are_not_topic_coverage(self):
        page = dict(page=1,headings=[],needsOcr=True,isContents=False)
        contents = pdf.with_ocr(page,dict(status='EXTRACTED',text='İÇİNDEKİLER',textSha256='ocr-1',headings=['Hareket']))
        self.assertEqual(pdf.match_pages(dict(topic='Hareket'),[contents],[]),[])
        unreadable = pdf.with_ocr(page,dict(status='UNREADABLE_OR_BLANK',text='',textSha256='ocr-2',headings=['Hareket']))
        self.assertEqual(pdf.match_pages(dict(topic='Hareket'),[unreadable],[]),[])
        readable = pdf.with_ocr(page,dict(status='EXTRACTED',text='Hareket',textSha256='ocr-3',headings=['Hareket']))
        self.assertEqual(pdf.match_pages(dict(topic='Hareket'),[readable],[])[0]['page'],1)
        self.assertEqual(readable['extractionMethod'],'PAGE_OCR_HEADING')

    def test_ocr_resume_rejects_corrupted_text_and_changed_identity(self):
        with tempfile.TemporaryDirectory() as folder:
            original = pdf_ocr_cache.STATE
            try:
                pdf_ocr_cache.STATE = Path(folder)
                file = pdf_ocr_cache.cache_path('pdf-sha',1,'model-sha')
                file.parent.mkdir()
                record = dict(sourceSha256='pdf-sha',page=1,modelSha256='model-sha',
                              extractorVersion=pdf_ocr_cache.VERSION,text='text',
                              textSha256=__import__('hashlib').sha256(b'text').hexdigest())
                file.write_text(json.dumps(record),encoding='utf-8')
                self.assertEqual(pdf_ocr_cache.read_page('pdf-sha',1,'model-sha')['text'],'text')
                self.assertIsNone(pdf_ocr_cache.read_page('changed-pdf',1,'model-sha'))
                self.assertIsNone(pdf_ocr_cache.read_page('pdf-sha',2,'model-sha'))
                self.assertIsNone(pdf_ocr_cache.read_page('pdf-sha',1,'changed-model'))
                record['text']='tampered'
                file.write_text(json.dumps(record),encoding='utf-8')
                with self.assertRaisesRegex(ValueError,'checksum'):
                    pdf_ocr_cache.read_page('pdf-sha',1,'model-sha')
            finally:
                pdf_ocr_cache.STATE = original

    def test_pdf_alias_rules_use_the_controlled_source(self):
        import json
        registry = json.loads((APP / 'backend/src/main/resources/content-taxonomy.json').read_text(encoding='utf-8'))
        rules = [r for r in registry['aliasRules'] if 'pdf' in r['profiles']]
        self.assertEqual(pdf.alias('Kelime Anlam', rules), pdf.alias('Sözcükte anlam', rules))
        self.assertEqual(pdf.alias('Newton Kanunları', rules), pdf.alias('Newton Yasaları', rules))


if __name__ == '__main__':
    unittest.main()
