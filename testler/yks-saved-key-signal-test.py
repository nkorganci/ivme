from pathlib import Path
import sys
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from yks_kayitli_anahtar_kesfi import signals,classify
from yks_birlestirme import Store,read_json,digest
from yks_fizik_ozet_anahtar import key_numbers,key_box
from yks_fizik_ozet_anahtar_incele import actual_rows


class SavedKeySignalTest(unittest.TestCase):
    def test_all_retrieved_bank_images_are_actually_distinguished_without_inventing_novelty(self):
        store=Store(Path(__file__).resolve().parents[1]/'veri/yks-birlestirme');root=store.child(store.current()['runId'])
        report=read_json(root/'physics-summary-discovery/actual-bank-image-review.json')
        self.assertEqual(report['sourceCandidateRelationsActuallyRead'],24);self.assertEqual(report['distinctCanonicalImagesActuallyRead'],23)
        self.assertEqual(len({r['sourceRelationId'] for r in report['results']}),24)
        self.assertEqual(len(report['externalEvidenceFiles']),23)
        for row in report['results']:
            self.assertEqual(digest(row['viewedBankImagePath']),row['viewedBankImageSha256'])
            self.assertTrue(row['actualSourceAndCandidateImagesRead']);self.assertFalse(row['sameQuestionAccepted'])
            self.assertFalse(row['noveltyAccepted']);self.assertFalse(row['newQuestionAdmissionAccepted'])

    def test_actual_mirror_tasks_have_exact_same_leaf_pdf_support_but_no_publication(self):
        store=Store(Path(__file__).resolve().parents[1]/'veri/yks-birlestirme');root=store.child(store.current()['runId'])
        report=read_json(root/'physics-summary-topic-review/report.json')
        self.assertEqual(report['questions'],3);self.assertEqual(report['actualTopicPdfPagesRead'],4)
        self.assertFalse(report['categoryPublished']);self.assertFalse(report['newQuestionAdmissionAccepted'])
        self.assertEqual([r['sourcePrintedAnswer'] for r in report['results']],list('DDE'))
        for row in report['results']:
            self.assertEqual(row['categoryId'],'mebi.tyt.fizik.e02f14b7-83e9-4f55-9d23-08dc086eb842')
            self.assertTrue(row['fineTopicAcceptedForPreparation']);self.assertTrue(row['independentPhysicsConsistencyChecked'])
            self.assertFalse(row['productionCategoryAssociationWritten']);self.assertFalse(row['noveltyAccepted']);self.assertFalse(row['teacherApproved'])

    def test_all_seventy_five_effective_key_regions_keep_the_gap_and_do_not_bind_bodies(self):
        store=Store(Path(__file__).resolve().parents[1]/'veri/yks-birlestirme');root=store.child(store.current()['runId'])
        report=read_json(root/'physics-summary-effective-key-regions/report.json')
        self.assertEqual(report['status'],'COMPLETE');self.assertEqual(report['documents'],75)
        self.assertEqual(report['readPrintedRegionCells'],217);self.assertEqual(report['readContiguousRegionCells'],214)
        self.assertEqual(sum(r['contiguousPrintedNumbers'] for r in report['results']),74)
        for row in report['results']:
            self.assertFalse(row['sourceQuestionAnswersBound']);self.assertFalse(row['wholeSourceKeyCompletenessAccepted'])
            self.assertFalse(row['newQuestionAdmissionAccepted']);self.assertFalse(row['fineTopicAccepted'])
        gap=next(r for r in report['results'] if not r['contiguousPrintedNumbers'])
        self.assertTrue(gap['sourceSha256'].startswith('e707d7a0c8ee'))
        self.assertEqual([a['number'] for a in gap['printedRegionAnswers']],[1,2,4])
        coverage=read_json(root/'full-source-coverage/report.json')
        self.assertEqual(coverage['additionalSummaryPrintedRegionSnapshot']['readContiguousRegionCells'],214)
        self.assertEqual(coverage['separateBoundedSummaryPilotSnapshot']['questions'],3)
        self.assertFalse(coverage['fullYks07Accepted'])

    def test_actual_key_reading_preserves_printed_number_four_instead_of_inventing_number_three(self):
        self.assertEqual(actual_rows([(1,'E'),(2,'A'),(4,'D')]),[
            {'number':1,'answer':'E'},{'number':2,'answer':'A'},{'number':4,'answer':'D'}])
        store=Store(Path(__file__).resolve().parents[1]/'veri/yks-birlestirme');root=store.child(store.current()['runId'])
        report=read_json(root/'physics-summary-key-actual-review/report.json')
        self.assertEqual(report['regionsActuallyRead'],46);self.assertEqual(report['stripRegionsActuallyRead'],44)
        self.assertEqual(report['wholePagesActuallyReadForKeys'],2)
        for row in report['results']:
            self.assertEqual(digest(row['viewedBoardPath']),row['viewedBoardSha256'])
            self.assertFalse(row['sourceQuestionAnswersBound']);self.assertFalse(row['newQuestionAdmissionAccepted'])
        bad=next(r for r in report['results'] if r['sourceSha256'].startswith('e707d7a0c8ee'))
        self.assertEqual(bad['status'],'ACTUAL_PRINTED_NUMBER_GAP_HOLD_NO_RENUMBER')
        self.assertEqual([a['number'] for a in bad['actualPrintedAnswers']],[1,2,4]);self.assertFalse(bad['contiguousPrintedNumbers'])

    def test_strip_parser_cannot_accept_a_partial_or_duplicated_printed_list(self):
        for text in ['CEVAP ANAHTARI: 1-A, 1-B','CEVAP ANAHTARI: 1-E, 2B EXTRA',
                     'CEVAP ANAHTARI: 1-A, 3-B','CEVAP ANAHTARI: 1-E, 2-X']:
            with self.subTest(text=text):self.assertIsNone(key_numbers(text))
        self.assertEqual(key_numbers('CEVAP ANAHTARI: 1) E-2) D-3) D'),[
            {'number':1,'answer':'E'},{'number':2,'answer':'D'},{'number':3,'answer':'D'}])

    def test_table_answer_row_is_included_below_numbers_and_requires_every_printed_token(self):
        self.assertEqual(key_numbers('CEVAP ANAHTARI\n1\n2\n3\nA\nD\nC'),[
            {'number':1,'answer':'A'},{'number':2,'answer':'D'},{'number':3,'answer':'C'}])
        self.assertIsNone(key_numbers('CEVAP ANAHTARI\n1\n2\n3'))
        box=key_box([{'text':'CEVAP ANAHTARI','bbox':[750,582,885,591]}],935,840)
        self.assertGreaterEqual(box[3],661)
        with self.assertRaises(ValueError):key_box([{'text':'SORULAR','bbox':[10,10,100,30]}],935,840)

    def test_bounded_three_question_pilot_keeps_original_pixels_printed_keys_and_bank_candidates_unadmitted(self):
        store=Store(Path(__file__).resolve().parents[1]/'veri/yks-birlestirme');root=store.child(store.current()['runId'])
        pilot=read_json(root/'physics-summary-discovery/report.json');package=read_json(pilot['package'])
        self.assertEqual(pilot['questions'],3);self.assertEqual(digest(pilot['package']),pilot['packageSha256'])
        self.assertEqual([c['answer'] for c in package['cards']],list('DDE'))
        for card in package['cards']:
            self.assertEqual(digest(card['image']),card['imageSha256']);self.assertTrue(card['pixelProof']['sourceAndPreparedPixelsEqual'])
            self.assertLess(card['bboxPt'][3],633);self.assertFalse(card['newQuestionAdmissionAccepted'])
        comparison=read_json(root/'physics-summary-discovery/comparison-report.json')
        self.assertEqual(comparison['bankQuestions'],80230);self.assertEqual(comparison['questions'],3)
        self.assertEqual(comparison['packageSha256'],pilot['packageSha256'])
        self.assertFalse(comparison['newQuestionAdmissionAccepted']);self.assertEqual(comparison['questionBankWrites'],0)

    def test_local_key_reading_agreement_never_accepts_complete_source_keys_or_question_bodies(self):
        store=Store(Path(__file__).resolve().parents[1]/'veri/yks-birlestirme');root=store.child(store.current()['runId'])
        report=read_json(root/'physics-summary-key-readings/report.json');self.assertEqual(report['status'],'COMPLETE')
        self.assertEqual(report['documents'],75);self.assertEqual(report['completed'],75)
        for row in report['results']:
            self.assertFalse(row['sourceQuestionAnswersBound']);self.assertFalse(row['wholeSourceKeyCompletenessAccepted'])
            self.assertFalse(row['newQuestionAdmissionAccepted']);self.assertFalse(row['teacherApproved'])
            if row.get('cropPath'):self.assertEqual(digest(row['cropPath']),row['cropSha256'])
            if row['status']=='ORIGINAL_KEY_STRIP_OCR_AND_LOCAL_VISION_AGREE_BODY_ENUMERATION_REQUIRED':
                self.assertEqual(row['stripOcrReading'],row['independentPrintedReading'])
                self.assertEqual(digest(row['evidencePath']),row['evidenceSha256'])

    def test_key_discovery_does_not_require_correctly_ocrd_question_option_labels(self):
        found=signals('SORULAR ... CEVAP ANAHTARI: 1-D, 2-D, 3-E')
        self.assertEqual(found['headings'][0]['unapprovedNumberLetterCandidates'],[
            {'number':1,'answer':'D'},{'number':2,'answer':'D'},{'number':3,'answer':'E'}])
        self.assertEqual(classify(True,False,False,False,False),'UNASSESSED_SAVED_KEY_HEADING_READ_ORIGINAL_SOURCE')

    def test_prior_occurrences_prepared_sources_and_real_ydt_exclusions_are_not_new_queues(self):
        self.assertEqual(classify(True,True,False,True,False),'PRIOR_OCCURRENCES_KEEP_IDS_AND_PENDING_LOCATORS_BEFORE_NEW_EXTRACTION')
        self.assertEqual(classify(True,True,True,False,False),'PREPARED_SOURCE_KEEP_CURRENT_QUESTION_QUEUE')
        self.assertEqual(classify(True,True,True,True,True),'PRINTED_YDT_KEEP_EXISTING_TYT_AYT_EXCLUSION')

    def test_missing_or_ambiguous_readings_never_create_an_answer_or_absence_approval(self):
        found=signals('Cevap anahtarı: 1-A, 1-B, 3-C')
        self.assertEqual(len(found['headings'][0]['unapprovedNumberLetterCandidates']),3)
        self.assertEqual(classify(False,False,False,False,False),'NO_EXPLICIT_SAVED_KEY_SIGNAL_NOT_AN_ABSENCE_PROOF')
        self.assertEqual(signals('Bu paragrafta anahtar kelimeler bulunur.')['headings'],[])

    def test_actual_all_source_index_preserves_saved_evidence_and_does_not_approve_answers(self):
        store=Store(Path(__file__).resolve().parents[1]/'veri/yks-birlestirme');root=store.child(store.current()['runId'])
        report=read_json(root/'saved-key-signal-discovery/report.json')
        self.assertEqual(report['status'],'COMPLETE');self.assertEqual(report['documents'],4086)
        self.assertEqual(report['completed'],4086);self.assertEqual(report['observedPages'],67277)
        self.assertEqual(report['states']['UNASSESSED_SAVED_KEY_HEADING_READ_ORIGINAL_SOURCE'],85)
        self.assertFalse(report['sourceAnswersApproved']);self.assertFalse(report['absenceClaimed']);self.assertFalse(report['fullYks07Accepted'])
        self.assertEqual(report['newModelCalls']+report['newOcrCalls']+report['newRenders']+report['questionBankWrites'],0)
        for row in report['results']:
            self.assertEqual(digest(row['evidencePath']),row['evidenceSha256'])
        example=next(r for r in report['results'] if r['sourceSha256'].startswith('04c593815b31'))
        self.assertIsNone(example['previousDiscoveredRegions'])
        detail=read_json(example['evidencePath'])['result']
        self.assertEqual(len(detail['readings']),2);self.assertFalse(detail['sourceAnswersApproved'])


if __name__=='__main__':unittest.main()
