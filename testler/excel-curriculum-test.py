"""Independent source comparison, including a poisoned second worksheet."""
import importlib.util
import json
import tempfile
import subprocess
import unittest
from pathlib import Path

import openpyxl

APP=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('excel_import',APP/'scripts/excel-curriculum-import.py')
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class ExcelReferenceTest(unittest.TestCase):
    def test_all_source_rows_and_cells_match_the_shared_registry(self):
        source=module.first_sheet()
        taxonomy=json.loads((APP/'backend/src/main/resources/content-taxonomy.json').read_text(encoding='utf-8'))
        by_row={}
        for c in taxonomy['categories']:
            if c.get('curriculumSource')!='EXCEL_FIRST_SHEET':
                self.assertFalse(c.get('selectable'))
                continue
            by_row.setdefault(c['sourceRow'],[]).append(c)
        self.assertEqual(len(by_row),453)
        for row in source['rows']:
            categories=by_row[row['row']]
            self.assertEqual({c['exam'] for c in categories},{exam for exam in ['TYT','AYT'] if row[exam.lower()]})
            for c in categories:
                self.assertEqual(c['distribution'],{**row,'years':source['years']})
                self.assertEqual(c['sourceSubject'],row['subject'])
                self.assertEqual(c['unit'],row['unit'])
                self.assertEqual(c['topic'],row['topic'])
        self.assertEqual(taxonomy['unitReference']['sha256'],source['sha256'])

    def test_combined_subjects_are_exclusive_and_ids_survive_the_split(self):
        source=module.first_sheet()
        taxonomy=json.loads((APP/'backend/src/main/resources/content-taxonomy.json').read_text(encoding='utf-8'))
        current=[c for c in taxonomy['categories'] if c.get('selectable')]
        geometry_rows={40,41,42,43,44,50,51,53,54,59,60,68,69,70,71,72}
        for row in source['rows']:
            expected=('geometri','Geometri') if row['row'] in geometry_rows else ('matematik','Matematik') if row['subject']=='Matematik + Geometri' else ('turkce','Türkçe') if row['row'] in range(5,18) else ('edebiyat','Edebiyat') if row['subject']=='Türkçe / Edebiyat' else None
            categories=[c for c in current if c['sourceRow']==row['row']]
            self.assertEqual(len({c['subjectId'] for c in categories}),1)
            if expected:
                self.assertEqual({(c['subjectId'],c['subject']) for c in categories},{expected})
        self.assertEqual(taxonomy['unitReference']['subjects'],14)
        self.assertEqual(taxonomy['unitReference']['sourceSubjects'],12)
        expected_ids={(c['sourceRow'],c['exam']):c['id'] for c in current}
        # Simulate the former combined definitions. Names/scopes change; saved IDs do not.
        for c in current:
            if c['sourceSubject'] in ['Matematik + Geometri','Türkçe / Edebiyat']:
                c['subject']=c['sourceSubject']
                c['subjectId']='matematik' if c['sourceSubject']=='Matematik + Geometri' else 'turkce'
        with tempfile.TemporaryDirectory(dir=APP/'veri') as directory:
            file=Path(directory)/'taxonomy.json';file.write_text(json.dumps(taxonomy,ensure_ascii=False),encoding='utf-8')
            subprocess.run(['node','scripts/excel-curriculum-import.mjs','--taxonomy='+str(file)],cwd=APP,
                input=json.dumps(source,ensure_ascii=False).encode('utf-8'),capture_output=True,check=True)
            actual=json.loads(file.read_text(encoding='utf-8'))
            self.assertEqual({(c['sourceRow'],c['exam']):c['id'] for c in actual['categories'] if c.get('selectable')},expected_ids)

    def test_other_worksheets_do_not_affect_the_reference(self):
        # Keep the temporary workbook inside the root so provenance paths remain relative.
        with tempfile.TemporaryDirectory(dir=APP/'veri') as directory:
            file=Path(directory)/'source.xlsx'
            book=openpyxl.Workbook();sheet=book.active;sheet.title='ONLY_FIRST'
            sheet.append(['Title']);sheet.append(['Description']);sheet.append(['Groups'])
            sheet.append(['Ders','TYT','AYT','Sınıf','Ünite','Konu'])
            sheet.append(['Fizik','✓',None,'9','Ünite','Konu',0,None,0,0,None,None,*([0]*9),*([None]*9),None,None])
            second=book.create_sheet('DO_NOT_READ');second.append(['Invalid lesson',-999]);book.save(file)
            before=module.first_sheet(file)
            second['A1']='Different and still invalid';book.save(file)
            after=module.first_sheet(file)
            self.assertEqual(before,after)
            self.assertEqual(after['rows'][0]['tytTotal'],0)
            self.assertIsNone(after['rows'][0]['aytTotal'])

    def test_renaming_a_topic_preserves_ids_and_removing_an_exam_preserves_history(self):
        source=module.first_sheet()
        original=json.loads((APP/'backend/src/main/resources/content-taxonomy.json').read_text(encoding='utf-8'))
        expected={c['exam']:c['id'] for c in original['categories'] if c.get('sourceRow')==5 and c.get('selectable')}
        source['rows'][0]['topic']='Sözcükte Anlam (güncel başlık)'
        source['rows'][0]['ayt']=None
        with tempfile.TemporaryDirectory(dir=APP/'veri') as directory:
            file=Path(directory)/'taxonomy.json';file.write_text(json.dumps(original,ensure_ascii=False),encoding='utf-8')
            subprocess.run(['node','scripts/excel-curriculum-import.mjs','--taxonomy='+str(file)],cwd=APP,
                input=json.dumps(source,ensure_ascii=False).encode('utf-8'),capture_output=True,check=True)
            result=json.loads(file.read_text(encoding='utf-8'))
            by_id={c['id']:c for c in result['categories']}
            self.assertEqual(by_id[expected['TYT']]['topic'],source['rows'][0]['topic'])
            self.assertIn('Sözcükte Anlam',by_id[expected['TYT']]['aliases'])
            self.assertTrue(by_id[expected['TYT']]['selectable'])
            self.assertFalse(by_id[expected['AYT']]['selectable'])


if __name__=='__main__':
    unittest.main()
