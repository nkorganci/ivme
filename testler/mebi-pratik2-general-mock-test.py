import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from mebi_pratik2_genel_deneme_kitabi import body_scope,key_columns


def line(t,x,y,w=40):return {'text':t,'bbox':[x,y,x+w,y+10]}


class GeneralMock(unittest.TestCase):
    def test_footer_and_printed_mock_are_both_required(self):
        p={'rect':[0,0,552,779],'lines':[line('TYT • türkçe testi',36,742),line('8. DENEME',450,47)]}
        self.assertEqual(body_scope(p)[:3],('TYT',8,'TUR'))
        p['lines']=p['lines'][:1];self.assertIsNone(body_scope(p))
    def test_two_column_ayt_keys_keep_separate_number_one_answers(self):
        lines=[line('ALAN YETERLİLİK TESTLERİ (AYT)',100,85),line('1. DENEME CEVAP ANAHTARI',100,102),
               line('MATEMATİK',95,125),line('TESTİ',95,138),line('FEN BİLİMLERİ',295,125),line('TESTİ',295,138)]
        for n in range(1,11):lines.extend([line(str(n)+'. A',100,165+n*12),line(str(n)+'. B',300,165+n*12)])
        keys,issues=key_columns({'physicalPage':20,'lines':lines})
        self.assertEqual(len(keys),2);self.assertEqual(keys[0]['answers'][0]['answer'],'A');self.assertEqual(keys[1]['answers'][0]['answer'],'B')
    def test_missing_number_cannot_shift_the_following_letter(self):
        lines=[line('TEMEL YETERLİLİK TESTLERİ (TYT)',100,85),line('1. DENEME CEVAP ANAHTARI',100,102),
               line('TÜRKÇE',95,125),line('TESTİ',95,138),line('TEMEL MATEMATİK',295,125),line('TESTİ',295,138)]
        for n in range(1,12):
            if n!=2:lines.append(line(str(n)+'. A',100,165+n*12))
            lines.append(line(str(n)+'. B',300,165+n*12))
        keys,issues=key_columns({'physicalPage':20,'lines':lines})
        self.assertEqual([g['sectionId'] for g in keys],['MAT']);self.assertTrue(issues)


if __name__=='__main__':unittest.main()
