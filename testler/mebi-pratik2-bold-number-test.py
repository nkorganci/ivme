import sys
import unittest
from pathlib import Path
import pymupdf
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from mebi_pratik2_kalin_numara import bold_anchors
from mebi_pratik2_tarama_kitap import discover


class BoldNumbers(unittest.TestCase):
    def test_numbered_stem_example_and_key_cell_are_not_question_anchors(self):
        with pymupdf.open() as pdf:
            page=pdf.new_page(width=600,height=800)
            page.insert_text((30,85),'1. Actual question',fontname='hebo')
            page.insert_text((30,160),'1. Numbered example',fontname='helv')
            page.insert_text((30,230),'1. A',fontname='hebo')
            page.insert_text((100,300),'2. Interior list',fontname='hebo')
            page.insert_text((330,400),'2. Right column question',fontname='hebo')
            page.insert_text((30,30),'3. Header',fontname='hebo')
            self.assertEqual([a['printedNumber'] for a in bold_anchors(page,1)],[1,2])

    def test_repeated_bold_identity_still_cannot_bind_to_one_key(self):
        def line(text,x,y):return {'text':text,'bbox':[x,y,x+80,y+10]}
        native={'pages':[{'physicalPage':1,'rect':[0,0,600,800],'lines':[line('AYT TARAMA TESTİ-1',30,30)]},
                         {'physicalPage':2,'rect':[0,0,600,800],'lines':[line('AYT TARAMA TESTİ-1',30,30),
                            *[line(str(n)+'. A',30+n*60,55) for n in range(1,7)]]}]}
        anchors=[{'printedNumber':n,'page':1,'bbox':[30,90+n*40,40,100+n*40],'text':str(n)+'. body'} for n in range(1,7)]
        groups,_=discover(native,'AYT',{1:anchors+[anchors[0]|{'bbox':[330,90,340,100]}],2:[]})
        self.assertEqual(groups[0]['questions'],[])
        self.assertIn('REPEATED_BODY_IDENTITY_IN_SAME_PRINTED_TEST',groups[0]['reasons'])


if __name__=='__main__':unittest.main()
