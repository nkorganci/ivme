from pathlib import Path
import sys
import tempfile
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from yks_izole_kanit import validate,bound_file
from yks_birlestirme import Store,digest

APP=Path(__file__).resolve().parents[1]


class IsolatedImportProofTest(unittest.TestCase):
    def test_actual_four_db_cases_xml_cleanup_and_current_application_sources(self):
        store=Store(APP/'veri/yks-birlestirme');state=store.current()
        proof=validate(APP,store.child(state['runId']))
        self.assertEqual(proof['backendTests'],4)
        self.assertEqual(proof['newDatabaseTestRuns'],0)
        self.assertEqual(proof['productionQuestionWrites'],0)

    def test_changed_log_and_path_escape_cannot_reuse_success(self):
        with tempfile.TemporaryDirectory() as name:
            root=Path(name);path=root/'test.log';path.write_text('original')
            sha=digest(path);self.assertEqual(bound_file(root,path,sha),path.resolve())
            path.write_text('changed')
            with self.assertRaises(ValueError):bound_file(root,path,sha)
            with self.assertRaises(ValueError):bound_file(root/'nested',path,digest(path))


if __name__=='__main__':unittest.main()
