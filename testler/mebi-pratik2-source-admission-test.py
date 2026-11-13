"""Check explicit source intents and exact duplicate-image boundaries."""
import sys
import tempfile
import unittest
from pathlib import Path
from PIL import Image,ImageDraw
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from mebi_pratik2_deneme_kok_kaniti import classify
from mebi_pratik2_kesin_piksel_tekrari import fingerprint


class SourceIntentTests(unittest.TestCase):
    def test_underlined_word_is_not_mislabelled_as_a_whole_paragraph(self):
        text='Bu parçadaki altı çizili sözle eserin hangi özelliği vurgulanmıştır? A) Yenilik B) Güzellik'
        self.assertEqual(classify(text)[0],'Sözcükte Anlam')

    def test_topic_words_in_choices_do_not_classify_the_stem(self):
        text='Bu parçadan aşağıdakilerden hangisi çıkarılamaz? A) Yazım yanlışı vardır. B) Noktalama işaretleri.'
        self.assertEqual(classify(text)[0],'Paragrafta Anlam')

    def test_competing_explicit_intents_stay_unclassified(self):
        self.assertIsNone(classify('Bu cümlede yazım yanlışı ve noktalama yanlışı vardır. A) I')[0])

    def test_underlined_grammar_target_does_not_become_a_paragraph_label(self):
        self.assertIsNone(classify('Bu parçada altı çizili sözcükler türleri bakımından nasıl sıralanmıştır? A) İsim')[0])


class ExactPixelTests(unittest.TestCase):
    def test_only_empty_white_margin_changes_are_equivalent(self):
        with tempfile.TemporaryDirectory() as name:
            root=Path(name);a=Image.new('RGB',(40,40),'white');ImageDraw.Draw(a).rectangle((12,10,20,30),fill=(0,0,0))
            b=Image.new('RGB',(90,100),'white');b.paste(a,(30,40));a.save(root/'a.png');b.save(root/'b.png')
            self.assertEqual(fingerprint(root/'a.png')['rgbSha256'],fingerprint(root/'b.png')['rgbSha256'])
            b.putpixel((50,60),(1,0,0));b.save(root/'changed.png')
            self.assertNotEqual(fingerprint(root/'a.png')['rgbSha256'],fingerprint(root/'changed.png')['rgbSha256'])

    def test_scaling_or_small_color_changes_are_not_exact_matches(self):
        with tempfile.TemporaryDirectory() as name:
            root=Path(name);a=Image.new('RGB',(10,10),(127,127,127));a.save(root/'a.png')
            a.resize((20,20)).save(root/'scaled.png');Image.new('RGB',(10,10),(128,128,128)).save(root/'color.png')
            original=fingerprint(root/'a.png')['rgbSha256']
            self.assertNotEqual(original,fingerprint(root/'scaled.png')['rgbSha256']);self.assertNotEqual(original,fingerprint(root/'color.png')['rgbSha256'])


if __name__=='__main__':unittest.main()
