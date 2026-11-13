"""Fast PDF equivalence keeps page count/symbols and never reads question rows."""
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import hashlib
import pymupdf
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from mebi_pratik2_pdf_tekrar_kapisi import signature,skip_pdf,preview,load_policy
import mebi_pratik2_kesin_piksel_tekrari as pixel


class PdfReuse(unittest.TestCase):
    def test_already_imported_pdf_is_skipped_before_any_image_or_model_read(self):
        import mebi_pratik2_arsiv_kabul as admission
        with tempfile.TemporaryDirectory() as tmp:
            base=Path(tmp);out=base/'new-package';out.mkdir()
            (out/'chapter-packages.json').write_text(json.dumps({'items':[{'code':'source-q1','sourceSha256':'a'*64}],
                'keyGroups':[]}),encoding='utf8')
            calibration=base/'expanded-chapter-evidence/negative-calibration-v2';calibration.mkdir(parents=True)
            (calibration/'report.json').write_text(json.dumps({'status':'PASS'}),encoding='utf8')
            from unittest.mock import MagicMock
            model=MagicMock()
            with patch.object(admission,'BASE',base),patch.object(admission,'OUT',out),patch.object(admission,'vision',return_value=model),\
                 patch.object(admission,'current_decisions',return_value={'a'*64:{'decision':'SKIP_PDF_ALREADY_IN_EXISTING_PRACTICE'}}),\
                 patch.object(admission.pymupdf,'open') as images:
                admission.run(chunk_size=1)
                images.assert_not_called();model.ask.assert_not_called()
            result=json.loads((out/'pass-result.json').read_text(encoding='utf8'))
            self.assertEqual(result['sourcePdfSkippedCandidates'],1);self.assertEqual(result['acceptedSourceCandidates'],0)
    def test_pdf_only_policy_is_permanent_without_a_session_override(self):
        with tempfile.TemporaryDirectory() as tmp:
            self.assertTrue(load_policy(Path(tmp))['enabled'])
            self.assertEqual(load_policy(Path(tmp))['mode'],'PDF_LEVEL_ONLY')
    def pages(self):return [{'page':i,'width':552.7,'height':779.5,'text':('Book chapter '+str(i)+' 2 + 2 = 4 '*15)} for i in range(1,4)]
    def test_different_file_names_and_metadata_do_not_enter_the_content_signature(self):
        a=self.pages();b=self.pages();b[0]['text']='\n'+b[0]['text'].replace(' ','  ')+'\n'
        self.assertEqual(signature(100,a),signature(100,b))
    def test_different_page_count_is_not_the_same_pdf(self):
        self.assertNotEqual(signature(100,self.pages()),signature(101,self.pages()))
    def test_different_pdf_text_object_order_can_find_a_preview_candidate(self):
        a=self.pages();b=self.pages();b[0]['text']=' '.join(reversed(b[0]['text'].split()))
        self.assertNotEqual(signature(100,a),signature(100,b))
        self.assertEqual(signature(100,a,ignore_text_order=True),signature(100,b,ignore_text_order=True))
    def test_mathematical_symbols_are_not_stripped_away(self):
        a=self.pages();b=self.pages();b[0]['text']=b[0]['text'].replace('+','-')
        self.assertNotEqual(signature(100,a),signature(100,b))
    def test_empty_covers_do_not_identify_a_pdf(self):
        p=self.pages()
        for row in p:row['text']=''
        self.assertIsNone(signature(100,p))
        for row in p:row['text']='CEVAP ANAHTARI'
        self.assertIsNone(signature(100,p,ignore_text_order=True))
    def test_pdf_policy_skip_is_document_level_and_unknown_sources_are_blocked(self):
        self.assertTrue(skip_pdf('old',{'old':{'decision':'SKIP_PDF_ALREADY_IN_EXISTING_PRACTICE'}}))
        self.assertFalse(skip_pdf('new',{'new':{'decision':'NEW_PDF_DOCUMENT_NOT_SEEN'}}))
        with self.assertRaises(ValueError):skip_pdf('missing',{'old':{'decision':'SKIP'}})
    def test_pdf_policy_never_queries_or_compares_individual_question_images(self):
        with tempfile.TemporaryDirectory() as tmp:
            base=Path(tmp);(base/'pdf-reuse-policy.json').write_text(json.dumps({'mode':'PDF_LEVEL_ONLY'}),encoding='utf8')
            rows=[{'code':'new-source-q1'}]
            with patch.object(pixel,'BASE',base),patch.object(pixel,'db_connection') as db,patch.object(pixel,'fingerprint') as compare:
                self.assertEqual(pixel.select_new(rows,base),rows);db.assert_not_called();compare.assert_not_called()
    def test_changed_pdf_metadata_keeps_page_previews_identical(self):
        with tempfile.TemporaryDirectory() as tmp:
            first=Path(tmp)/'first.pdf';second=Path(tmp)/'renamed.pdf'
            with pymupdf.open() as doc:
                doc.new_page().insert_text((40,50),'Same printed document information.')
                doc.save(first);doc.set_metadata({'title':'Different file metadata'});doc.save(second)
            self.assertNotEqual(hashlib.sha256(first.read_bytes()).hexdigest(),hashlib.sha256(second.read_bytes()).hexdigest())
            with pymupdf.open(first) as a,pymupdf.open(second) as b:
                self.assertEqual(len(a),len(b));self.assertEqual(preview(a),preview(b))
    def test_different_diagrams_do_not_match_just_because_text_matches(self):
        with pymupdf.open() as a,pymupdf.open() as b:
            x=a.new_page();y=b.new_page()
            for p in (x,y):p.insert_text((40,50),'Identical heading')
            x.draw_rect((50,100,150,200));y.draw_circle((100,150),50)
            self.assertNotEqual(preview(a),preview(b))


if __name__=='__main__':unittest.main()
