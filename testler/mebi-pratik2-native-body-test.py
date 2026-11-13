"""A native shortcut must preserve pixels and reject missing context/graphics."""
import hashlib
import sys
import tempfile
import unittest
from unittest.mock import patch
from pathlib import Path
import pymupdf
from PIL import Image
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from mebi_pratik2_native_govde import prove


class NativeBodyTests(unittest.TestCase):
    def fixture(self,folder,stem='1. Select one complete statement.',drawing=False):
        pdf=pymupdf.open();page=pdf.new_page(width=600,height=800)
        page.insert_text((30,80),stem)
        for i,c in enumerate('ABCDE'):page.insert_text((40,115+i*25),c+') complete choice')
        if drawing:page.draw_line((80,250),(200,250))
        clip=[0,60,299,290];image=folder/'question.png'
        page.get_pixmap(matrix=pymupdf.Matrix(2,2),clip=pymupdf.Rect(clip),alpha=False).save(image)
        row={'subject':'Matematik','printedNumber':1,'bodyPage':1,'sourceSha256':'test-source','bodyClip':clip,'imageSha256':hashlib.sha256(image.read_bytes()).hexdigest()}
        return pdf,page,row,image

    def test_complete_native_text_proves_no_model_or_teacher_review(self):
        with tempfile.TemporaryDirectory() as name:
            pdf,page,row,image=self.fixture(Path(name))
            with pdf:
                proof=prove(page,row,image)
                self.assertEqual(proof['status'],'DETERMINISTIC_NATIVE_BODY_PROVED')
                self.assertEqual(proof['modelCalls'],0);self.assertFalse(proof['teacherApproved'])

    def test_a_cut_image_is_rejected_even_after_its_file_hash_is_updated(self):
        with tempfile.TemporaryDirectory() as name:
            pdf,page,row,image=self.fixture(Path(name))
            with pdf:
                with Image.open(image) as original:cut=original.crop((0,0,original.width,original.height-140))
                cut.save(image);row['imageSha256']=hashlib.sha256(image.read_bytes()).hexdigest()
                self.assertIsNone(prove(page,row,image))

    def test_unassociated_graph_axis_keeps_the_visual_route(self):
        with tempfile.TemporaryDirectory() as name:
            pdf,page,row,image=self.fixture(Path(name),drawing=True)
            with pdf:self.assertIsNone(prove(page,row,image))

    def test_missing_shared_paragraph_keeps_the_visual_route(self):
        with tempfile.TemporaryDirectory() as name:
            pdf,page,row,image=self.fixture(Path(name),stem='1. Bu parcaya gore hangisi dogrudur?')
            with pdf:self.assertIsNone(prove(page,row,image))

    def test_wrong_printed_question_number_is_not_proved(self):
        with tempfile.TemporaryDirectory() as name:
            pdf,page,row,image=self.fixture(Path(name));row['printedNumber']=2
            with pdf:self.assertIsNone(prove(page,row,image))

    def test_a_merged_cross_column_line_keeps_the_visual_route(self):
        with tempfile.TemporaryDirectory() as name:
            pdf,page,row,image=self.fixture(Path(name));original=page.get_text
            merged={'blocks':[{'lines':[{'bbox':[30,70,510,95],'spans':[{'text':'1. stem plus another column'}]}]}]}
            with pdf,patch.object(page,'get_text',side_effect=lambda kind:merged if kind=='dict' else original(kind)):
                self.assertIsNone(prove(page,row,image))


if __name__=='__main__':unittest.main()
