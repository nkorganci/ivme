import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from mebi_pratik2_konu_model_pilotu import validate


class TopicProposals(unittest.TestCase):
    def test_valid_category_and_exact_source_quote_remain_only_a_proposal(self):
        categories=[{'id':'excel.existing'}]
        category,status=validate({'choice':0,'uncertain':False,'quote':'native source text'},categories,'One native source text here')
        self.assertEqual(category,categories[0]);self.assertEqual(status,'AI_TOPIC_CANDIDATE_REQUIRES_REVIEW')

    def test_unknown_or_boolean_indexes_do_not_choose_a_category(self):
        for index in [-1,5,True,'0',None]:
            self.assertIsNone(validate({'choice':index,'uncertain':False,'quote':'native source text'},[{'id':'existing'}],'native source text')[0])

    def test_uncertain_output_or_invented_quote_does_not_pass_grounding(self):
        for unsure,quote in [(True,'native source text'),(False,'invented evidence'),(False,'a')]:
            self.assertIsNone(validate({'choice':0,'uncertain':unsure,'quote':quote},[{'id':'existing'}],'native source text')[0])


if __name__=='__main__':unittest.main()
