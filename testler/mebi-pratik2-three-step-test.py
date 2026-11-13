"""Prove source-step isolation and conservative native graphics detection."""
import sys
import unittest
from pathlib import Path
import pymupdf
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from mebi_pratik2_uc_adim import discover
from mebi_pratik2_uc_adim_kirpim import page_graphics


def line(text,x,y,width=80,height=12):return {'text':text,'bbox':[x,y,x+width,y+height]}


class ThreeStepTests(unittest.TestCase):
    def fixture(self):
        pages=[]
        for physical,variant in [(1,'A'),(2,'B')]:
            pages.append({'physicalPage':physical,'rect':[0,0,595,841],'lines':[
                line('1. ADIM',450,10),line('Long Unit',160,42),line('Title - '+variant,170,54),
                line('1. Question',36,120),line('2. Question',310,120)]})
        ls=[line('Long Unit Title',54,100)]
        for token,y,answers in [('1. ADIM - A',125,['A','B']),('1. ADIM - B',150,['D','E']),('2. ADIM',175,['B','C']),('3. ADIM',200,['C','D'])]:
            ls.append(line(token,54,y,50))
            ls.extend([line(f'{n}-{answer}',110+n*40,y-3,20) for n,answer in enumerate(answers,1)])
        pages.append({'physicalPage':3,'rect':[0,0,595,841],'lines':ls})
        return {'pages':pages}

    def test_same_question_numbers_in_a_b_steps_keep_their_own_answers(self):
        groups,_=discover(self.fixture());by_token={g['stepToken']:g for g in groups}
        self.assertEqual(by_token['1A']['status'],'NATIVE_CHAPTER_STEP_BINDING_CANDIDATE')
        self.assertEqual(by_token['1B']['status'],'NATIVE_CHAPTER_STEP_BINDING_CANDIDATE')
        self.assertEqual([r['answer'] for r in by_token['1A']['keys']],['A','B'])
        self.assertEqual([r['answer'] for r in by_token['1B']['keys']],['D','E'])

    def test_missing_body_never_becomes_a_complete_binding(self):
        data=self.fixture();data['pages'][0]['lines']=data['pages'][0]['lines'][:-1]
        groups,_=discover(data);g=next(g for g in groups if g['stepToken']=='1A')
        self.assertEqual(g['status'],'REVIEW_REQUIRED');self.assertIn('BODY_KEY_SETS_DIFFER_IN_CHAPTER_STEP',g['reasons'])

    def page(self):
        doc=pymupdf.open();page=doc.new_page(width=595,height=841)
        page.insert_text((50,110),'An underlined phrase in a complete question',fontsize=10)
        return doc,page

    def test_text_bound_underline_and_footer_are_not_a_question_diagram(self):
        doc,page=self.page();page.draw_line((50,111),(100,111));page.draw_rect(pymupdf.Rect(30,799,568,815),fill=(0,0,0))
        self.assertFalse(page_graphics(page));doc.close()

    def test_unassociated_axis_or_shape_requires_visual_review(self):
        for shape in ['axis','box']:
            doc,page=self.page()
            if shape=='axis':page.draw_line((50,200),(200,200))
            else:page.draw_rect(pymupdf.Rect(70,180,160,250))
            self.assertTrue(page_graphics(page),shape);doc.close()


if __name__=='__main__':unittest.main()
