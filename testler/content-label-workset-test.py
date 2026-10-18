"""Identity, role and missing-data regression checks on small source fixtures."""
import copy
import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('workset', Path(__file__).resolve().parents[1] / 'scripts/content-label-workset.py')
workset = importlib.util.module_from_spec(spec)
spec.loader.exec_module(workset)


class WorksetTest(unittest.TestCase):
    def test_latest_report_uses_timestamp_instead_of_run_hash_order(self):
        old=Path('labels-v1-ffff-20261016T110000Z.json')
        new=Path('labels-v1-1111-20261016T120000Z.json')
        self.assertEqual(workset.latest_report([old,new]),new)

    def fixture(self, kind='QUESTION', key='question:q1'):
        return {'categories': [{'id': 'c1', 'topic': 'Hareket'}], 'items': [
            {'key': key, 'kind': kind, 'exam': 'TYT', 'subjectId': 'fizik', 'studentVisible': True,
             'availability': 'available', 'automaticLabels': {'inputFingerprint': 'current', 'assignments': [
                 {'categoryId': 'c1', 'relation': 'PRIMARY'}], 'evidence': [{'type': 'SOURCE_TOPIC'}]}}]}

    def test_duplicates_are_rejected_instead_of_overwritten(self):
        data = self.fixture()
        data['items'].append(copy.deepcopy(data['items'][0]))
        with self.assertRaisesRegex(ValueError, 'Duplicate identity'):
            workset.build(data, [], [], [])

    def test_missing_relation_data_does_not_claim_reading_or_verification(self):
        records, queue, summary = workset.build(self.fixture('PDF', 'pdf:1'), [], [], [])
        self.assertIn('PDF_PAGE_RANGE_MISSING', queue[0]['reasons'])
        self.assertIn('RELATION_CONFIDENCE_MISSING', queue[0]['reasons'])
        self.assertEqual(summary['metrics']['kind:PDF']['relationsWithConfidence'], 0)
        self.assertEqual(records[0]['reviewState'], 'PENDING')

    def test_same_pdf_bytes_keep_catalog_references(self):
        data = self.fixture('PDF', 'pdf:1')
        data['items'].append({**copy.deepcopy(data['items'][0]), 'key': 'pdf:2'})
        records, _, summary = workset.build(data, [], [], [
            {'key': k, 'sourceSha256': 'abc'} for k in ['pdf:1', 'pdf:2']])
        self.assertEqual(len(records), 2)
        self.assertEqual(summary['uniqueEntities'], 1)
        self.assertEqual(summary['sharedEntities'][0]['referenceCount'], 2)

    def test_video_provider_identity_ignores_topic_and_start_time(self):
        self.assertEqual(workset.video_identity('https://youtu.be/abc?t=30'),
                         workset.video_identity('https://www.youtube.com/watch?v=abc'))
        self.assertNotEqual(workset.video_identity('https://example.org/abc'), 'youtube:abc')

    def test_video_catalog_entry_does_not_claim_remote_access(self):
        rows, _, _ = workset.build(self.fixture('VIDEO', 'video:one'), [], [
            {'key': 'video:one', 'url': 'https://youtu.be/abc'}], [])
        self.assertEqual(rows[0]['accessStatus'], 'REMOTE_NOT_CHECKED')

    def test_active_archive_and_note_examples_are_distinct(self):
        item = self.fixture()['items'][0]
        self.assertEqual(workset.resource_role(item), 'ACTIVE_QUESTION')
        item['studentVisible'] = False
        self.assertEqual(workset.resource_role(item), 'ARCHIVE_QUESTION')
        item['key'] = 'note-question:example'
        self.assertEqual(workset.resource_role(item), 'NOTE_EXAMPLE')

    def test_source_changed_decision_is_stale_and_prioritized(self):
        reviews = [{'item_key': 'question:q1', 'snapshot': {'automaticLabels': {'inputFingerprint': 'old'}}}]
        rows, queue, _ = workset.build(self.fixture(), [], [], [], reviews)
        self.assertEqual(rows[0]['reviewState'], 'STALE')
        self.assertEqual(queue[0]['priority'], 1)
        self.assertIn('APPROVAL_STALE', queue[0]['reasons'])

    def test_unknown_categories_are_rejected(self):
        data = self.fixture()
        data['categories'] = []
        with self.assertRaisesRegex(ValueError, 'Unknown category'):
            workset.build(data, [], [], [])

    def test_unknown_remote_access_is_not_reported_as_a_broken_source(self):
        item=self.fixture('VIDEO', 'video:limited')['items'][0]
        item['availability']='unverified'
        reasons=workset.missing_reasons(item,{'c1':{'topic':'Hareket'}})
        self.assertIn('SOURCE_ACCESS_UNVERIFIED',reasons)
        self.assertNotIn('SOURCE_UNAVAILABLE_OR_BROKEN',reasons)
        self.assertEqual(workset.priority(item,reasons),2)


if __name__ == '__main__':
    unittest.main()
