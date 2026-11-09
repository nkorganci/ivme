"""Full YKS-08 finalizes every source disposition without an invented NEW."""
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from yks_birlestirme import Store, read_json, digest
from yks08_tam_kabul import final_action, FOLDER


class Yks08FullAcceptanceTest(unittest.TestCase):
    def test_only_final_exclusion_can_replace_selected_source_candidate(self):
        selected = {'action': 'EXCLUDE_NO_RETRY', 'reason': 'NO_POSITIVE_CONTENT_AND_NOVELTY_ACCEPTANCE'}
        self.assertEqual(final_action('PDF_BODY_AND_TWO_PRINTED_KEY_READINGS_VERIFIED', selected)[0],
                         'EXCLUDE_NO_RETRY')
        self.assertEqual(final_action('PRESERVE_EXISTING_ID_NO_NEW_QUESTION', None)[0],
                         'PRESERVE_EXISTING_ID_NO_NEW_QUESTION')
        with self.assertRaises(ValueError):
            final_action('PDF_BODY_AND_TWO_PRINTED_KEY_READINGS_VERIFIED', None)

    def test_full_ledger_preserves_identities_and_has_no_new_question(self):
        store = Store(Path(__file__).resolve().parents[1] / 'veri/yks-birlestirme')
        root = store.child(store.current()['runId']); report = read_json(root / FOLDER / 'report.json')
        rows = read_json(report['finalDispositions'])['results']
        source = read_json(root / 'selected-yks07-acceptance/question-dispositions.json')['results']
        self.assertEqual(len(rows), report['sourceDecisionObservations'])
        self.assertEqual({r['sourceCode'] for r in rows}, {r['sourceCode'] for r in source})
        self.assertEqual(sum(report['actions'].values()), len(rows))
        self.assertEqual(report['actions']['EXCLUDE_NO_RETRY'], 8530)
        self.assertEqual(report['actions']['PRESERVE_EXISTING_ID_NO_NEW_QUESTION'], 3697)
        self.assertEqual(report['actions']['REUSE_PREFERRED_LOCATOR_NO_NEW_QUESTION'], 36)
        self.assertEqual(report['actions']['KEEP_ISOLATED_PROOF_NO_PRODUCTION'], 3)
        self.assertTrue(report['noNewQuestions'])
        self.assertEqual(report['newQuestionsAccepted'] + report['questionBankWrites'] + report['oldIdsMergedOrDeleted'], 0)
        self.assertTrue(all(not r['retryAllowed'] and not r['learnerVisible'] and not r['productionImportAllowed'] for r in rows))
        self.assertEqual(digest(report['finalDispositions']), report['finalDispositionsSha256'])


if __name__ == '__main__': unittest.main()
