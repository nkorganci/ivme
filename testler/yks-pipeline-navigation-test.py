"""Compare the pipeline consumer with the actual prepared frontend projection; no DB writes."""
import copy
import json
from pathlib import Path
import sys
import unittest
import importlib.util
import os
import subprocess

if importlib.util.find_spec('psycopg') is None:
    interpreter=Path(os.environ.get('IVME_PIPELINE_PYTHON',str(Path.home()/'.venvs/ogm-pipeline/Scripts/python.exe')))
    if not interpreter.is_file() or interpreter.resolve()==Path(sys.executable).resolve():
        raise RuntimeError('Pipeline Python environment with psycopg is required')
    raise SystemExit(subprocess.run([str(interpreter),'-X','utf8',str(Path(__file__).resolve())]).returncode)

APP=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(APP.parent/'pipeline'))
from catalog_reference import project_categories
from catalog_taxonomy import content_groups


class PublishedNavigationTest(unittest.TestCase):
    def test_prepared_tree_matches_frontend_every_identity_and_scope(self):
        control=APP/'veri/yks-birlestirme'
        run=json.loads((control/'current.json').read_text(encoding='utf-8'))['runId']
        folder=control/run/'yol-uyumluluk'
        source=json.loads((folder/'maintenance-candidate.json').read_text(encoding='utf-8'))
        frontend=json.loads((folder/'curriculum-identities-candidate.json').read_text(encoding='utf-8'))
        before=copy.deepcopy(source['categories'])
        rows=project_categories(source['categories'],source['curriculumNavigation'])
        keys=('id','exam','subjectId','topic','order','unit','unitId','contentKey')
        fields=lambda row:{key:row.get(key) for key in keys}
        self.assertEqual({r['id']:fields(r) for r in rows},{r['id']:fields(r) for r in frontend['canonicalUnits']})
        self.assertEqual(source['categories'],before)
        groups=content_groups(rows)
        self.assertEqual(sum(len(g['references']) for g in groups),len(rows))
        self.assertEqual({r['id'] for g in groups for r in g['references']},{r['id'] for r in rows})

    def test_inactive_navigation_keeps_previous_selection(self):
        rows=[{'id':'keep','canonicalUnit':True},{'id':'hidden','canonicalUnit':True,'selectable':False}]
        self.assertEqual(project_categories(rows),[rows[0]])
        self.assertIs(project_categories(rows)[0],rows[0])

    def test_wrong_scope_is_refused(self):
        navigation={'version':1,'authority':'MEBI_PROVIDER','courses':[{'subjectId':'fizik','units':[{'id':'u','title':'U','topics':[
            {'categoryId':'leaf','sourceExam':'TYT','title':'T','contentKey':'c'}]}]}]}
        with self.assertRaisesRegex(ValueError,'identity/scope'):
            project_categories([{'id':'leaf','exam':'AYT','subjectId':'fizik'}],navigation)


if __name__=='__main__':
    unittest.main()
