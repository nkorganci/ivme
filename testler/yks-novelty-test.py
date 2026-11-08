from pathlib import Path
import sys
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from yks_soru_yenilik_kontrol import same_content,parts


class WholeBankContentTest(unittest.TestCase):
    def setUp(self):
        self.source='1. Bu parça hangi düşünceyi destekler? A) Birinci B) İkinci C) Üçüncü D) Dördüncü E) Beşinci'

    def test_same_full_stem_and_option_permutation_retains_letter_mapping(self):
        changed=self.source.replace('B) İkinci','B) Beşinci').replace('E) Beşinci','E) İkinci')
        result=same_content(self.source,changed)
        self.assertFalse(result['sameOptionOrder'])
        self.assertEqual(result['letterMapping']['B'],'E')

    def test_negation_number_and_option_content_difference_are_not_exact_repeats(self):
        for changed in [self.source.replace('destekler','desteklemez'),self.source.replace('düşünceyi','2 düşünceyi'),
                self.source.replace('C) Üçüncü','C) Yeni seçenek')]:
            self.assertIsNone(same_content(self.source,changed))

    def test_broken_options_cannot_create_exact_reuse(self):
        self.assertIsNone(same_content(self.source,self.source.replace('D) Dördüncü','Dördüncü')))

    def test_source_line_hyphenation_can_normalize_but_mathematical_operator_cannot(self):
        split=self.source.replace('destekler','des-\ntekler')
        self.assertTrue(same_content(self.source,split)['sameOptionOrder'])
        self.assertIsNone(same_content(self.source,self.source.replace('düşünceyi','düşünceyi x²')))


if __name__=='__main__':unittest.main()
