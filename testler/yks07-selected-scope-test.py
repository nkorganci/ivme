"""A completed source stage must not invent content acceptance or retry failures."""
import copy
import json
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'scripts'))
from yks_birlestirme import Store, read_json, digest
from yks07_secili_kapsam import source_problems, scope_problems, FOLDER


class SelectedScopeTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        store=Store(Path(__file__).resolve().parents[1]/'veri/yks-birlestirme')
        cls.root=store.child(store.current()['runId']);cls.folder=cls.root/FOLDER

    def pair(self):
        return ({'answer':'C','keyEvidenceSha256':'proof','image':'original.webp',
            'imageSha256':'pixels','sourceRegions':[{'pdfPage':1,'bboxPt':[0,0,10,10]}],
            'sourceKeyPage':4,'sourceKeyDocumentSha256':'source','pixelProof':{'path':'crop.json','sha256':'p'},
            'optionCounts':{c:1 for c in 'ABCDE'}},
            {'answer':'C','evidenceSha256':'proof','physicalKeyPage':4,'keySourceSha256':'source'})

    def test_missing_or_conflicting_key_never_advances(self):
        card,key=self.pair()
        self.assertEqual(source_problems(card,key),[])
        self.assertTrue(source_problems(card,None))
        changed={**key,'answer':'D'}
        self.assertTrue(source_problems(card,changed))
        for field,value in [('sourceKeyPage',5),('sourceKeyDocumentSha256','another'),
                            ('keyEvidenceSha256','another')]:
            self.assertTrue(source_problems({**card,field:value},key))

    def test_missing_pixels_or_native_failure_is_final_exclusion(self):
        card,key=self.pair()
        before=copy.deepcopy(card)
        for field in ['pixelProof','sourceRegions','image']:
            changed={**card,field:None}
            self.assertTrue(source_problems(changed,key))
        self.assertTrue(source_problems({**card,'reviewConcerns':['NATIVE_GLYPH_REQUIRES_VISUAL_READING']},key))
        self.assertTrue(source_problems({**card,'optionCounts':{'A':1,'B':2,'D':1,'E':1}},key))
        self.assertEqual(card,before)

    def test_printed_discipline_exception_is_not_hidden_by_an_empty_subject_flag(self):
        row={'sourceSubjectReviewRequired':False,'examAssociationReviewRequired':False,
             'controlledCandidateState':'PRINTED_DISCIPLINE_RANGE_REVIEW_REQUIRED'}
        self.assertTrue(scope_problems(row))
        self.assertEqual(scope_problems({**row,'controlledCandidateState':'CONTENT_OR_IMAGE_REVIEW_REQUIRED'}),[])

    def test_every_pdf_and_physical_page_has_one_reasoned_final_disposition(self):
        report=read_json(self.folder/'report.json')
        coverage=read_json(self.root/'full-source-coverage/report.json')
        sources=read_json(self.folder/'source-dispositions.json')['results']
        pages=[json.loads(l) for l in (self.folder/'page-dispositions.jsonl').read_text(encoding='utf-8').splitlines()]
        self.assertEqual(len(sources),coverage['uniquePdfs'])
        self.assertEqual(len(pages),coverage['observedPages'])
        self.assertEqual(len({(r['sourceSha256'],r['pdfPage']) for r in pages}),len(pages))
        self.assertTrue(all(not r['absenceClaimed'] for r in pages))
        self.assertTrue(all(not r['retryAllowed'] and r['existingIdsPreserved'] for r in sources))
        self.assertTrue(all(r['observedPages']==r['physicalPages'] for r in sources))
        self.assertEqual(sum(report['sourceActions'].values()),len(sources))

    def test_selected_questions_have_two_key_readings_without_new_or_teacher_acceptance(self):
        report=read_json(self.folder/'report.json')
        cards=read_json(self.folder/'source-candidates.json')['cards']
        decisions=read_json(self.folder/'question-dispositions.json')['results']
        by_code={c['sourceCode']:c for c in cards}
        self.assertEqual(len(cards),report['selectedSourceEvidenceQuestions'])
        self.assertEqual(len({r['sourceCode'] for r in decisions}),len(decisions))
        self.assertEqual(len(decisions),report['questionObservationsDisposed'])
        original=read_json(self.root/'source-intake-queue/report.json')
        original_by_code={r['sourceCode']:r for r in original['results']}
        for row in decisions:
            if row['sourceCode'] in original_by_code:
                self.assertEqual(row['existingCanonicalCodes'],original_by_code[row['sourceCode']]['existingCanonicalCodes'])
            if row['action']=='EXCLUDE_NO_RETRY':self.assertNotIn(row['sourceCode'],by_code)
            self.assertFalse(row['learnerVisible'] or row['productionImportAllowed'])
        for c in cards:
            self.assertTrue(c['yks07SourceEvidenceVerified'])
            self.assertEqual(c['printedAnswer'],c['sourceKeyProof']['answer'])
            self.assertIn(c['printedAnswer'],'ABCDE')
            self.assertTrue(c['sourceKeyProof']['readingMethod'])
            self.assertFalse(c['teacherApproved'] or c['questionContentAccepted'] or c['fineTopicAccepted']
                             or c['noveltyAccepted'] or c['productionImportAllowed'])
        for p,sha in report['outputs'].items():self.assertEqual(digest(p),sha)
        self.assertEqual(report['newModelCalls']+report['newOcrCalls']+report['newRenders']+
                         report['sourceRepairAttempts']+report['questionBankWrites'],0)


if __name__=='__main__':unittest.main()
