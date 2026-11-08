from pathlib import Path
import sys
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
import pymupdf
from yks_tam_anahtar_taramasi import select_diagnostics,body_number_proof
from yks_tam_anahtar_gorsel import eligible,source_signature,resolved_rows


class FullKeyReaderTest(unittest.TestCase):
    def test_same_pdf_under_an_ogm_canonical_path_still_uses_its_mebi_diagnostic_alias(self):
        old={'kind':'FILE','root':'D:/ogm-materyal','path':'test.pdf'}
        alias={'kind':'FILE','root':'D:/mebi-yks','path':'Deneme-Tarama/Taramalar/AYT/Tarih (AYT)/Test/PDF/test.pdf'}
        selected=select_diagnostics([{'sha256':'same','canonicalCandidate':old,'occurrences':[old,alias]}])
        self.assertEqual(len(selected),1);self.assertEqual(selected[0]['source']['canonicalCandidate'],alias)
        self.assertEqual(selected[0]['exam'],'AYT')

    def test_valid_source_numbers_and_all_five_options_are_required(self):
        with pymupdf.open() as doc:
            page=doc.new_page()
            for number,y in [(1,100),(2,400)]:
                page.insert_text((34,y),str(number)+'. Source question')
                for i,letter in enumerate('ABCDE'):page.insert_text((55,y+30+i*20),letter+') Source option')
            doc.new_page()
            expected=[{'number':1,'answer':'A'},{'number':2,'answer':'B'}]
            self.assertEqual(body_number_proof(doc,expected)['status'],'PASS')
            self.assertEqual(body_number_proof(doc,expected[:1])['status'],'REVIEW_REQUIRED')
            self.assertEqual(body_number_proof(doc,list(reversed(expected)))['status'],'REVIEW_REQUIRED')

    def test_missing_source_option_never_gets_a_model_key_acceptance(self):
        with pymupdf.open() as doc:
            page=doc.new_page();page.insert_text((34,100),'1. Source question')
            for i,letter in enumerate('ABDE'):page.insert_text((55,130+i*20),letter+') Source option')
            doc.new_page()
            self.assertEqual(body_number_proof(doc,[{'number':1,'answer':'A'}])['status'],'REVIEW_REQUIRED')
        self.assertFalse(eligible({'status':'PRINTED_KEY_READING_DISAGREEMENT_REVIEW_REQUIRED','bodyNumberProof':{'status':'REVIEW_REQUIRED'}}))
        self.assertFalse(eligible({'status':'PRINTED_TEST_OR_COURSE_SCOPE_REVIEW_REQUIRED','bodyNumberProof':{'status':'PASS'}}))

    def test_resume_counters_do_not_invalidate_model_readings_but_changed_answers_do(self):
        source={'identity':{'sourceGroupsSha256':'sources'},'results':[{'sourceSha256':'pdf','status':'SOURCE_KEY_VERIFIED',
            'sourceAnswers':[{'number':1,'answer':'A'}],'cacheHit':False}]}
        after={**source,'newDocumentsThisPass':0,'results':[{**source['results'][0],'cacheHit':True}]}
        self.assertEqual(source_signature(source),source_signature(after))
        after['results'][0]['sourceAnswers']=[{'number':1,'answer':'B'}]
        self.assertNotEqual(source_signature(source),source_signature(after))
        with self.assertRaises(ValueError):resolved_rows(source,{'pdf':{'status':'SOURCE_KEY_VERIFIED','sourceAnswers':[]}})


if __name__=='__main__':unittest.main()
