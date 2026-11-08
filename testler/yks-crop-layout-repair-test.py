from pathlib import Path
import sys
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from yks_kirpim_istisna import layout_regions,SHARED


def line(text,x,y,right=None,bottom=None):
    return {'text':text,'bbox':[x,y,right if right is not None else x+100,bottom if bottom is not None else y+12]}


class CropLayoutRepairTest(unittest.TestCase):
    def test_full_width_source_table_keeps_all_columns_in_the_question_region(self):
        rows=[line('1. Actual full width question',34,90,520),line('Column three',420,125,530),
            line('2. Next full width question',34,400,520)]
        regions,mode=layout_regions(rows,554,800)
        self.assertEqual(mode,'FULL_WIDTH_SOURCE_TEXT')
        self.assertEqual([r['number'] for r in regions],[1,2])
        self.assertGreater(regions[0]['bboxPt'][2],530)
        self.assertLess(regions[0]['bboxPt'][3],regions[1]['bboxPt'][1])

    def test_header_is_not_mistaken_for_full_width_question_and_regions_do_not_overlap(self):
        rows=[line('> Wave chapter',42,60,500,72),line('1. Question',34,90,250),
            line('2. Next question',34,400,250),line('3. Right question',286,90,525),
            line('4. Right next',286,400,525)]
        regions,mode=layout_regions(rows,554,800)
        self.assertEqual(mode,'COLUMN_SOURCE_EXTENTS')
        left=[r for r in regions if r['column']==0]
        self.assertLess(left[0]['bboxPt'][3],left[1]['bboxPt'][1])
        self.assertGreater(regions[-1]['bboxPt'][2],536)

    def test_verbal_shared_question_heading_cannot_be_silently_ignored(self):
        for value in ['4 ve 5. soruları aşağıdaki nüfus piramitlerine göre cevaplayınız.',
                '35–36. soruları aşağıdaki parçaya göre cevaplayınız.','35-36 soruları']:
            self.assertIsNotNone(SHARED.search(value))

    def test_full_width_table_followed_by_two_questions_keeps_the_right_question(self):
        rows=[line('1. Full width table',34,90,520),line('Table right data',420,125,530),
            line('2. Lower left question',34,300,250),line('3. Lower right question',286,300,525)]
        regions,mode=layout_regions(rows,554,800)
        self.assertEqual(mode,'FULL_WIDTH_PREFIX_THEN_TWO_COLUMNS')
        self.assertEqual([r['number'] for r in regions],[1,2,3])
        self.assertLess(regions[0]['bboxPt'][3],regions[1]['bboxPt'][1])


if __name__=='__main__':unittest.main()
