from pathlib import Path
import sys
import unittest
import pymupdf
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from yks_cikmis_aktarim_kaniti import booklet_identity,printed_keys,proof_issues


class BookletPriorReuseTest(unittest.TestCase):
    def test_physical_booklet_comes_from_original_alias_not_cross_book_canonical_code(self):
        group={'occurrences':[{'root':'D:/mebi-yks','path':'AYT.pdf'},
            {'root':'D:/ivme/Kaynaklar/yks-cikmis-sorular','path':'OGM Kitapciklari/AYT_EsitAgirlik.pdf'}]}
        self.assertEqual(booklet_identity(group,{'AYT_EsitAgirlik':{}}),'AYT_EsitAgirlik')
        group['occurrences'].append({'root':'D:/ivme/Kaynaklar/yks-cikmis-sorular','path':'OGM Kitapciklari/AYT_Sozel.pdf'})
        with self.assertRaises(ValueError):booklet_identity(group,{'AYT_EsitAgirlik':{}})

    def test_blank_cancelled_key_cell_does_not_shift_following_answers(self):
        with pymupdf.open() as doc:
            p=doc.new_page();p.insert_text((40,70),'CEVAP ANAHTARI\nFIZIK\n1. A\n2.\n3. C')
            answers,headers,duplicates=printed_keys(doc,{'pages':[{'page':1,'text':p.get_text()}]},['FİZİK'])
            self.assertEqual(answers[('FİZİK',3)]['answer'],'C');self.assertNotIn(('FİZİK',2),answers);self.assertFalse(duplicates)

    def test_existing_official_answer_is_preserved_when_booklet_key_disagrees(self):
        link={'printed_numbers':[1],'evidence':{'sourceStamp':'7'}};raw={'cevaplar':['C']};q={'stamp':'7','correct_answer':'C'}
        result=proof_issues(link,raw,q,'same','same',{'answer':'D'},'D')
        self.assertIn('CURRENT_PRINTED_KEY_AND_CANONICAL_ANSWER_DIFFER_OR_BLANK',result)
        self.assertNotIn('ORIGINAL_OFFICIAL_ANSWER_RECORD_AND_CURRENT_CANONICAL_ANSWER_DIFFER',result)


if __name__=='__main__':unittest.main()
