from pathlib import Path
import sys
import unittest
import pymupdf
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from yks_birlestirme import Store,read_json,digest
from yks_sayfa_esitligi import compare_page,OLD,NEW


class PageEquivalenceTest(unittest.TestCase):
    def test_identical_text_with_a_different_figure_is_not_reused(self):
        with pymupdf.open() as a,pymupdf.open() as b:
            left=a.new_page();right=b.new_page()
            for p in [left,right]:p.insert_text((40,100),'1. Same printed question and options.')
            right.draw_circle((100,150),30,color=(1,0,0))
            proof=compare_page(left,right);self.assertTrue(proof['nativeTextEqual'])
            self.assertNotEqual(proof['status'],'FULL_PAGE_NATIVE_AND_PIXELS_IDENTICAL')
            self.assertTrue(all(not p['equal'] for p in proof['pixels']))

    def test_full_native_and_pixels_are_required_at_both_resolutions(self):
        with pymupdf.open() as a,pymupdf.open() as b:
            for d in [a,b]:d.new_page().insert_text((40,100),'1. Identical source.')
            p=compare_page(a[0],b[0]);self.assertEqual(p['status'],'FULL_PAGE_NATIVE_AND_PIXELS_IDENTICAL')
            self.assertEqual([r['dpi'] for r in p['pixels']],[180,330])

    def test_actual_3adim_editions_reuse_281_pages_and_keep_both_revised_pages(self):
        s=Store(Path(__file__).resolve().parents[1]/'veri/yks-birlestirme');root=s.child(s.current()['runId'])
        p=read_json(root/'source-page-equivalence/3adim-turkce/progress.json')
        self.assertEqual(p['status'],'COMPLETE');self.assertEqual(digest(p['oldSourcePath']),OLD);self.assertEqual(digest(p['newSourcePath']),NEW)
        same=[r for r in p['results'] if r['status']=='FULL_PAGE_NATIVE_AND_PIXELS_IDENTICAL'];self.assertEqual(len(same),281)
        for row in same:self.assertTrue(row['nativeTextEqual']);self.assertTrue(all(v['oldRgbSha256']==v['newRgbSha256'] for v in row['pixels']))
        self.assertEqual([r['newPhysicalPage'] for r in p['results'] if r not in same],[30,280])
        self.assertEqual(p['questionBankWrites'],0)


if __name__=='__main__':unittest.main()
