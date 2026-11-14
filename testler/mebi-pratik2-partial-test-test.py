"""Safety boundaries for partial tests and immutable resumed source PNGs."""
import sys
import tempfile
import unittest
from pathlib import Path
import pymupdf
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from mebi_pratik2_kismi_test import select,validate_key_visual
from mebi_pratik2_tarama_kitap_kirpim import preserve_png,key_questions


def fixture():
    return {'testNumber':5,'reasons':['TEST_BODY_KEY_NUMBER_SETS_DIFFER'],
            'keys':[{'printedNumber':n,'answer':'A','printedTestHeading':{'test':5}}
                    for n in [1,2,3]],
            'bodies':[{'printedNumber':n,'page':1,'bbox':[0,n*20,10,n*20+10]}
                      for n in [1,2]],'questions':[]}


class PartialTest(unittest.TestCase):
    def test_missing_body_does_not_remove_unambiguous_bodies_or_key(self):
        result=select(fixture(),set(),'a'*64)
        self.assertEqual([q['printedNumber'] for q in result['questions']],[1,2])
        self.assertEqual([q['printedNumber'] for q in key_questions(result)],[1,2,3])

    def test_conflicting_key_holds_whole_group(self):
        group=fixture();group['keys'].append({**group['keys'][0],'answer':'B'})
        self.assertIsNone(select(group,set(),'a'*64))

    def test_other_test_heading_does_not_bind(self):
        group=fixture();group['keys'][0]['printedTestHeading']['test']=6
        self.assertIsNone(select(group,set(),'a'*64))

    def test_repeated_body_held_existing_crop_skipped_anchors_retained(self):
        group=fixture();group['bodies'].append({**group['bodies'][0],'page':2})
        group['bodies'].append({'printedNumber':3,'page':3,'bbox':[0,0,10,10]})
        result=select(group,{'MEBI2-aaaaaaaaaaaa-T5-Q002'},'a'*64)
        self.assertEqual([q['printedNumber'] for q in result['questions']],[3])
        self.assertEqual(result['bodies'],group['bodies'])

    def test_different_selected_answer_rejected(self):
        result=select(fixture(),set(),'a'*64);result['questions'][0]['answer']='B'
        with self.assertRaises(ValueError):key_questions(result)

    def test_full_visual_key_identity_and_all_answers_required(self):
        group={'groupId':'test','testNumber':6,'keyImageSha256':'hash','answers':{'1':'E','2':'A'}}
        review={'reviewer':'CURRENT_CODEX_ORIGINAL_PRINTED_KEY_VISUAL_REVIEW','teacherApproved':False,
                'groupId':'test','testNumber':6,'imageSha256':'hash','answers':{'1':'E','2':'A'}}
        validate_key_visual(review,group)
        for change in [{'testNumber':5},{'imageSha256':'other'},{'teacherApproved':True},{'answers':{'1':'E'}}]:
            with self.assertRaises(ValueError):validate_key_visual({**review,**change},group)

    def test_png_resume_preserves_bytes_and_mtime_and_rejects_change(self):
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/'source.png'
            with pymupdf.open() as document:
                page=document.new_page(width=100,height=100);pix=page.get_pixmap()
                preserve_png(pix,path);before=(path.read_bytes(),path.stat().st_mtime_ns)
                preserve_png(pix,path)
                self.assertEqual((path.read_bytes(),path.stat().st_mtime_ns),before)
                page.insert_text((10,20),'Changed')
                with self.assertRaises(ValueError):preserve_png(page.get_pixmap(),path)
                self.assertEqual((path.read_bytes(),path.stat().st_mtime_ns),before)


if __name__=='__main__':unittest.main()
