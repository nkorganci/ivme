from collections import Counter
from pathlib import Path
from types import SimpleNamespace
import sys
import unittest

import pymupdf
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from yks_yeni_pdf_soru_kesfi import eligible,discover_page


class NewSourceDiscoveryTest(unittest.TestCase):
    def test_processed_and_sidebar_diagnostic_sources_are_not_extracted_again(self):
        group={'processingCandidate':'NOT_PREVIOUSLY_ASSESSED','occurrences':[{'root':'D:/workspace/mebi-yks','path':'TYT/Fizik/PDF/note.pdf'}]}
        self.assertTrue(eligible(group))
        for path in ['Deneme-Tarama/Taramalar/TYT/Fizik/a.pdf','Deneme-Tarama/Denemeler/2026/TYT/a.pdf']:
            group['occurrences'][0]['path']=path;self.assertFalse(eligible(group))
        group['occurrences'][0]['path']='TYT/Fizik/PDF/note.pdf';group['processingCandidate']='REUSE_TRANSFER_EVIDENCE_CANDIDATE'
        self.assertFalse(eligible(group))

    def test_unkeyed_or_incomplete_option_region_is_never_import_eligible(self):
        with pymupdf.open() as doc:
            page=doc.new_page()
            for index,text in enumerate(['Soru','A) Alpha','B) Beta','C) Gamma','D) Delta']):page.insert_text((35,100+index*20),text)
            engine=SimpleNamespace(questions=lambda _page:[])
            rows=discover_page(page,{},Counter(),1,engine)
            self.assertEqual(len(rows),1);self.assertEqual(rows[0]['optionLabels'],list('ABCD'))
            self.assertFalse(rows[0]['importEligible']);self.assertFalse(rows[0]['teacherApproved']);self.assertNotIn('answer',rows[0])

    def test_outside_page_region_is_rejected(self):
        with pymupdf.open() as doc:
            page=doc.new_page()
            engine=SimpleNamespace(questions=lambda _page:[{'tur':'soru','number':1,'bbox':[-1,100,500,200],'text':'A) a B) b C) c D) d E) e'}])
            with self.assertRaises(ValueError):discover_page(page,{},Counter(),1,engine)


if __name__=='__main__':unittest.main()
