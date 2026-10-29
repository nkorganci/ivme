"""Pure source-identity checks; no connection to the live database."""
import sys
import base64
from pathlib import Path
import unittest
import tempfile
import pymupdf

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from pdf_source_reconcile import text_fingerprint, prose_fingerprint,excluded_exam,canonical, database_page, header_orphans
from pdf_sb_evidence import printed_positions,printed_answers
from pdf_slide_questions import two_answer_readings
from pdf_question_accept import validate_card,reviewed_answer
from pdf_slide_compare import compare,split_question,validate_link


class SourceIdentityTest(unittest.TestCase):
    def test_complete_option_comparison_rejects_similar_topic_and_keeps_answer_permutation(self):
        source='Bir kuram neden sınanabilir?\nA) Deney\nB) Akıl\nC) Sezgi\nD) İnanç\nE) Dogma'
        permuted=source.replace('A) Deney\nB) Akıl','A) Akıl\nB) Deney')
        result=compare(source,permuted,'A','B')
        self.assertEqual(result['status'],'VERIFIED_TEXT_OPTIONS_AND_MAPPED_ANSWER')
        self.assertEqual(result['answerPermutation'],{'A':'B','B':'A'})
        for altered in [source.replace('neden','ne zaman'),source.replace('Dogma','Varsayım'),source.replace('sınanabilir','sınanamaz')]:
            self.assertNotEqual(compare(source,altered,'A','A')['status'],'VERIFIED_TEXT_OPTIONS_AND_MAPPED_ANSWER')
        self.assertEqual(compare(source,permuted,'A','A')['status'],'ANSWER_REVIEW')

    def test_exam_caption_and_connector_removal_keeps_the_actual_stem(self):
        question='2018-AYT/Türk Dili ve Edebiyatı-Sosyal\nBilimler-1\nBu parçadan hareketle hangi yargı çıkar?\nA) Bir\nB) İki\nC) Üç\nD) Dört\nE) Beş'
        self.assertEqual(split_question(question)[0].strip(),'hangi yargı çıkar?')

    def test_language_questions_preserve_punctuation_case_and_word_boundaries(self):
        question='Hangi yazım doğrudur?\nA) bir çok\nB) yalnız\nC) Ahmet, geldi.\nD) Türkçe\nE) bugün'
        for changed in [question.replace('bir çok','birçok'),question.replace('Ahmet,','Ahmet'),question.replace('Türkçe','türkçe')]:
            self.assertNotEqual(compare(question,changed,'B','B',strict_language=True)['status'],'VERIFIED_TEXT_OPTIONS_AND_MAPPED_ANSWER')
        self.assertEqual(compare(question,question.replace('\n','\n\n'),'B','B',strict_language=True)['status'],'VERIFIED_TEXT_OPTIONS_AND_MAPPED_ANSWER')
        self.assertEqual(compare(question+' Altı çizili sözcük',question+' Altı çizili sözcük','B','B',strict_language=True)['status'],'VISUAL_REVIEW')

    def test_verified_link_rejects_later_answer_text_or_package_changes(self):
        import hashlib
        text='Bir kuram neden sınanabilir?\nA) Deney\nB) Akıl\nC) Sezgi\nD) İnanç\nE) Dogma'
        sha=hashlib.sha256(text.encode()).hexdigest()
        card={'code':'source','text':text,'imageSha256':'a'*64,'answer':'A','answerMethodA':'A','answerMethodB':'A'}
        question={'source_stamp':'1','correct_answer':'A'}
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/'candidates.json';path.write_text('{}')
            row={'sourceTextSha256':sha,'bankTextSha256':sha,'sourceImageSha256':'a'*64,'bankImageSha256':'b'*64,
                 'packageSha256':hashlib.sha256(b'{}').hexdigest(),'bankStamp':'1','sourceAnswer':'A','bankAnswer':'A',
                 'teacherApproved':False,**compare(text,text,'A','A')}
            validate_link(row,card,path,question,text,'b'*64)
            for changed in [{**question,'correct_answer':'B'},{**question,'source_stamp':'2'}]:
                with self.assertRaisesRegex(ValueError,'changed'):validate_link(row,card,path,changed,text,'b'*64)
            with self.assertRaisesRegex(ValueError,'changed'):validate_link(row,card,path,question,text+' ek','b'*64)
            path.write_text('{"changed":true}')
            with self.assertRaisesRegex(ValueError,'changed'):validate_link(row,card,path,question,text,'b'*64)

    def test_other_exam_headers_are_excluded_without_matching_words_in_question_prose(self):
        self.assertEqual(excluded_exam('2019-MSÜ/Sosyal Bilimler\nSoru metni'),'MSÜ')
        self.assertEqual(excluded_exam('2020 - KPSS / Tarih\nSoru metni'),'KPSS')
        self.assertIsNone(excluded_exam('2011-LYS4/TAR\nTYT/AYT ders örneği'))
        self.assertIsNone(excluded_exam('Bir öğrenci 2019 yılında MSÜ sınavına girmiştir.'))

    def test_printed_source_key_cannot_override_a_proved_role_order(self):
        from pdf_slide_source_review import CORRECTIONS
        import copy
        text=('I.Turan (Hilal) taktiği\nII.Hayvan figürleri\nIII.İkili teşkilat\n'
              'sanatta betimleme, savaş yöntemi ve devlet yönetimi sırası?\n'
              'A)I, II, III\nB)I, III, II\nC)II, I, III\nD)II, III, I\nE)III, I, II')
        card={'text':text,'answer':'E'}
        correction=copy.deepcopy(CORRECTIONS['pdf-41807fc85f9bcbe3-p0047-q01'])
        self.assertEqual(reviewed_answer(card,{'answerCorrection':correction}),'C')
        correction['correctedAnswer']='E'
        with self.assertRaisesRegex(ValueError,'not proved'):reviewed_answer(card,{'answerCorrection':correction})

    def test_prose_matching_keeps_negation_dates_options_and_variable_boundaries(self):
        body='Bir düşünürün bilgi anlayışında duyumlar ve akıl birlikte ele alınır. '*4
        question='\nBuna göre aşağıdakilerden hangisi söylenemez? A) 1919 B) Duyum C) Akıl D) Deney E) Sezgi'
        original=body+question
        self.assertEqual(prose_fingerprint(original),prose_fingerprint(original.replace('Buna göre ','')))
        for changed in [original.replace('söylenemez','söylenebilir'),original.replace('1919','1920'),
                        original.replace('Sezgi','İnanç'),original.replace('1919','19 19')]:
            self.assertNotEqual(prose_fingerprint(original),prose_fingerprint(changed))
        self.assertNotEqual(prose_fingerprint(original+' A B'),prose_fingerprint(original+' AB'))
        self.assertIsNone(prose_fingerprint(original+' grafikte verilenler'))
        self.assertIsNone(prose_fingerprint(original+' x=2'))

    def test_split_answer_rows_preserve_inline_letters_before_pairing_shifted_letters(self):
        with tempfile.TemporaryDirectory() as folder,pymupdf.open() as document:
            page=document.new_page(width=600,height=800)
            for index,number in enumerate(range(91,98)):
                x=31.5+26.2*index
                page.insert_text((x,80),str(number)+'.',fontsize=9)
                if number in (91,97):page.insert_text((x+14.5,80),'A',fontsize=9)
            for index,letter in enumerate('BEECE'):page.insert_text((334.3+26.2*index,80),letter,fontsize=9)
            path=Path(folder)/'split.pdf';document.save(path)
            answers,conflicts=printed_answers(path,{'pages':[{'page':1,'text':'Cevap Anahtarı'}]})
            self.assertEqual(answers,{91:'A',92:'B',93:'E',94:'E',95:'C',96:'E',97:'A'})
            self.assertEqual(conflicts,[])

    def test_source_acceptance_keeps_canonical_answers_when_options_are_permuted(self):
        import hashlib
        card={'code':'source-58','answer':'C','answerMethodA':'C','answerMethodB':'C','text':'Source cross',
              'imageSha256':'a'*64}
        decision={'decision':'MATCH','exam':'TYT','teacherApproved':False,'categoryIds':['topic'],
                  'imageSha256':'a'*64,'sourceTextSha256':hashlib.sha256(card['text'].encode()).hexdigest(),
                  'answerPermutation':{'C':'D','D':'C'}}
        canonical={'active':True,'exam_type':'TYT','correct_answer':'D'}
        validate_card(card,decision,canonical)
        decision['answerPermutation']={}
        with self.assertRaisesRegex(ValueError,'Canonical answer'):validate_card(card,decision,canonical)
        decision['answerPermutation']={'C':'D','D':'D'}
        with self.assertRaisesRegex(ValueError,'bijection'):validate_card(card,decision,canonical)

    def test_disagreeing_source_keys_and_changed_evidence_cannot_be_imported(self):
        import hashlib
        card={'code':'source-1','answer':'A','answerMethodA':'A','answerMethodB':'B','text':'Source text','imageSha256':'a'*64}
        decision={'decision':'NEW','exam':'TYT','teacherApproved':False,'categoryIds':['topic'],
                  'imageSha256':'a'*64,'sourceTextSha256':hashlib.sha256(card['text'].encode()).hexdigest()}
        with self.assertRaisesRegex(ValueError,'answer readings'):validate_card(card,decision)
        card['answerMethodB']='A';decision['imageSha256']='b'*64
        with self.assertRaisesRegex(ValueError,'changed'):validate_card(card,decision)

    def test_question_number_and_line_wrapping_do_not_create_a_new_question(self):
        text = 'Bir paragrafın anlamı ve seçenekleri ' * 4 + ' A) ilk B) ikinci C) üçüncü D) dördüncü E) son'
        self.assertEqual(text_fingerprint('1.\n' + text), text_fingerprint('27. ' + text.replace(' ', '\n')))

    def test_math_exponents_signs_case_and_token_boundaries_are_preserved(self):
        prefix = 'Aşağıdaki eşitliklerden hangisi verilen koşulu sağlamaktadır? ' * 2
        for first, second in [('x²', 'x2'), ('x + 1', 'x - 1'), ('a', 'A'), ('1 2', '12')]:
            with self.subTest(first=first, second=second):
                self.assertNotEqual(text_fingerprint(prefix + first), text_fingerprint(prefix + second))

    def test_source_path_aliases_resolve_without_dropping_subfolders(self):
        self.assertEqual(canonical('Kaynaklar\\ogm-materyal\\Fizik\\TYT\\x.pdf'), 'fizik/tyt/x.pdf')
        self.assertNotEqual(canonical('Fizik/TYT/x.pdf'), canonical('Fizik/AYT/x.pdf'))

    def test_duplicate_printed_question_numbers_are_reported(self):
        observation = {'pages': [{'page': 1, 'examples': [{'number': 1, 'text': 'Soru 1'}]},
                                 {'page': 2, 'examples': [{'number': 1, 'text': 'Soru 1'}]}]}
        _, duplicates = printed_positions(observation)
        self.assertEqual(duplicates, [1])

    def test_unrepresentable_pdf_text_is_preserved_for_database_storage(self):
        original = 'formül\x00kanıt'
        stored = database_page({'page': 1, 'text': original})
        self.assertNotIn('\x00', stored['text'])
        self.assertEqual(base64.b64decode(stored['originalTextUtf8Base64']).decode(), original)
        self.assertTrue(stored['requiresVisualReview'])

    def test_only_known_headings_in_the_header_band_explain_orphan_regions(self):
        profile={'records':[{'konu_basligi':'Sinir Sistemi'}],
                 'summary':{'yetim':[[0,0,'Sinir Sistemi - A',[[10,20,150,35]]]]}}
        observations={'pages':[{'height':842}]}
        self.assertIsInstance(header_orphans(profile,observations),list)
        profile['summary']['yetim'][0][3]=[[10,300,150,315]]
        self.assertIs(header_orphans(profile,observations),False)
        profile['summary']['yetim'][0]=[0,0,'Yeni soru metni',[[10,20,150,35]]]
        self.assertIs(header_orphans(profile,observations),False)

    def test_source_vector_color_and_rendered_answer_pixels_must_agree(self):
        for correct in [[],['E'],['B','E']]:
            with self.subTest(correct=correct),pymupdf.open() as document:
                page=document.new_page(width=600,height=800)
                for index,letter in enumerate('ABCDE'):
                    page.insert_text((80,200+index*40),letter+')',fontsize=18,
                                     color=(1,0,0) if letter in correct else (0,0,0))
                    page.insert_text((115,200+index*40),'Source option text',fontsize=18,color=(0,0,0))
                expected=('E','E') if correct==['E'] else None
                self.assertEqual(two_answer_readings(page),expected)
        with pymupdf.open() as document:
            page=document.new_page(width=600,height=800)
            for index,letter in enumerate('ABCDE'):
                page.insert_text((80,200+index*40),letter+') option',fontsize=18,
                                 color=(1,0,0) if letter=='E' else (0,0,0))
            page.draw_rect(pymupdf.Rect(60,330,300,380),color=(1,1,1),fill=(1,1,1),overlay=True)
            self.assertIsNone(two_answer_readings(page),'Hidden red source text must not pass the rendered-pixel check')


if __name__ == '__main__':
    unittest.main()
