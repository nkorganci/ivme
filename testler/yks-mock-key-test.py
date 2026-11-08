from pathlib import Path
import sys
import unittest
import pymupdf
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from yks_deneme_anahtar_pilotu import partition_key,printed_mock_numbers,SOURCES
from yks_birlestirme import Store,read_json
import json


class MockSourceKeyTest(unittest.TestCase):
    def test_same_numbers_remain_separate_in_four_actual_mock_sections(self):
        app=Path(__file__).resolve().parents[1];store=Store(app/'veri/yks-birlestirme');state=store.current()
        file=next(store.child(state['runId']+'/'+a['path']) for a in state['stages']['YKS-03:full']['artifacts'] if a['path'].endswith('pdf-groups.jsonl'))
        groups={g['sha256']:g for g in map(json.loads,file.read_text(encoding='utf-8').splitlines())}
        for sha,exam in SOURCES.items():
            row=groups[sha]['canonicalCandidate']
            with pymupdf.open(Path(row['root'])/row['path']) as doc:
                sections=partition_key(doc[-1],exam)
                self.assertEqual([len(s['answers']) for s in sections],[40,25,40,20] if exam=='TYT' else [40,46,40,40])
                self.assertEqual(len({(s['sectionId'],r['number']) for s in sections for r in s['answers']}),125 if exam=='TYT' else 166)

    def test_instruction_number_is_not_a_mock_identity(self):
        with pymupdf.open() as doc:
            page=doc.new_page();page.insert_text((36,50),'1. DENEME')
            page.insert_text((36,200),'2. Deneme instructions are below.')
            self.assertEqual(printed_mock_numbers([page]),{1})

    def test_duplicate_number_inside_one_column_is_refused(self):
        with pymupdf.open() as doc:
            page=doc.new_page(width=560,height=792)
            for x,title,count in [(70,'TURKCE TESTI',40),(180,'SOSYAL BILIMLER TESTI',25),(290,'TEMEL MATEMATIK TESTI',40),(420,'FEN BILIMLERI TESTI',20)]:
                page.insert_text((x,100),title,fontsize=6)
                for n in range(1,count+1):page.insert_text((x,130+n*12),str(n)+'. A',fontsize=9)
            page.insert_text((70,625),'1. B',fontsize=9)
            with self.assertRaises(ValueError):partition_key(page,'TYT')


if __name__=='__main__':unittest.main()
