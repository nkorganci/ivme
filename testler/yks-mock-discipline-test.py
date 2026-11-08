from pathlib import Path
import sys
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from yks_birlestirme import Store,read_json,digest
from yks_deneme_kapsam import printed_ranges


class MockDisciplineTest(unittest.TestCase):
    def test_printed_ranges_preserve_optional_questions_and_combined_philosophy_scope(self):
        text='Tarih-2 (1-11), Coğrafya-2 (12-22), Felsefe Grubu (23-34), Din Kültürü ve Ahlak Bilgisi (35-40), Felsefe Grubu (41-46)'
        ranges,members=printed_ranges(text,46)
        self.assertEqual(len(members),46);self.assertEqual(members[11]['allowedSubjectIds'],['tarih'])
        self.assertEqual(members[12]['allowedSubjectIds'],['cografya']);self.assertEqual(members[40]['allowedSubjectIds'],['din'])
        self.assertEqual(members[41]['allowedSubjectIds'],['felsefe','psikoloji','sosyoloji','mantik'])

    def test_missing_overlapping_or_non_source_ranges_never_get_a_fixed_exam_fallback(self):
        for text in ['Fizik (1-14), Kimya (15-27)', 'Fizik (1-14), Kimya (14-27), Biyoloji (28-40)',
            'Fizik (1-14), Kimya (15-27), Biyoloji (28-41)','Fen Bilimleri Testi 40 soru']:
            with self.assertRaises(ValueError):printed_ranges(text,40)

    def test_actual_mock_repeat_evidence_keeps_combined_subjects_unapproved(self):
        s=Store(Path(__file__).resolve().parents[1]/'veri/yks-birlestirme');root=s.child(s.current()['runId']);folder=root/'full-mock-comparison'
        scope=read_json(folder/'printed-section-scopes.json');review=read_json(folder/'controlled-repeat-review.json')
        self.assertEqual(review['questions'],5863);self.assertEqual(digest(folder/'printed-section-scopes.json'),review['printedSectionScopesSha256'])
        combined=0
        for card in scope['sourceCardScopes']:
            self.assertGreaterEqual(card['printedNumber'],card['printedRange']['first']);self.assertLessEqual(card['printedNumber'],card['printedRange']['last'])
            self.assertFalse(card['fineTopicAccepted']);self.assertFalse(card['teacherApproved'])
        for card in review['results']:
            self.assertFalse(card['importAccepted']);self.assertFalse(card['teacherApproved'])
            for match in card['exactTextCandidates']:
                if match.get('sourceSubjectIndependentlyAssigned') is False:
                    combined+=1;self.assertNotEqual(match['status'],'EXACT_TEXT_SOURCE_ANSWER_AND_CONTROLLED_SCOPE_AGREE')
        self.assertGreater(combined,0)


if __name__=='__main__':unittest.main()
