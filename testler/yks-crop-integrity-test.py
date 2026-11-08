from pathlib import Path
import sys
import tempfile
import unittest
import io
import pymupdf
from PIL import Image
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from yks_pilot_kirpim_kontrol import check_pixels,uncovered_body_lines


class CropIntegrityTest(unittest.TestCase):
    def test_lossless_source_crop_passes_but_modified_pixels_fail(self):
        with tempfile.TemporaryDirectory() as temp,pymupdf.open() as doc:
            page=doc.new_page(width=560,height=792);page.insert_text((36,100),'1. Question A) 1 B) 2 C) 3 D) 4 E) 5')
            box=[30,75,275,200];file=Path(temp)/'source.webp'
            pix=page.get_pixmap(dpi=180,clip=pymupdf.Rect(box),alpha=False)
            with Image.open(io.BytesIO(pix.tobytes('png'))) as picture:picture.save(file,'WEBP',lossless=True)
            card={'bboxPt':box,'image':str(file)}
            proof=check_pixels(page,card);self.assertEqual(proof['sourcePixelSha256'],proof['preparedPixelSha256'])
            with Image.open(file) as picture:
                edited=picture.copy();edited.putpixel((0,0),(0,0,0));edited.save(file,'WEBP',lossless=True)
            with self.assertRaisesRegex(ValueError,'pixels differ'):check_pixels(page,card)

    def test_source_formula_line_outside_question_crops_is_detected(self):
        with pymupdf.open() as doc:
            page=doc.new_page(width=560,height=792)
            page.insert_text((36,100),'1. Source question')
            page.insert_text((80,440),'3x + 1')
            page.insert_text((36,460),'2. Source question')
            regions=[{'bboxPt':[30,75,275,420]},{'bboxPt':[30,450,275,700]}]
            missing=uncovered_body_lines(page,regions)
            self.assertTrue(any('3x + 1' in line['text'] for line in missing))


if __name__=='__main__':unittest.main()
