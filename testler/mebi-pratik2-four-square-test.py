"""Keep matrix columns, chapter indices and printed A/B test variants separate."""
import sys
import unittest
import tempfile
import json
import hashlib
from unittest.mock import patch
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from mebi_pratik2_dort_dortluk import answer_matrices,discover,body_header,test_token
from mebi_pratik2_dort_dortluk_anahtar import same_contiguous_letters
import mebi_pratik2_dort_dortluk_anahtar as key_reader


def line(text,x,y,width=25):return {'text':text,'bbox':[x,y,x+width,y+10]}


def matrix(heading=True,chapter='Sinir Sistemi'):
    lines=[line(chapter,40,65,200)]
    if heading:lines.append(line('CEVAP ANAHTARI',200,20,150))
    lines.extend(line(str(n),100+n*50,90) for n in range(1,6))
    for token,y,letters in [('1. TEST - A',120,'ABCDE'),('1. TEST - B',145,'BCDEA')]:
        lines.append(line(token,35,y,90));lines.extend(line(c,100+n*50,y) for n,c in enumerate(letters,1))
    return {'physicalPage':2,'rect':[0,0,600,800],'lines':lines}


class FourSquareTests(unittest.TestCase):
    def test_identical_prior_independent_key_is_reused_without_model(self):
        with tempfile.TemporaryDirectory() as tmp:
            base=Path(tmp);image=base/'key.png';image.write_bytes(b'original-key-pixels');sha=hashlib.sha256(image.read_bytes()).hexdigest()
            previous=base/'old/independent-keys';previous.mkdir(parents=True)
            (previous/'source-group.json').write_text(json.dumps({'status':'AGREES','imageSha256':sha}),encoding='utf8')
            root=base/'new';root.mkdir()
            group={'groupId':'source-group','keyImage':'key.png','keyImageSha256':sha}
            with patch.object(key_reader,'BASE',base):result=key_reader.read_key(group,None,None,root)
            self.assertEqual(result['status'],'AGREES')
            self.assertEqual(result['method'],'IDENTICAL_SOURCE_KEY_INDEPENDENT_READING_REUSED')

    def test_changed_key_pixels_cannot_inherit_the_previous_reading(self):
        with tempfile.TemporaryDirectory() as tmp:
            base=Path(tmp);image=base/'key.png';image.write_bytes(b'changed-key-pixels');sha=hashlib.sha256(image.read_bytes()).hexdigest()
            previous=base/'old/independent-keys';previous.mkdir(parents=True)
            (previous/'source-group.json').write_text(json.dumps({'status':'AGREES','imageSha256':'old-hash'}),encoding='utf8')
            root=base/'new';root.mkdir()
            group={'groupId':'source-group','keyImage':'key.png','keyImageSha256':sha,'keyIdentityType':'SINGLE_TEST_PRINTED_NUMBER',
                   'sourceQuestionCode':'question','answers':{'1':'A'}}
            old={'question':{'status':'AGREES','imageSha256':'old-hash','reading':{'number':1,'answer':'A'}}}
            with patch.object(key_reader,'BASE',base),patch.object(key_reader,'SINGLE_KEYS',old):
                result=key_reader.read_key(group,None,None,root)
            self.assertEqual(result['status'],'REVIEW_REQUIRED')

    def test_independent_letter_order_cannot_hide_a_missing_column(self):
        self.assertTrue(same_contiguous_letters('A B C',{'1':'A','2':'B','3':'C'}))
        self.assertFalse(same_contiguous_letters('A C',{'1':'A','3':'C'}))
        self.assertFalse(same_contiguous_letters('A X C',{'1':'A','2':'B','3':'C'}))
    def test_variants_keep_different_answers_at_the_same_number(self):
        groups,issues=answer_matrices(matrix())
        self.assertEqual([g['testToken'] for g in groups],['1A','1B'])
        self.assertEqual(groups[0]['answers'][0]['answer'],'A')
        self.assertEqual(groups[1]['answers'][0]['answer'],'B')

    def test_missing_heading_does_not_hide_an_actual_printed_matrix(self):
        groups,_=answer_matrices(matrix(heading=False))
        self.assertEqual(len(groups),2)

    def test_an_empty_cell_never_shifts_later_answers_to_the_left(self):
        page=matrix();page['lines']=[l for l in page['lines'] if not (l['text']=='B' and l['bbox'][:2]==[200,120])]
        groups,_=answer_matrices(page)
        answers={r['printedNumber']:r['answer'] for r in groups[0]['answers']}
        self.assertNotIn(2,answers);self.assertEqual(answers[3],'C')

    def test_large_opening_page_numeral_and_variant_bind_to_1b(self):
        page={'rect':[0,0,600,800],'lines':[line('Sinir Sistemi',250,25,100),line('1',520,0),line('TEST',540,20),line('B',560,40)]}
        self.assertEqual(body_header(page),('Sinir Sistemi','1B'))

    def test_multiline_chapter_heading_is_preserved(self):
        page={'rect':[0,0,600,800],'lines':[line('Atomun Kuantum Modeli',180,19,220),line('ve Periyodik Sistem',220,31,180),line('1. TEST',500,30,80)]}
        self.assertEqual(body_header(page),('Atomun Kuantum Modeli ve Periyodik Sistem','1'))

    def test_question_at_top_of_column_cannot_enter_chapter_heading(self):
        page={'rect':[0,0,600,800],'lines':[line('Gerçek Sayı Dizileri',200,19,200),line('Çözümlü Sorular',450,19,130),
            line('25. (an) dizisinin limiti',36,45,230)]}
        self.assertEqual(body_header(page),('Gerçek Sayı Dizileri','SOLVED'))

    def test_top_question_above_sixty_is_bound_instead_of_lost(self):
        body={'physicalPage':1,'rect':[0,0,600,800],'lines':[line('Sinir Sistemi',250,19,100),line('1. TEST - A',500,19,80),
              line('1. A complete question',36,45,200)]}
        result=discover({'pages':[body,matrix()]})
        self.assertEqual(result['boundMatrixBodies'],1)

    def test_printed_chapter_index_can_match_an_unindexed_body(self):
        body={'physicalPage':1,'rect':[0,0,600,800],'lines':[line('Sinir Sistemi',250,25,100),line('1. TEST - A',500,30,80),line('1. A complete question',36,80,200)]}
        result=discover({'pages':[body,matrix(chapter='1. SİNİR SİSTEMİ')]})
        self.assertEqual(result['boundMatrixBodies'],1)
        self.assertTrue(result['groups'][0]['printedChapterIndexRemovedForBodyIdentity'])

    def test_real_century_numbers_are_not_removed_from_equal_titles(self):
        body={'physicalPage':1,'rect':[0,0,600,800],'lines':[line('20. Yüzyıl',250,25,100),line('1. TEST - A',500,30,80),line('1. A complete question',36,80,200)]}
        result=discover({'pages':[body,matrix(chapter='20. Yüzyıl')]})
        self.assertEqual(result['boundMatrixBodies'],1)
        self.assertFalse(result['groups'][0].get('printedChapterIndexRemovedForBodyIdentity',False))


if __name__=='__main__':unittest.main()
