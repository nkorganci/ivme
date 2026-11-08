from pathlib import Path
import sys
import unittest
import pymupdf
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from yks_birlestirme import Store,read_json,digest
from yks_istisna_kirpim import verify_image


class DinBookBodiesTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        s=Store(Path(__file__).resolve().parents[1]/'veri/yks-birlestirme');cls.root=s.child(s.current()['runId'])
        cls.report=read_json(cls.root/'new-book-bodies/din/progress.json')

    def test_643_present_bodies_keep_586_bindings_and_block_entire_57_question_mismatched_sections(self):
        self.assertEqual(self.report['status'],'COMPLETE');self.assertEqual(self.report['questionsPrepared'],643)
        self.assertEqual(self.report['technicallyPreparedQuestions'],586)
        blocked=[r for r in self.report['results'] if r['status']=='EXCLUDED_CURRENT_SOURCE_BODY_KEY_COUNT_MISMATCH']
        self.assertEqual(len(blocked),2);self.assertEqual(sum(r['questions'] for r in blocked),57)
        self.assertEqual(sum(len(r['unboundPrintedAnswerNumbers']) for r in blocked),4)
        for row in self.report['results']:
            self.assertEqual(digest(row['package']),row['packageSha256'])
            for card in read_json(row['package'])['cards']:
                self.assertEqual(digest(card['image']),card['imageSha256']);self.assertEqual(digest(card['pixelProof']['path']),card['pixelProof']['sha256'])
                if row in blocked:
                    self.assertIsNone(card['answer']);self.assertIn(card['unverifiedPrintedKeyAnswerCandidate'],'ABCDE')
                else:self.assertIn(card['answer'],'ABCDE')
                self.assertFalse(card['teacherApproved']);self.assertEqual(card['importDecision'],'NOT_ACCEPTED_FOR_IMPORT')

    def test_actually_read_number_swap_preserves_physical_positions_and_binds_by_printed_number(self):
        row=next(r for r in self.report['results'] if r['sourceSha256'].startswith('329433') and r['sectionName']=='1')
        self.assertEqual(row['status'],'PREPARED');self.assertTrue(row['explicitlyReadSwappedFinalNumberPositions'])
        self.assertEqual(row['originalPhysicalQuestionOrder'][-2:],[26,25]);self.assertFalse(row['sequenceMatchesPrintedKey'])
        cards=read_json(row['package'])['cards'];self.assertEqual([c['printedNumber'] for c in cards][-2:],[26,25])
        key=next(r for r in read_json(self.root/'new-book-keys/din/progress.json')['results'] if r['sourceSha256']==row['sourceSha256'] and r['sectionName']=='1')
        answers={a['number']:a['answer'] for a in key['nativePrintedAnswers']}
        for card in cards:self.assertEqual(card['answer'],answers[card['printedNumber']])

    def test_original_topic_ribbon_pixels_are_bound_to_their_question_without_polluting_stem_evidence(self):
        row=next(r for r in self.report['results'] if r['sourceSha256'].startswith('329433') and r['sectionName']=='past-exams')
        package=read_json(row['package']);card=next(c for c in package['cards'] if c['printedNumber']==31)
        self.assertEqual(card['sourceRegions'][0]['role'],'ORIGINAL_PRINTED_SOURCE_TOPIC_RIBBON')
        self.assertNotIn('İslam Ahlakında Yerilen Bazı Davranışlar',card['text'])
        self.assertEqual(len(card['sourceTopicRibbons']),1)
        with pymupdf.open(package['sourcePath']) as doc:verify_image(doc,card['sourceRegions'],card['image'])


if __name__=='__main__':unittest.main()
