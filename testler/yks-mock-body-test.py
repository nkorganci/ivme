from pathlib import Path
import sys
from types import SimpleNamespace
import unittest
import pymupdf
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from yks_deneme_govde import section_number,page_section,contexts
from yks_birlestirme import Store,read_json,digest
from yks_istisna_kirpim import verify_image


class MockBodyTest(unittest.TestCase):
    def test_printed_section_requires_whole_test_word(self):
        self.assertEqual(section_number('AYT • SOSYAL BİLİMLER-2 TESTİ','AYT'),2)
        self.assertEqual(section_number('AYT • SOSYAL BİLİMLER TESTİ-2','AYT'),2)
        self.assertEqual(section_number('AYT • TÜRK DİLİ VE EDEBİYATI-SOSYAL BİLİMLER-1 TESTİ','AYT'),1)
        self.assertIsNone(section_number('Sosyal Bilimler-2 Testine geçiniz.','AYT'))
        self.assertIsNone(section_number('MATEMATİK sorusu','AYT'))

    def test_next_test_instruction_does_not_override_current_footer(self):
        page=SimpleNamespace(rect=pymupdf.Rect(0,0,600,800))
        lines=[{'text':'AYT • MATEMATİK TESTİ','bbox':[300,750,550,760]},
            {'text':'Fen Bilimleri Testine geçiniz.','bbox':[40,760,240,770]}]
        self.assertEqual(page_section(page,lines,'AYT'),3)
        lines.append({'text':'AYT • FEN BİLİMLERİ TESTİ','bbox':[300,775,550,785]})
        with self.assertRaises(ValueError):page_section(page,lines,'AYT')

    def test_shared_source_context_stops_before_first_question(self):
        page=SimpleNamespace(rect=pymupdf.Rect(0,0,600,800),number=2)
        lines=[{'text':'35 - 36. soruları aşağıdaki parçaya göre cevaplayınız.','bbox':[40,90,270,104]},
            {'text':'Ortak özgün paragraf.','bbox':[40,110,270,140]}]
        regions=[{'number':35,'column':0,'bboxPt':[38,200,297,720],'anchor':{'contentTopPt':204}},
            {'number':36,'column':1,'bboxPt':[310,80,580,720]}]
        result=contexts(page,lines,regions)[0]
        self.assertEqual(result['dependentPrintedNumbers'],[35,36]);self.assertLess(result['bboxPt'][3],204)
        self.assertEqual(result['pdfPage'],3)

    def test_shared_range_missing_question_stays_review(self):
        page=SimpleNamespace(rect=pymupdf.Rect(0,0,600,800),number=0)
        lines=[{'text':'1 - 2. soruları parçaya göre cevaplayınız.','bbox':[40,90,270,104]}]
        with self.assertRaises(ValueError):contexts(page,lines,[{'number':1,'column':0,'bboxPt':[38,200,297,720],'anchor':{'contentTopPt':204}}])

    def test_all_41_actual_mock_bodies_keep_section_sequences_and_printed_keys(self):
        s=Store(Path(__file__).resolve().parents[1]/'veri/yks-birlestirme');root=s.child(s.current()['runId'])
        report=read_json(root/'full-mock-bodies/progress.json');keys={r['sourceSha256']:r for r in read_json(root/'pdf-on-tarama/full-mock-keys/progress.json')['results']}
        self.assertEqual(report['status'],'COMPLETE');self.assertEqual(report['questionsPrepared'],5863)
        accepted=[r for r in report['results'] if r['status']=='SECTION_BODY_SEQUENCE_AND_PIXELS_PREPARED'];self.assertEqual(len(accepted),41)
        codes=set()
        for row in accepted:
            self.assertFalse(row['issues']);self.assertTrue(all(p['matches'] for p in row['sequenceChecks']))
            self.assertFalse(row['administrativePagesContentAccepted']);self.assertEqual(digest(row['package']),row['packageSha256'])
            answers={p['sectionId']:{a['number']:a['answer'] for a in p['answers']} for p in keys[row['sourceSha256']]['sections']}
            for card in read_json(row['package'])['cards']:
                self.assertNotIn(card['code'],codes);codes.add(card['code']);self.assertEqual(card['answer'],answers[card['sectionId']][card['printedNumber']])
                self.assertEqual(digest(card['image']),card['imageSha256']);self.assertEqual(digest(card['pixelProof']['path']),card['pixelProof']['sha256'])
                stamp=read_json(card['pixelProof']['path']);self.assertEqual(stamp['imageSha256'],card['imageSha256']);self.assertTrue(stamp['pixelProof']['sourcePixelsPreserved'])
                self.assertEqual(card['importDecision'],'NOT_ACCEPTED_FOR_IMPORT');self.assertFalse(card['teacherApproved'])
        self.assertEqual(len(codes),5863)

    def test_actual_cross_page_context_and_upper_formula_glyphs_are_preserved(self):
        s=Store(Path(__file__).resolve().parents[1]/'veri/yks-birlestirme');root=s.child(s.current()['runId'])
        rows=read_json(root/'full-mock-bodies/progress.json')['results']
        wanted=[('cb3151aeef51','TYT:1',36),('4a305bc50abe','AYT:4',26),('dbb6f180a581','AYT:4',27),('e976640a57b4','TYT:1',35)]
        for prefix,section,number in wanted:
            row=next(r for r in rows if r['sourceSha256'].startswith(prefix));package=read_json(row['package'])
            card=next(c for c in package['cards'] if c['sectionId']==section and c['printedNumber']==number)
            with pymupdf.open(package['sourcePath']) as doc:verify_image(doc,card['sourceRegions'],card['image'])
            if prefix=='cb3151aeef51':self.assertEqual([r['pdfPage'] for r in card['sourceRegions']],[16,17])
            if prefix in ['4a305bc50abe','dbb6f180a581']:
                top=383.03753662109375 if prefix=='4a305bc50abe' else 413.3138427734375
                self.assertLess(card['bboxPt'][1],top)
                previous=next(c for c in package['cards'] if c['sectionId']==section and c['printedNumber']==number-1)
                self.assertLess(previous['bboxPt'][3],card['bboxPt'][1])


if __name__=='__main__':unittest.main()
