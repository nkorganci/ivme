"""An empty YKS-09 package is acceptable only as a proven no-intake result."""
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from yks_birlestirme import Store, digest, read_json
from yks09_bos_kabul_paketi import FOLDER


class Yks09EmptyPackageTest(unittest.TestCase):
    def test_package_has_no_hidden_candidate_or_publication(self):
        store = Store(Path(__file__).resolve().parents[1] / 'veri/yks-birlestirme')
        root = store.child(store.current()['runId']); report = read_json(root / FOLDER / 'report.json')
        manifest = read_json(report['manifest'])
        self.assertEqual(report['status'], 'PASS')
        self.assertTrue(report['fullYks09ReadyForAcceptance'])
        self.assertEqual(report['newQuestionsAccepted'] + report['resources'] + report['questionBankWrites'], 0)
        self.assertFalse(report['catalogPublished'] or report['teacherApproved'] or report['learnerPublication'])
        self.assertEqual(manifest['resources'] + manifest['sourceCards'] + manifest['answerReadings'] + manifest['controlledLabels'], [])
        self.assertEqual(digest(report['manifest']), report['manifestSha256'])
        self.assertEqual(report['excludedObservations'], 8530)


if __name__ == '__main__': unittest.main()
