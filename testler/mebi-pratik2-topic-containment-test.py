"""Only exact reviewed subchapters may enter a broader existing main row."""
import hashlib
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from mebi_pratik2_konu_ayrintisi import match_title,match_headings
import mebi_pratik2_dort_dortluk_anahtar as keys

POLY='Polinom Kavramı ve Polinomlarda İşlemler/ Polinomların Çarpanlara Ayrılması'
LOGIC='Önermeler ve Bileşik Önermeler / Niceleyiciler / Tanım, Aksiyom, Teorem ve İspat Yöntemleri'


def category(topic,exam='TYT',code='one'):
    return {'id':'excel.'+code,'topic':topic,'exam':exam,'subject':'Matematik','selectable':True}


class ContainmentTests(unittest.TestCase):
    def test_exact_subchapter_is_contained_in_the_named_main_row(self):
        c=category(POLY)
        self.assertEqual(match_title('Polinomların Çarpanlara Ayrılması','TYT',['Matematik'],[c]),c)

    def test_an_added_unrelated_topic_does_not_pass_by_word_overlap(self):
        self.assertIsNone(match_title('Polinomların Çarpanlara Ayrılması ve Trigonometri','TYT',['Matematik'],[category(POLY)]))

    def test_wrong_exam_does_not_borrow_another_exam_row(self):
        self.assertIsNone(match_title('Polinomların Çarpanlara Ayrılması','AYT',['Matematik'],[category(POLY)]))

    def test_several_subheads_may_share_one_proven_main_row(self):
        c=category(LOGIC)
        self.assertEqual(match_headings([{'text':'> Önermeler > Niceleyiciler'}],'TYT',['Matematik'],[c]),c)

    def test_two_different_main_rows_do_not_get_collapsed(self):
        cs=[category(LOGIC),category(POLY,code='two')]
        self.assertIsNone(match_headings([{'text':'> Önermeler > Polinomların Çarpanlara Ayrılması'}],'TYT',['Matematik'],cs))

    def test_number_and_letter_reading_can_only_be_reused_for_identical_pixels(self):
        with tempfile.TemporaryDirectory() as name:
            root=Path(name);out=root/'out';out.mkdir();path=root/'key.png';path.write_bytes(b'original printed cell')
            sha=hashlib.sha256(path.read_bytes()).hexdigest()
            group={'groupId':'g','keyIdentityType':'SINGLE_TEST_PRINTED_NUMBER','sourceQuestionCode':'q',
                'keyImage':'key.png','keyImageSha256':sha,'answers':{'1':'C'}}
            prior={'q':{'status':'AGREES','imageSha256':sha,'reading':{'number':1,'answer':'C'}}}
            with patch.object(keys,'BASE',root),patch.object(keys,'SINGLE_KEYS',prior):
                result=keys.read_key(group,None,None,out)
                self.assertEqual(result['status'],'AGREES')
                path.write_bytes(b'changed pixels')
                with self.assertRaisesRegex(ValueError,'key input changed'):keys.read_key(group,None,None,out)


if __name__=='__main__':unittest.main()
