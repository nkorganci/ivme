"""Identity preservation and idempotence contract for one-way development imports."""
import copy
import importlib.util
import sys
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
spec=importlib.util.spec_from_file_location('student_sync',ROOT/'scripts/sync-production-students.py')
sync=importlib.util.module_from_spec(spec)
spec.loader.exec_module(sync)

class StudentImportTest(unittest.TestCase):
    def test_existing_disabled_or_deleted_account_is_not_replaced(self):
        target=[{'id':8,'username':'Alice','email':'alice@example.com','enabled':False,'archived_at':'2026-10-18'}]
        previous=copy.deepcopy(target)
        self.assertEqual(sync.missing_accounts([{'id':1,'username':'alice','email':'ALICE@example.com'}],target),[])
        self.assertEqual(target,previous)

    def test_new_account_with_a_colliding_source_id_is_still_planned_as_new(self):
        target=[{'id':1,'username':'Bob','email':'bob@example.com'}]
        source={'id':1,'username':'Alice','email':'alice@example.com'}
        self.assertEqual(sync.missing_accounts([source],target),[source])
        self.assertEqual(target[0]['username'],'Bob')

    def test_partial_identity_collision_stops_without_replacing_any_account(self):
        target=[{'id':1,'username':'alice','email':'old@example.com'}]
        with self.assertRaises(ValueError):
            sync.missing_accounts([{'id':2,'username':'alice','email':'new@example.com'}],target)
        self.assertEqual(target[0]['email'],'old@example.com')

    def test_repeating_import_has_no_missing_accounts(self):
        account={'id':1,'username':'alice','email':'alice@example.com'}
        self.assertEqual(sync.missing_accounts([account],[dict(account)]),[])

if __name__=='__main__':unittest.main()
