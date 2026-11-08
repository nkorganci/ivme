from pathlib import Path
import sys
import unittest
import pymupdf
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from yks_ayri_anahtar import body_check,key_section
from yks_pilot_kaynaklari import test_identities,source_keys,APP
from yks_birlestirme import Store


class SeparateSourceKeyTest(unittest.TestCase):
    def document(self,text):
        doc=pymupdf.open();page=doc.new_page(width=560,height=792)
        page.insert_text((36,100),text,fontsize=12)
        return doc

    def test_same_title_but_changed_statement_or_coefficient_does_not_inherit_key(self):
        with self.document('AYT TARAMA TESTI-18\n1. Source amount is 3 mol.') as left:
            for other in ('AYT TARAMA TESTI-18\n1. Source amount is 4 mol.',
                          'AYT TARAMA TESTI-18\n1. A revised statement.'):
                with self.document(other) as right:self.assertFalse(body_check(left[0],right[0])['matches'])

    def test_identical_body_matches_text_and_rendered_diagram_pixels(self):
        with self.document('1. Source question A) 1 B) 2 C) 3 D) 4 E) 5') as left:
            left[0].draw_line((50,150),(200,200))
            with pymupdf.open(stream=left.tobytes(),filetype='pdf') as right:
                result=body_check(left[0],right[0]);self.assertTrue(result['matches'])
                self.assertEqual(result['sourcePixelSha256'],result['bookPixelSha256'])
                right[0].draw_line((60,160),(210,210))
                self.assertFalse(body_check(left[0],right[0])['matches'])

    def test_one_key_section_does_not_mix_restarted_numbers_from_next_test(self):
        with pymupdf.open() as doc:
            page=doc.new_page(width=560,height=792)
            for y,text in [(80,'TYT TARAMA TESTI-4'),(110,'1. A'),(130,'2. B'),(150,'3. C'),(170,'4. D'),
                           (220,'TYT TARAMA TESTI-5'),(250,'1. E'),(270,'2. A'),(290,'3. B'),(310,'4. C')]:
                page.insert_text((36,y),text,fontsize=12)
            section=key_section(page,'TYT',4)
            self.assertEqual([r['answer'] for r in section['answers']],list('ABCD'))
            self.assertEqual(test_identities(section['text']),{('TYT',4)})

    def test_differing_low_option_is_not_hidden_by_a_fixed_page_percentage(self):
        with self.document('1. Source question') as left:
            left[0].insert_text((80,735),'E) 5',fontsize=12)
            with pymupdf.open(stream=left.tobytes(),filetype='pdf') as right:
                right[0].insert_text((140,735),'6',fontsize=12)
                self.assertFalse(body_check(left[0],right[0])['matches'])

    def test_real_twenty_sources_bind_nineteen_and_exclude_version_variant(self):
        store=Store(APP/'veri/yks-birlestirme');state=store.current()
        rows=source_keys(store.child(state['runId']+'/pdf-on-tarama/key-cohort'))
        self.assertEqual(len(rows),20)
        verified=[r for r in rows if r['status']=='SOURCE_KEY_VERIFIED']
        self.assertEqual(len(verified),19)
        self.assertEqual(sum(len(r['sourceAnswers']) for r in verified),387)
        variant=next(r for r in rows if r['providerCourse']=='Kimya (AYT)')
        self.assertIsNone(variant['sourceAnswers'])
        self.assertEqual(variant['exclusionReason'],'SEPARATE_BOOK_HAS_DIFFERENT_QUESTION_VERSION')
        tyt=next(r for r in rows if r['providerCourse']=='Kimya (TYT)')
        self.assertNotEqual(tyt['sourceSha256'],tyt['sourceKeyDocumentSha256'])
        self.assertEqual(tyt['bodyPageCount'],2)


if __name__=='__main__':unittest.main()
