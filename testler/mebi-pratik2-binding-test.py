import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from mebi_pratik2_tek_test import bind
from mebi_pratik2_kirpim_geometri import check


def page(number,*texts):
    return {'physicalPage':number,'lines':[{'text':t,'bbox':[0,0,10,10]} for t in texts]}


class BindingTest(unittest.TestCase):
    def test_border_cut_is_not_passed_by_option_count(self):
        lines=[{'text':letter+') option','bbox':[2,idx*10+2,90,idx*10+8]} for idx,letter in enumerate('ABCDE')]
        lines.append({'text':'continued diagram caption','bbox':[2,50,110,60]})
        self.assertIn('NATIVE_LINE_INTERSECTS_CROP_BORDER',check(lines,[0,0,100,100])['reasons'])

    def test_missing_option_requires_review(self):
        lines=[{'text':letter+') option','bbox':[2,idx*10+2,90,idx*10+8]} for idx,letter in enumerate('ABCD')]
        self.assertIn('FIVE_UNIQUE_OPTIONS_NOT_PROVEN',check(lines,[0,0,100,100])['reasons'])

    def test_same_document_single_test_binds(self):
        result,error=bind({'pages':[page(1,'AYT TARAMA TESTİ-7','1. Gövde'),page(2,'1. C')]})
        self.assertIsNone(error)
        self.assertEqual(result['questions'][0]['key']['answer'],'C')

    def test_multiple_test_ids_cannot_share_number(self):
        result,error=bind({'pages':[page(1,'AYT TARAMA TESTİ-7','1. Gövde'),
            page(2,'AYT TARAMA TESTİ-8','1. C')]})
        self.assertIsNone(result)
        self.assertEqual(error,'TEST_ID_NOT_UNIQUE')

    def test_conflicting_or_repeated_keys_never_choose_first(self):
        for answer in ('C','D'):
            result,error=bind({'pages':[page(1,'AYT TARAMA TESTİ-7','1. Gövde'),
                page(2,'1. C','1. '+answer)]})
            self.assertIsNone(result)
            self.assertEqual(error,'REPEATED_BODY_OR_KEY_NUMBER')

    def test_unmatched_numbers_block_binding(self):
        result,error=bind({'pages':[page(1,'AYT TARAMA TESTİ-7','1. Gövde','2. Gövde'),page(2,'1. C')]})
        self.assertIsNone(result)
        self.assertEqual(error,'BODY_KEY_NUMBER_SETS_DIFFER')


if __name__=='__main__':unittest.main()
