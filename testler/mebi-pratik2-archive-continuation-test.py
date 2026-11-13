"""Guard mixed topics, answer identity and premature full-archive closeout."""
import hashlib
import json
import sys
import tempfile
import unittest
import pymupdf
from pathlib import Path
from unittest.mock import patch,Mock
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from mebi_pratik2_arsiv_basliklari import controlled_match,chapter_key
import mebi_pratik2_arsiv_kabul as admission
import mebi_pratik2_plan_sonuc as closeout
from mebi_pratik2_sozcuk_kirpim import word_region,heading_category
import mebi_pratik2_arsiv_izle as tracker


class ArchiveBoundaries(unittest.TestCase):
    def category(self,exam='TYT',subject='Coğrafya',topic='Nüfus ve Göç'):
        return {'id':'excel.test','exam':exam,'subject':subject,'topic':topic,'selectable':True}

    def test_reviewed_synonym_binds_existing_topic(self):
        c=self.category()
        self.assertEqual(controlled_match('Göç','TYT',['Coğrafya'],[c]),c)

    def test_part_index_does_not_change_chapter_identity(self):
        self.assertEqual(chapter_key('Üslü ve Köklü İfadeler-2'),chapter_key('Üslü ve Köklü İfadeler'))

    def test_mixed_chapter_is_not_assigned_a_single_leaf(self):
        c=self.category(subject='Matematik',topic='Binom')
        self.assertIsNone(controlled_match('Permütasyon, Kombinasyon, Binom','TYT',['Matematik'],[c]))

    def test_wrong_exam_and_subject_do_not_match(self):
        self.assertIsNone(controlled_match('Göç','AYT',['Coğrafya'],[self.category()]))
        self.assertIsNone(controlled_match('Göç','TYT',['Tarih'],[self.category()]))

    def test_duplicate_controlled_topics_do_not_choose_arbitrarily(self):
        a=self.category();b={**a,'id':'excel.other'}
        self.assertIsNone(controlled_match('Göç','TYT',['Coğrafya'],[a,b]))

    def test_answer_reading_must_match_entire_unique_numbered_row(self):
        expected={'1':'A','2':'B'}
        self.assertTrue(admission.agrees_numbered_row('1-A 2-B',expected))
        for text in ['1-A 2-C','1-A','1-A 2-B 2-B','1-A 2-B 3-C']:
            self.assertFalse(admission.agrees_numbered_row(text,expected))

    def test_failed_body_receipt_is_reused_without_new_model_call(self):
        with tempfile.TemporaryDirectory() as name:
            root=Path(name);out=root/'expansion';out.mkdir();folder=out/'body-readings';folder.mkdir()
            image=root/'body.png';image.write_bytes(b'original pixels');sha=hashlib.sha256(image.read_bytes()).hexdigest()
            row={'code':'q','image':'body.png','imageSha256':sha,'subject':'Kimya'}
            (folder/'q.json').write_text(json.dumps({'status':'REVIEW_REQUIRED','imageSha256':sha}),encoding='utf8')
            model=Mock()
            with patch.object(admission,'BASE',root),patch.object(admission,'OUT',out):
                self.assertEqual(admission.body_read(row,None,model)['status'],'REVIEW_REQUIRED')
            model.ask.assert_not_called()

    def test_first_pass_cannot_mark_the_full_archive_finished(self):
        with tempfile.TemporaryDirectory() as name:
            root=Path(name);(root/'archive-closeout.json').write_text(json.dumps({'status':'FIRST_PASS_COMPLETE_WITH_EXPLICIT_DEFERRED_REVIEW','allPrintedQuestionsExtracted':False}),encoding='utf8')
            with patch.object(closeout,'BASE',root):
                with self.assertRaisesRegex(ValueError,'cannot close the full-archive'):
                    closeout.run()

    def test_adjacent_column_words_do_not_create_duplicate_choices(self):
        with pymupdf.open() as pdf:
            page=pdf.new_page(width=600,height=800)
            page.insert_text((20,75),'1. Select the complete statement.')
            for i,c in enumerate('ABCDE'):
                page.insert_text((20,110+i*25),c+') left choice')
                page.insert_text((320,110+i*25),c+') other column choice')
            clip,proof,reasons=word_region(page,[0,60,299,240],1)
            self.assertEqual(reasons,[])
            self.assertEqual(proof['uniqueChoiceCounts'],dict.fromkeys('ABCDE',1))
            self.assertNotIn('other column',proof['sourceText'])

    def test_missing_bottom_option_remains_unaccepted(self):
        with pymupdf.open() as pdf:
            page=pdf.new_page(width=600,height=800)
            page.insert_text((20,75),'1. Select the complete statement.')
            for i,c in enumerate('ABCDE'):page.insert_text((20,110+i*25),c+') choice')
            _,_,reasons=word_region(page,[0,60,299,190],1)
            self.assertIn('FIVE_UNIQUE_WORD_LEVEL_CHOICES_NOT_PROVED',reasons)

    def test_example_bullet_does_not_obscure_a_real_printed_heading(self):
        c=self.category()
        row={'printedSourceHeadings':[{'text':'> Göç'},{'text':'• Example explanation is not a chapter.'}]}
        self.assertEqual(heading_category(row,{},'TYT',{'Coğrafya'},[c]),c)

    def test_legacy_acceptance_total_is_not_mistaken_for_a_batch_delta(self):
        with tempfile.TemporaryDirectory() as name:
            root=Path(name);pilot=root/'publication-preparation';pilot.mkdir()
            (pilot/'publication-result.json').write_text(json.dumps({'questionsAppended':21}),encoding='utf8')
            batch=root/'verified-source-batch-001';batch.mkdir()
            (batch/'bank-acceptance.json').write_text(json.dumps({'status':'PASS','acceptedQuestions':557}),encoding='utf8')
            (batch/'publication-result.json').write_text(json.dumps({'questionsAppended':536}),encoding='utf8')
            (batch/'live-bank-read-report.json').write_text(json.dumps({'checks':[{'counts':{'Tümü':557}}]}),encoding='utf8')
            with patch.object(tracker,'BASE',root):self.assertEqual(tracker.accepted_snapshot()['acceptedPublishedQuestions'],557)


if __name__=='__main__':unittest.main()
