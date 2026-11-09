"""Frozen similarity cannot create NEW, and a changed source cannot reuse it."""
from pathlib import Path
import sys
import unittest

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from yks_birlestirme import Store,read_json
from yks08_secili_karsilastirma import disposition


class SelectedComparisonTest(unittest.TestCase):
    def test_unchanged_low_similarity_is_excluded_without_a_positive_novelty_proof(self):
        card={'sourceSha256':'source','imageSha256':'pixels'}
        row={'sourceImageSha256':'pixels','existingCanonicalCodes':[]}
        compared={'sourceSha256':'source','status':'CONTENT_OR_IMAGE_REVIEW_REQUIRED','topTextCandidates':[]}
        self.assertEqual(disposition(card,row,compared)[0],'EXCLUDE_NO_RETRY')
        self.assertEqual(disposition(card,None,None)[0],'EXCLUDE_NO_RETRY')
        self.assertEqual(disposition(card,{**row,'sourceImageSha256':'old'},compared)[1],
                         'FROZEN_COMPARISON_BELONGS_TO_ANOTHER_SOURCE_VERSION')
        self.assertEqual(disposition(card,{**row,'existingCanonicalCodes':['old-id']},compared)[0],
                         'PRESERVE_EXISTING_ID_NO_NEW_QUESTION')

    def test_actual_selected_scope_is_disposed_and_original_ids_are_untouched(self):
        store=Store(Path(__file__).resolve().parents[1]/'veri/yks-birlestirme')
        root=store.child(store.current()['runId']);report=read_json(root/'selected-yks08-comparison/report.json')
        cards=read_json(root/'selected-yks07-acceptance/source-candidates.json')['cards']
        self.assertEqual({r['sourceCode'] for r in report['results']},{c['sourceCode'] for c in cards})
        self.assertEqual(report['bankQuestionsCompared'],report['currentBankImageStampsChecked'])
        self.assertEqual(report['frozenSourceComparisonsReused']+report['noComparisonProofExcluded'],len(cards))
        self.assertTrue(all(r['action']=='EXCLUDE_NO_RETRY' and not r['retryAllowed']
                            and not r['productionImportAllowed'] for r in report['results']))
        self.assertEqual(report['newQuestionsAccepted']+report['newModelCalls']+
                         report['newVisualEmbeddingCalls']+report['questionBankWrites'],0)
        original=read_json(root/'source-intake-queue/report.json')
        by_code={r['sourceCode']:r for r in original['results']}
        protected=read_json(root/'selected-yks08-comparison/protected-identities.json')['results']
        self.assertEqual(len(protected),3736)
        for row in protected:
            self.assertEqual(row['existingCanonicalCodes'],by_code[row['sourceCode']]['existingCanonicalCodes'])


if __name__=='__main__':unittest.main()
