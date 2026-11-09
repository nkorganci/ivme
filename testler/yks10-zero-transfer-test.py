"""The full YKS-10 closure must remain read-only when its package is empty."""
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from yks_birlestirme import Store, read_json
from yks10_sifir_aktarim_kabulu import FOLDER


class Yks10ZeroTransferTest(unittest.TestCase):
    def test_full_transition_did_not_open_student_database_or_write(self):
        store = Store(Path(__file__).resolve().parents[1] / 'veri/yks-birlestirme')
        root = store.child(store.current()['runId']); report = read_json(root / FOLDER / 'report.json')
        self.assertEqual(report['status'], 'PASS')
        self.assertTrue(report['fullYks10ReadyForAcceptance'])
        self.assertEqual(report['packageResources'] + report['newQuestionsAccepted'], 0)
        self.assertEqual(report['productionQuestionWrites'] + report['productionCatalogWrites'], 0)
        self.assertFalse(report['studentDatabaseOpened'] or report['studentHistoryMutated'] or report['liveCutoverPerformed'])
        self.assertEqual(report['studentDatabaseWrites'] + report['oldIdsMergedOrDeleted'], 0)
        self.assertEqual(report['isolatedPilotBackendTests'], 4)
        self.assertEqual(report['isolatedPilotSecondImportInserted'], 0)


if __name__ == '__main__': unittest.main()
