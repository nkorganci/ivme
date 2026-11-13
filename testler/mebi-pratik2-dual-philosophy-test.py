import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from mebi_pratik2_ortak_felsefe import categories_for


class DualPhilosophy(unittest.TestCase):
    def headings(self):return [{'text':x} for x in ['FELSEFE','TYT/AYT TARAMA TESTİ-8','> Siyaset Felsefesi']]
    def cats(self):return [{'id':'excel.'+e.lower()+'.felsefe.x','exam':e,'subject':'Felsefe','topic':'Siyaset Felsefesinin Konusu ve Problemleri','selectable':True} for e in ('TYT','AYT')]
    def test_two_exam_availability_requires_printed_source_scope(self):
        self.assertEqual(len(categories_for(self.headings(),self.cats())),2)
        h=self.headings();h[1]['text']='TYT TARAMA TESTİ-8'
        self.assertEqual(categories_for(h,self.cats()),[])
    def test_incidental_question_words_cannot_establish_the_chapter(self):
        h=self.headings();h[2]['text']='Siyaset Felsefesi ile ilgili hangisi doğrudur?'
        self.assertEqual(categories_for(h,self.cats()),[])
    def test_unknown_chapter_does_not_get_a_general_topic(self):
        h=self.headings();h[2]['text']='> Ahlak Felsefesi'
        self.assertEqual(categories_for(h,self.cats()),[])


if __name__=='__main__':unittest.main()
