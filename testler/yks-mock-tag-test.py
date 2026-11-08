from pathlib import Path
import sys
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from yks_birlestirme import Store,read_json,digest
from yks_deneme_etiket_kontrol import tag_only,inspect,FLAGS


class MockTagTest(unittest.TestCase):
    def test_real_stream_errors_never_match_tag_warning_policy(self):
        warning='ActualText with no position. Text may be lost or mispositioned.\n... repeated 4 times...'
        self.assertTrue(tag_only(warning));self.assertFalse(tag_only(''))
        self.assertFalse(tag_only('library error: zlib error: invalid stored block lengths'))
        self.assertFalse(tag_only(warning+'\nread error; treating as end of file'))

    def test_real_damaged_stream_stays_blocked(self):
        s=Store(Path(__file__).resolve().parents[1]/'veri/yks-birlestirme');root=s.child(s.current()['runId'])
        row=next(r for r in read_json(root/'pdf-on-tarama/mock-decoding/report.json')['results'] if r['sourceSha256'].startswith('f8bbb5b413ae'))
        proof=inspect(row);self.assertEqual(proof['status'],'DAMAGED_OR_NON_TAG_STREAM_REVIEW_REQUIRED')
        self.assertEqual(proof['issues'][0]['page'],29);self.assertFalse(proof['bodyContentAccepted'])

    def test_actual_tag_pages_keep_alternative_text_and_unchanged_render(self):
        s=Store(Path(__file__).resolve().parents[1]/'veri/yks-birlestirme');root=s.child(s.current()['runId'])
        report=read_json(root/'pdf-on-tarama/mock-tag-review/report.json');self.assertEqual(report['checkedTagPages'],30)
        accepted=[r for r in report['results'] if r['status']=='TAG_METADATA_WARNINGS_ISOLATED_ORIGINAL_RENDER_UNCHANGED']
        self.assertEqual(len(accepted),20)
        for r in accepted:
            self.assertEqual(digest(r['sourcePath']),r['sourceSha256']);self.assertEqual(digest(r['evidencePath']),r['evidenceSha256'])
            for page in read_json(r['evidencePath'])['result']['pages']:
                self.assertIn('originalText',page);self.assertTrue(page['glyphLines']);self.assertTrue(page['matchesOriginalPixelProof'])
                self.assertFalse(page['semanticTextAccepted']);self.assertFalse(page['bodyContentAccepted']);self.assertEqual(page['extractionFlags'],FLAGS)


if __name__=='__main__':unittest.main()
