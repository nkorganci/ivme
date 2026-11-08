from pathlib import Path
import sys
import unittest
import pymupdf

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from yks_govde_istisna_incele import terminal_options,continuation_region,inspect,READINGS
from yks_birlestirme import Store,read_json
from yks_pilot_sorular import source_lines
from yks_kirpim_istisna import layout_regions


class BodyExceptionTest(unittest.TestCase):
    def test_embedded_labels_require_explicit_source_reading(self):
        text='S(A union B) = 7\nA) 3\nB) 4\nC) 5\nD) 6\nE) 7'
        with self.assertRaises(ValueError):terminal_options(text)
        self.assertEqual(terminal_options(text,True)['embeddedLabels'],['B'])
        for invalid in ['A) a B) b C) c D) d','A) a B) b C) c D) d E) e E) another']:
            with self.assertRaises(ValueError):terminal_options(invalid,True)

    def test_all_six_real_source_bodies_keep_full_sequence_and_keys_unapproved(self):
        app=Path(__file__).resolve().parents[1];store=Store(app/'veri/yks-birlestirme');root=store.child(store.current()['runId'])
        rows=read_json(root/'pdf-on-tarama/full-key-scan/progress.json')['results'];total=0
        for prefix in READINGS:
            original=next(r for r in rows if r['sourceSha256'].startswith(prefix));result=inspect(original)
            self.assertFalse(result['sourceKeysApproved']);self.assertFalse(result['pixelsAndContentAccepted'])
            self.assertEqual([c['printedNumber'] for c in result['cards']],list(range(1,result['questions']+1)));total+=result['questions']
        self.assertEqual(total,94)

    def test_different_column_continuation_is_not_silently_used(self):
        with pymupdf.open() as doc:
            page=doc.new_page()
            regions=[{'number':1,'column':0,'bboxPt':[30,100,290,700]},
                {'number':2,'column':0,'bboxPt':[30,710,290,800]}]
            with self.assertRaises(ValueError):continuation_region(page,regions,1,2)


if __name__=='__main__':unittest.main()
