"""Check explicit source intents and exact duplicate-image boundaries."""
import sys
import tempfile
import unittest
import hashlib
import pymupdf
from unittest.mock import patch
from pathlib import Path
from PIL import Image,ImageDraw
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from mebi_pratik2_deneme_kok_kaniti import classify
from mebi_pratik2_kesin_piksel_tekrari import fingerprint
import mebi_pratik2_son_piksel_kapisi as gate


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


class FreshPixelGateTests(unittest.TestCase):
    def fixture(self,root,shared=False):
        source=root/'sources';source.mkdir();base=root/'veri/evidence';base.mkdir(parents=True);folder=base/'batch';folder.mkdir()
        pdf_path=source/'source.pdf';doc=pymupdf.open();page=doc.new_page(width=300,height=400)
        page.insert_text((20,40),'1-2 sorular: shared paragraph' if shared else 'Source header',fontsize=11)
        page.insert_text((20,110),'1. Original source question',fontsize=11)
        page.insert_text((20,310),'1. C',fontsize=11);doc.save(pdf_path);doc.close()
        body_clip=[0,80,290,180];key_clip=[0,280,290,340]
        with pymupdf.open(pdf_path) as pdf:
            for name,scale,clip in [('body',2,body_clip),('key',3,key_clip)]:pdf[0].get_pixmap(matrix=pymupdf.Matrix(scale,scale),clip=pymupdf.Rect(clip),alpha=False).save(base/(name+'.png'))
        sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
        row={'code':'fixture-question','relativePath':'source.pdf','sourceSha256':sha(pdf_path),
            'image':'body.png','imageSha256':sha(base/'body.png'),'keyImage':'key.png','keyImageSha256':sha(base/'key.png'),
            'bodyPage':1,'bodyClip':body_clip,'keyPage':1,'keyClip':key_clip,'printedNumber':1}
        return source,base,folder,row

    def verify(self,root,source,base,folder,row):
        with patch.object(gate,'APP',root),patch.object(gate,'SOURCE',source),patch.object(gate,'BASE',base):return gate.verify([row],folder)

    def test_actual_original_source_pixels_pass(self):
        with tempfile.TemporaryDirectory() as name:
            root=Path(name);source,base,folder,row=self.fixture(root)
            self.assertEqual(len(self.verify(root,source,base,folder,row)),1)

    def test_changed_pixels_are_rejected_even_if_prepared_file_hash_was_updated(self):
        with tempfile.TemporaryDirectory() as name:
            root=Path(name);source,base,folder,row=self.fixture(root)
            with Image.open(base/'body.png') as image:
                image.putpixel((10,10),(0,0,0));image.save(base/'body.png')
            row['imageSha256']=hashlib.sha256((base/'body.png').read_bytes()).hexdigest()
            self.assertEqual(self.verify(root,source,base,folder,row),[])
            import json
            proof=json.loads((folder/'final-source-acceptance.json').read_text(encoding='utf8'))
            self.assertIn('FRESH_SOURCE_BODY_PIXELS_DIFFER',proof['reviewQueueAdditions'][0]['reasons'])

    def test_question_with_unbound_shared_paragraph_is_never_admitted(self):
        with tempfile.TemporaryDirectory() as name:
            root=Path(name);source,base,folder,row=self.fixture(root,shared=True)
            self.assertEqual(self.verify(root,source,base,folder,row),[])


if __name__=='__main__':unittest.main()
