"""Saved-crop fast path must reject cuts/context, not weaken acceptance."""
import copy
import hashlib
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import pymupdf
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from mebi_pratik2_hizli_profil import geometry,expected_scale,inside,visible_paths,VERSION
from mebi_pratik2_hizli_yol import valid_receipt,STATUS
from mebi_pratik2_native_govde import prove as native_prove
from mebi_pratik2_klasor_etiketleri import resolve,path_key
import mebi_pratik2_klasor_etiketleri as source_labels
from mebi_pratik2_konu_bekleyen_kanit import reuse_evidence,NoModelCalls


class FastProfileTests(unittest.TestCase):
    def test_same_saved_question_cannot_inherit_other_exam_overlay(self):
        row={'code':'saved','sourceSha256':'pdf','imageSha256':'image','exam':'TYT'}
        evidence={'canonicalExam':'AYT','categoryId':'excel.ayt.existing','status':'SOURCE_MAIN_LABEL_BOUND'}
        overlay={'saved':{**row,'sourceLabelEvidence':evidence}}
        with patch.object(source_labels,'_question_index',overlay):
            result=source_labels.lookup(row)
        self.assertEqual(result['status'],'SOURCE_EXAM_SCOPE_REVIEW_REQUIRED')
        self.assertIsNone(result['categoryId'])

    def test_fast_phase_cannot_call_model_and_only_deferred_results_are_retried(self):
        with self.assertRaises(RuntimeError):NoModelCalls().ask('expensive request')
        self.assertTrue(reuse_evidence({'status':'SOURCE_EVIDENCE_REVIEW_REQUIRED'},False))
        self.assertTrue(reuse_evidence({'deferredByFastPhase':True},True))
        self.assertFalse(reuse_evidence({'deferredByFastPhase':True},False))
        self.assertFalse(reuse_evidence(None,False))
    def test_invisible_pdf_clip_is_excluded_but_visible_clipped_stroke_is_retained(self):
        page=pymupdf.Rect(0,0,200,200)
        hidden=[{'type':'clip','level':1,'scissor':pymupdf.Rect(0,150,200,90)},
                {'type':'s','level':2,'rect':pymupdf.Rect(20,30,100,30),'width':1}]
        self.assertEqual(visible_paths(hidden,page),[])
        visible=[{'type':'clip','level':1,'scissor':pymupdf.Rect(10,10,90,90)},
                 {'type':'s','level':2,'rect':pymupdf.Rect(20,30,100,30),'width':1},
                 {'type':'s','level':1,'rect':pymupdf.Rect(110,120,160,120),'width':1}]
        result=visible_paths(visible,page)
        self.assertEqual(len(result),2);self.assertEqual(result[0][1].x1,90)
        self.assertGreater(result[1][1].x1,160)

    def test_profile_receipt_cannot_change_source_clip_image_or_claim_topic_approval(self):
        row={'sourceSha256':'source','imageSha256':'image','bodyPage':1,'bodyClip':[1,2,3,4]}
        proof={**row,'status':STATUS,'method':VERSION,'sourcePage':1,'sourceClip':[1,2,3,4],
               'modelCalls':0,'imageWrites':0,'teacherApproved':False,'fineTopicClaimed':False,'sourcePixelSha256':'pixels'}
        self.assertTrue(valid_receipt(proof,row))
        for changed in [{'sourceSha256':'other'},{'imageSha256':'other'},{'sourceClip':[1,2,3,5]},
                        {'teacherApproved':True},{'fineTopicClaimed':True}]:
            self.assertFalse(valid_receipt({**proof,**changed},row))

    def objects(self):
        return [('TEXT',pymupdf.Rect(15,15,30,25),'1.'),
                *[('TEXT',pymupdf.Rect(20,50+i*20,80,62+i*20),c+') full choice') for i,c in enumerate('ABCDE')],
                ('IMAGE',pymupdf.Rect(100,35,170,80),'')]

    def test_full_diagram_and_choices_fit(self):
        result=geometry(self.objects(),pymupdf.Rect(10,10,190,170),pymupdf.Rect(5,5,195,175),1)
        self.assertEqual(result['objectCounts']['IMAGE'],1)

    def test_cut_diagram_or_choice_is_rejected(self):
        region=pymupdf.Rect(10,10,190,170)
        for clip in [pymupdf.Rect(5,5,150,175),pymupdf.Rect(5,5,195,135)]:
            self.assertIsNone(geometry(self.objects(),region,clip,1))

    def test_wrong_number_or_missing_choice_is_rejected(self):
        region=pymupdf.Rect(10,10,190,170)
        self.assertIsNone(geometry(self.objects(),region,region,2))
        self.assertIsNone(geometry(self.objects()[:-2]+self.objects()[-1:],region,region,1))

    def test_shape_straddling_next_question_boundary_is_rejected(self):
        objects=self.objects()+[('DRAWING',pymupdf.Rect(90,150,100,200),'')]
        self.assertIsNone(geometry(objects,pymupdf.Rect(10,10,190,170),pymupdf.Rect(0,0,200,220),1))

    def test_shared_question_range_is_rejected(self):
        objects=self.objects()+[('TEXT',pymupdf.Rect(20,30,80,40),'1-3. soruları')]
        region=pymupdf.Rect(10,10,190,170)
        self.assertIsNone(geometry(objects,region,region,1))

    def test_legacy_scale_uses_metadata_not_image_resizing(self):
        self.assertEqual(expected_scale({}),2)
        self.assertEqual(expected_scale({'priorSourcePixelProof':{},'sourceRegions':[{}]}),2)
        self.assertEqual(expected_scale({'priorSourcePixelProof':{'path':'proof'},'sourceRegions':[{}]}),2.5)
        with tempfile.TemporaryDirectory() as name:
            pdf=pymupdf.open();page=pdf.new_page(width=600,height=800)
            page.insert_text((30,80),'1. Complete independent statement.')
            for i,c in enumerate('ABCDE'):page.insert_text((40,115+i*25),c+') complete choice')
            clip=[0,60,299,290];path=Path(name)/'saved.png'
            page.get_pixmap(matrix=pymupdf.Matrix(2.5,2.5),clip=pymupdf.Rect(clip),alpha=False).save(path)
            row={'subject':'Matematik','printedNumber':1,'bodyPage':1,'sourceSha256':'original',
                 'bodyClip':clip,'imageSha256':hashlib.sha256(path.read_bytes()).hexdigest()}
            before=path.read_bytes()
            self.assertIsNone(native_prove(page,row,path))
            self.assertEqual(native_prove(page,row,path,scale=2.5)['renderScale'],2.5)
            self.assertEqual(path.read_bytes(),before);pdf.close()

    def category(self):
        return {'id':'excel.existing','exam':'AYT','subject':'Biyoloji','subjectId':'biyoloji',
                'unit':'İnsan Fizyolojisi','topic':'Hücre','selectable':True}

    def test_exact_source_topic_keeps_canonical_unit_and_source_names(self):
        result=resolve(['AYT','Biyoloji (AYT)','MEBİ ünitesi','Hücre'],'AYT',[self.category()])
        self.assertEqual(result['category']['unit'],'İnsan Fizyolojisi')
        self.assertEqual(result['sourceUnit'],'MEBİ ünitesi')

    def test_wrong_course_exam_or_mixed_source_topic_does_not_bind(self):
        category=self.category()
        self.assertIsNone(resolve(['TYT','Biyoloji (TYT)','Ünite','Hücre'],'AYT',[category]))
        self.assertIsNone(resolve(['AYT','Tarih (AYT)','Ünite','Hücre'],'AYT',[category]))
        result=resolve(['AYT','Biyoloji (AYT)','Ünite','Hücre ve Kalıtım'],'AYT',[category])
        self.assertIsNone(result['category'])
        self.assertEqual(path_key('AYT\\Biyoloji/PDF/x.pdf'),path_key('AYT/Biyoloji/PDF/x.pdf'))


if __name__=='__main__':unittest.main()
