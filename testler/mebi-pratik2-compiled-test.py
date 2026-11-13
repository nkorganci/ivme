import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from mebi_pratik2_tarama_kitap import discover


def line(text,x,y):return {'text':text,'bbox':[x,y,x+70,y+12]}


class CompiledTestIdentityTests(unittest.TestCase):
    def pages(self):
        pages=[]
        for test in (1,2):
            pages.append({'physicalPage':test,'rect':[0,0,595,841],
                'lines':[line(f'AYT TARAMA TESTI-{test}',36,25)]+[line(f'{n}. Body',36,90+n*75) for n in range(1,7)]})
        keys=[]
        for test,y in [(1,100),(2,300)]:
            keys.append(line(f'AYT TARAMA TESTI-{test}',150,y))
            keys.extend(line(f'{n}. '+('A' if test==1 else 'E'),45+n*50,y+25) for n in range(1,7))
        pages.append({'physicalPage':3,'rect':[0,0,595,841],'lines':keys})
        return pages

    def test_same_numbers_belong_to_their_own_printed_test(self):
        groups,_=discover({'pages':self.pages()},'AYT')
        self.assertEqual([g['status'] for g in groups],['NATIVE_PRINTED_TEST_BINDING_CANDIDATE']*2)
        self.assertEqual({q['answer'] for q in groups[0]['questions']},{'A'})
        self.assertEqual({q['answer'] for q in groups[1]['questions']},{'E'})

    def test_repeated_identical_key_is_an_additional_source_occurrence(self):
        pages=self.pages();pages.append({'physicalPage':4,'rect':[0,0,595,841],
            'lines':[line('AYT TARAMA TESTI-1',150,100)]+[line(f'{n}. A',45+n*50,125) for n in range(1,7)]})
        groups,_=discover({'pages':pages},'AYT')
        self.assertEqual(groups[0]['status'],'NATIVE_PRINTED_TEST_BINDING_CANDIDATE')
        self.assertEqual(len(groups[0]['questions'][0]['keyOccurrences']),2)

    def test_conflicting_printed_key_occurrences_never_get_admitted(self):
        pages=self.pages();pages.append({'physicalPage':4,'rect':[0,0,595,841],
            'lines':[line('AYT TARAMA TESTI-1',150,100)]+[line(f'{n}. D',45+n*50,125) for n in range(1,7)]})
        groups,_=discover({'pages':pages},'AYT')
        self.assertEqual(groups[0]['status'],'REVIEW_REQUIRED')
        self.assertIn('CONFLICTING_PRINTED_KEY_OCCURRENCES',groups[0]['reasons'])
        self.assertEqual(groups[0]['questions'],[])


if __name__=='__main__':unittest.main()
