from pathlib import Path
import random
import sys
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from yks_gorsel_aday import VisualCandidates
from yks_tam_tekrar_tara import crop_scope


class VisualCandidatesTest(unittest.TestCase):
    def test_exact_file_normalized_and_full_64bit_hamming_candidates_equal_original_loop(self):
        randomizer=random.Random(128)
        rows=[{'code':str(i),'phash':f'{randomizer.getrandbits(64):016x}',
            'fileSha256':'file-'+str(i),'normalizedSha256':'normalized-'+str(i)} for i in range(1000)]
        rows.extend([{'code':'distance12','phash':f'{(1<<12)-1:016x}','fileSha256':'different','normalizedSha256':'different'},
            {'code':'distance13','phash':f'{(1<<13)-1:016x}','fileSha256':'different','normalizedSha256':'different'},
            {'code':'same-file','phash':'ffffffffffffffff','fileSha256':'expected-file','normalizedSha256':'different'},
            {'code':'same-normalized','phash':'ffffffffffffffff','fileSha256':'different','normalizedSha256':'expected-normalized'}])
        fp={'phash':'0000000000000000','fileSha256':'expected-file','normalizedSha256':'expected-normalized'}
        expected=[]
        for row in rows:
            distance=int(row['phash'],16).bit_count()
            exact=row['fileSha256']==fp['fileSha256'] or row['normalizedSha256']==fp['normalizedSha256']
            if exact or distance<=12:expected.append({'code':row['code'],'distance':distance,'exactImage':exact})
        expected.sort(key=lambda m:(not m['exactImage'],m['distance'],m['code']))
        actual=VisualCandidates(rows)(fp)
        self.assertEqual(actual,expected)
        self.assertNotIn('distance13',[r['code'] for r in actual])
        self.assertTrue(actual[0]['exactImage'])

    def test_empty_image_pool_and_identical_phash_do_not_claim_content_equivalence(self):
        fp={'phash':'ffffffffffffffff','fileSha256':'source','normalizedSha256':'source'}
        self.assertEqual(VisualCandidates([])(fp),[])
        row={'code':'other-content','phash':fp['phash'],'fileSha256':'different','normalizedSha256':'different'}
        self.assertEqual(VisualCandidates([row])(fp),[{'code':'other-content','distance':0,'exactImage':False}])

    def test_comparison_resume_binds_actual_source_packages_instead_of_pass_counters(self):
        report={'sourceKeyIdentity':'source-proofs','results':[{'sourceSha256':'pdf','packageSha256':'package'}],'newDocumentsThisPass':5}
        self.assertEqual(crop_scope(report),crop_scope({**report,'newDocumentsThisPass':0,'reusedDocumentsThisPass':5}))
        self.assertNotEqual(crop_scope(report),crop_scope({**report,'results':[{'sourceSha256':'pdf','packageSha256':'changed'}]}))


if __name__=='__main__':unittest.main()
