import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
import mebi_pratik2_tek_tarama_ek as adapter
from mebi_pratik2_tek_tarama_konu import heading_category,source_subject
from mebi_pratik2_tek_test_baslik import printed_headings
import mebi_pratik2_sozcuk_kirpim as word_reader


class IndividualTarama(unittest.TestCase):
    def test_word_adapter_skips_existing_pdf_before_opening_original(self):
        with tempfile.TemporaryDirectory() as temporary:
            root=Path(temporary);source=root/'input';source.mkdir();out=root/'out'
            taxonomy=root/'backend/src/main/resources/content-taxonomy.json';taxonomy.parent.mkdir(parents=True)
            taxonomy.write_text('{"categories":[]}',encoding='utf8')
            (source/'old.json').write_text(json.dumps({'sourceSha256':'old','relativePath':'missing.pdf',
                'reviewQueueAdditions':[{'code':'q','bodyClip':[0,0,10,10],'keyImage':'missing.png'}]}),encoding='utf8')
            with patch.multiple(word_reader,APP=root,BASE=root,OUT=out),\
                 patch('mebi_pratik2_pdf_tekrar_kapisi.load_decisions',return_value={'old':{'decision':'SKIP_PDF_ALREADY_IN_EXISTING_PRACTICE'}}),\
                 patch.object(word_reader.pymupdf,'open') as opening:
                word_reader.run(directories=['input'],prepare=False);opening.assert_not_called()
            self.assertEqual(json.loads((out/'report.json').read_text())['preparedBodies'],0)

    def category(self,topic,subject='Matematik',exam='AYT'):
        return {'id':'excel.'+topic,'topic':topic,'subject':subject,'exam':exam,'selectable':True}

    def test_all_sequence_subheadings_fit_the_same_main_row(self):
        category=self.category('Gerçek Sayı Dizileri (diziler)')
        self.assertEqual(heading_category([{'text':'> Aritmetik Dizi ve Özellikleri > Geometrik Dizi ve Özellikleri'}],
                                         'AYT','Matematik',[category]),category)

    def test_mixed_modern_physics_never_gets_one_fine_topic(self):
        cats=[self.category('Özel Görelilik','Fizik'),self.category('Fotoelektrik Olay','Fizik')]
        self.assertIsNone(heading_category([{'text':'> Özel Görelilik > Fotoelektrik Olay'}],'AYT','Fizik',cats))

    def test_subject_directory_does_not_depend_on_opaque_filename(self):
        cats=[self.category('Dolaşım Sistemleri','Biyoloji')]
        self.assertEqual(source_subject('Deneme-Tarama\\Taramalar\\AYT\\Biyoloji (AYT)\\PDF\\opaque.pdf',cats,'AYT'),'Biyoloji')
        self.assertIsNone(source_subject('Deneme-Tarama\\Biyoloji (AYT)\\PDF\\opaque.pdf',cats,'TYT'))

    def test_stem_and_line_cut_at_first_question_cannot_label_the_topic(self):
        header={'text':'> Edebî Akımlar','bbox':[30,40,150,52]}
        native={'pages':[{'lines':[header,{'text':'> A misleading stem','bbox':[30,100,150,112]},
                                         {'text':'> A boundary fragment','bbox':[30,70,150,82]}]}]}
        self.assertEqual(printed_headings(native,[{'bodyPage':1,'bodyClip':[0,78,290,400]}]),[header])

    def test_explicit_subject_alias_keeps_existing_edebiyat_identity(self):
        category=self.category('Edebî Akımlar','Edebiyat')
        self.assertEqual(source_subject('AYT\\Türk Dili ve Edebiyatı (AYT)\\opaque.pdf',[category],'AYT'),'Edebiyat')

    def test_skip_old_pdf_before_cache_and_keep_ambiguous_topic_separate(self):
        with tempfile.TemporaryDirectory() as temporary:
            root=Path(temporary);base=root/'base';base.mkdir();out=base/'expansion';pending=base/'pending';crops=base/'crops'
            (root/'backend/src/main/resources').mkdir(parents=True)
            def write(path,data):path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(data),encoding='utf8')
            write(root/'backend/src/main/resources/content-taxonomy.json',{'categories':[{'id':'excel.ayt.test','exam':'AYT',
                'subject':'Biyoloji','subjectId':'biyoloji','topic':'Hücre','unit':'Hücre','selectable':True}]})
            docs=[{'sourceSha256':'old','relativePath':'Deneme-Tarama\\AYT\\old.pdf','cache':'must-not-read.json'},
                  {'sourceSha256':'new','relativePath':'Deneme-Tarama\\AYT\\Biyoloji.pdf','cache':'native.json'}]
            write(base/'full-pdf-coverage.json',{'documents':docs});write(base/'native.json',{'pages':[]})
            write(base/'remaining-positive-layout-cues/report.json',{'sources':docs})
            rows=[{'code':'bound','groupId':'g','exam':'AYT','subjectCandidates':['Biyoloji'],
                   'printedSourceHeadings':[{'text':'> Hücre'}]},
                  {'code':'mixed','groupId':'g','exam':'AYT','subjectCandidates':['Biyoloji'],
                   'printedSourceHeadings':[{'text':'> Hücre > Kalıtım'}]}]
            def capture(sources):
                self.assertEqual([s['sourceSha256'] for s in sources],['new'])
                write(crops/'new.json',{'items':rows,'keyGroups':[{'groupId':'g'}],'reviewQueueAdditions':[]})
            decisions={'old':{'decision':'SKIP_PDF_ALREADY_IN_EXISTING_PRACTICE'},'new':{'decision':'NEW_PDF_DOCUMENT_NOT_SEEN'}}
            with patch.multiple(adapter,APP=root,BASE=base,OUT=out,PENDING=pending,CROPS=crops),\
                 patch.object(adapter,'load_decisions',return_value=decisions),\
                 patch.object(adapter,'discover',return_value=([{'questions':[{}]}],[])),\
                 patch.object(adapter.capture,'run',side_effect=capture),patch.object(adapter.capture,'OUT',crops):
                adapter.run()
            self.assertEqual([r['code'] for r in json.loads((out/'chapter-packages.json').read_text())['items']],['bound'])
            unresolved=json.loads((pending/'chapter-packages.json').read_text())
            self.assertEqual([r['code'] for r in unresolved['items']],['mixed'])
            self.assertEqual(unresolved['questionWrites'],0)
            self.assertEqual(json.loads((out/'discovery-report.json').read_text())['counts']['existingPdfSkipped'],1)

    def test_resume_preserves_frozen_packages_without_reading_sources(self):
        with tempfile.TemporaryDirectory() as temporary:
            root=Path(temporary);out=root/'expansion';pending=root/'pending';out.mkdir();pending.mkdir()
            for p in (out,pending):(p/'chapter-packages.json').write_text('{"immutable":true}')
            with patch.multiple(adapter,OUT=out,PENDING=pending),patch.object(adapter,'load_decisions') as read:
                adapter.run();read.assert_not_called()
            self.assertEqual((out/'chapter-packages.json').read_text(),'{"immutable":true}')


if __name__=='__main__':unittest.main()
