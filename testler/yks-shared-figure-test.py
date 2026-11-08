from pathlib import Path
import sys
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from PIL import Image
from yks_ortak_sekil_kirpim import join_regions,verify_join


class SharedSourceFigureTest(unittest.TestCase):
    def setUp(self):
        self.context=Image.new('RGB',(120,60),'blue');self.question=Image.new('RGB',(100,40),'black')

    def test_both_source_regions_remain_exact_and_width_padding_is_white(self):
        image=join_regions(self.context,self.question)
        self.assertEqual(image.size,(120,124))
        self.assertEqual(image.getpixel((110,123)),(255,255,255))
        self.assertTrue(verify_join(image,self.context,self.question)['sourcePixelsPreserved'])

    def test_a_changed_graph_pixel_cannot_pass_original_source_verification(self):
        image=join_regions(self.context,self.question);image.putpixel((5,5),(255,0,0))
        with self.assertRaises(ValueError):verify_join(image,self.context,self.question)

    def test_missing_context_changed_options_or_nonwhite_padding_are_refused(self):
        with self.assertRaises(ValueError):verify_join(self.question,self.context,self.question)
        image=join_regions(self.context,self.question);image.putpixel((5,90),(255,0,0))
        with self.assertRaises(ValueError):verify_join(image,self.context,self.question)
        image=join_regions(self.context,self.question);image.putpixel((110,100),(0,0,0))
        with self.assertRaises(ValueError):verify_join(image,self.context,self.question)


if __name__=='__main__':unittest.main()
