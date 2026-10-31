"""PDF kanit paketi (TAS-07): asama anahtarlari, yeniden uretmeme, butunluk ve siniflandirma.

Sentetik PDF'ler gecici dizinde uretilir; gercek kaynak arsivine, OCR onbellegine ve
`veri/pdf-kanit` dizinine dokunulmaz. Calistirma:
  ..\\.venv\\Scripts\\python.exe -X utf8 testler/pdf-kanit-test.py
"""
import contextlib
import hashlib
import io
import json
import os
import sys
import tempfile
import time
import unittest
from pathlib import Path
from unittest.mock import patch

import pymupdf

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
import pdf_kanit_paketi as kanit

HELV = 'helv'


def lines(spec):
    return [{'text': text, 'bbox': pymupdf.Rect(box), 'spans': [('Arial', 11, 0, text)]} for text, box in spec]


def make_pdf(path, build, pages=1):
    doc = pymupdf.open()
    for number in range(pages):
        build(doc.new_page(width=595, height=842), number)
    doc.save(path)
    doc.close()
    return Path(path)


def text(page, x, y, value, size=11):
    page.insert_text((x, y), value, fontsize=size, fontname=HELV)


def figure_page(page, number=0):
    text(page, 50, 60, 'Parabol grafigi', 20)
    text(page, 50, 100, 'Asagidaki sekilde y = x2 grafigi gosterilmistir.')
    text(page, 50, 130, 'f(x) = x² + 2x × 3 ± 1')
    page.draw_line((100, 360), (400, 360), width=1.5)
    page.draw_line((250, 180), (250, 380), width=1.5)
    page.draw_bezier((150, 200), (200, 380), (300, 380), (350, 200), width=1.5)
    text(page, 405, 364, 'x')
    text(page, 254, 176, 'y')
    text(page, 236, 374, '0')
    text(page, 150, 405, 'Figure 1: Parabol')
    text(page, 50, 700, 'Bu paragraf sekilden uzaktir ve govde metnidir.')


def table_page(page, number=0):
    text(page, 50, 60, 'Veri tablosu', 16)
    x0, y0 = 60, 120
    for row in range(3):
        for col in range(3):
            rect = pymupdf.Rect(x0 + col * 90, y0 + row * 30, x0 + (col + 1) * 90, y0 + (row + 1) * 30)
            page.draw_rect(rect, width=1)
            text(page, rect.x0 + 8, rect.y0 + 19, f'r{row}c{col}')


def columns_page(page, number=0):
    text(page, 50, 50, 'BASLIK ' * 13)
    for index, y in enumerate((120, 260, 400), 1):
        text(page, 50, y, f'Sol blok {index}')
        text(page, 330, y, f'Sag blok {index}')


def blank_and_scan_page(page, number):
    if number == 1:
        pixmap = pymupdf.Pixmap(pymupdf.csGRAY, pymupdf.IRect(0, 0, 300, 300), False)
        pixmap.clear_with(30)
        page.insert_image(pymupdf.Rect(100, 100, 400, 400), pixmap=pixmap)


class PackCase(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.dir = Path(self.tmp.name)
        self.out = self.dir / 'paketler'
        self.addCleanup(self.tmp.cleanup)
        patcher = patch.object(kanit, 'DECISIONS', self.dir / 'kararlar')
        patcher.start()
        self.addCleanup(patcher.stop)
        # Never read the real shared OCR cache for a synthetic source.
        shared = patch.object(kanit, 'shared_ocr', return_value=None)
        shared.start()
        self.addCleanup(shared.stop)

    def build(self, pdf, **kwargs):
        return kanit.build_pack(pdf, out=self.out, **kwargs)

    def pack(self, pdf):
        return kanit.pack_dir(kanit.file_sha256(pdf), self.out)

    def page(self, pdf, number):
        return kanit.read_json(self.pack(pdf) / 'sayfalar' / f'{number:04d}.json')


class LayoutTest(PackCase):
    def test_figure_labels_caption_crop_and_equation_candidate(self):
        pdf = make_pdf(self.dir / 'figure.pdf', figure_page)
        summary, stats = self.build(pdf)
        record = self.page(pdf, 1)
        layout = record['layout']
        self.assertEqual(summary['dispositions'], {'COMPLETE': 1})
        figures = layout['figures']
        self.assertEqual(len(figures), 1)
        figure = figures[0]
        self.assertGreaterEqual(figure['labelCount'], 3)
        self.assertEqual(figure['caption'], 'Figure 1: Parabol')
        self.assertEqual(figure['altText']['state'], 'CANDIDATE_UNREVIEWED')
        roles = {b['role'] for b in layout['blocks']}
        self.assertIn('caption', roles)
        self.assertIn('figureLabel', roles)
        crop = record['crops'][figure['id']]
        data = (self.pack(pdf) / crop['file']).read_bytes()
        self.assertEqual(hashlib.sha256(data).hexdigest(), crop['sha256'])
        pix = pymupdf.Pixmap(data)
        clip = crop['clipPt']
        self.assertAlmostEqual(pix.width, (clip[2] - clip[0]) * 2, delta=2)
        self.assertAlmostEqual(pix.height, (clip[3] - clip[1]) * 2, delta=2)
        x0, y0, x1, y1 = figure['bbox']
        self.assertTrue(0 <= x0 < x1 <= 595 and 0 <= y0 < y1 <= 842)
        math = [b for b in layout['blocks'] if b['containsMath']]
        self.assertTrue(any('x²' in b['text'] for b in math))
        for block in math:
            self.assertEqual(block['verification']['state'], 'UNVERIFIED')
        prose = [b for b in layout['blocks'] if 'paragraf' in b['text']][0]
        self.assertFalse(prose['containsMath'])
        self.assertIsNone(prose['verification'])
        self.assertEqual(record['disposition']['equations'], 'UNVERIFIED')
        self.assertEqual(record['disposition']['questions'], 'NOT_ASSESSED')
        self.assertTrue(kanit.verify_pack(self.pack(pdf))['ok'])
        self.assertEqual((stats['modelCalls'], stats['externalCalls']), (0, 0))

    def test_ruled_table_is_found_with_cells(self):
        pdf = make_pdf(self.dir / 'table.pdf', table_page)
        self.build(pdf)
        tables = self.page(pdf, 1)['layout']['tables']
        self.assertEqual(len(tables), 1)
        self.assertEqual((tables[0]['rows'], tables[0]['cols']), (3, 3))
        self.assertEqual(tables[0]['header'], ['r0c0', 'r0c1', 'r0c2'])
        inside = [b for b in self.page(pdf, 1)['layout']['blocks'] if b['tableId'] == tables[0]['id']]
        self.assertTrue(inside)

    def test_two_columns_read_left_then_right_under_a_full_width_heading(self):
        pdf = make_pdf(self.dir / 'columns.pdf', columns_page)
        self.build(pdf)
        blocks = sorted(self.page(pdf, 1)['layout']['blocks'], key=lambda b: b['order'])
        self.assertEqual([b['text'] for b in blocks][1:], ['Sol blok 1', 'Sol blok 2', 'Sol blok 3', 'Sag blok 1', 'Sag blok 2', 'Sag blok 3'])
        self.assertTrue(blocks[0]['text'].startswith('BASLIK'))

    def test_page_labels_keep_physical_index_apart(self):
        pdf = self.dir / 'labels.pdf'
        doc = pymupdf.open()
        for _ in range(3):
            text(doc.new_page(), 50, 80, 'Sayfa icerigi burada yer alir, yeterince uzun bir cumle.')
        doc.set_page_labels([{'startpage': 0, 'prefix': '', 'style': 'r', 'firstpagenum': 1},
                             {'startpage': 1, 'prefix': '', 'style': 'D', 'firstpagenum': 5}])
        doc.save(pdf)
        doc.close()
        self.build(pdf)
        self.assertEqual([(r['pageIndex'], r['printedLabel']) for r in (self.page(pdf, n) for n in (1, 2, 3))],
                         [(1, 'i'), (2, '5'), (3, '6')])

    def test_rotated_page_keeps_boxes_inside_the_rotated_space(self):
        pdf = make_pdf(self.dir / 'rot.pdf', lambda page, n: (figure_page(page), page.set_rotation(90)))
        self.build(pdf)
        record = self.page(pdf, 1)
        self.assertEqual((record['geometry']['rotation'], record['geometry']['widthPt'], record['geometry']['heightPt']), (90, 842.0, 595.0))
        self.assertTrue(kanit.verify_pack(self.pack(pdf))['ok'])
        with pymupdf.open(pdf) as source:
            page = source[0]
            for block in record['layout']['blocks']:
                if block['role'] == 'body' and 'paragraf' in block['text']:
                    unrotated = (pymupdf.Rect(block['bbox']) + (-1, -1, 1, 1)) * page.derotation_matrix
                    self.assertIn('paragraf', page.get_textbox(unrotated))
        for crop in record['crops'].values():
            pix = pymupdf.Pixmap((self.pack(pdf) / crop['file']).read_bytes())
            clip = crop['clipPt']
            self.assertAlmostEqual(pix.width, (clip[2] - clip[0]) * 2, delta=2)
            self.assertAlmostEqual(pix.height, (clip[3] - clip[1]) * 2, delta=2)
            self.assertLess(min(pix.samples), 100)

    def test_blank_page_is_certified_but_a_textless_image_page_is_not_blank(self):
        pdf = make_pdf(self.dir / 'scan.pdf', blank_and_scan_page, pages=2)
        summary, _ = self.build(pdf)
        blank, scan = self.page(pdf, 1)['disposition'], self.page(pdf, 2)['disposition']
        self.assertEqual(blank['overall'], 'TRULY_BLANK')
        self.assertLess(self.page(pdf, 1)['layout']['render']['inkRatio'], kanit.LAYOUT_PARAMS['blankInkRatio'])
        self.assertEqual((scan['overall'], scan['reasons']), ('PROBLEM', ['OCR_PENDING']))
        self.assertEqual(summary['ocrPendingPages'], [2])

    def test_short_text_page_is_not_a_problem_once_ocr_found_nothing_more(self):
        pdf = make_pdf(self.dir / 'divider.pdf', lambda page, n: text(page, 200, 400, 'TESTLER', 30))
        reference = {'extractorVersion': 'x', 'status': 'UNREADABLE_OR_BLANK', 'textSha256': 'a' * 64, 'modelSha256': 'b' * 64,
                     'hasLines': False, 'chars': 7, 'versions': ['x']}
        self.build(pdf)
        self.assertEqual(self.page(pdf, 1)['disposition']['reasons'], ['OCR_PENDING'])
        with patch.object(kanit, 'shared_ocr', return_value=reference), patch.object(kanit, 'ocr_model_sha', return_value='b' * 64):
            self.build(pdf, pages='1')
        disposition = self.page(pdf, 1)['disposition']
        self.assertEqual((disposition['overall'], disposition['notes']), ('COMPLETE', ['SHORT_TEXT_PAGE']))


class MathProfileTest(unittest.TestCase):
    def test_risks_and_classification(self):
        profile = kanit.math_profile(lines([('x - 3 − y – z = 0', (50, 50, 200, 62))]))
        self.assertIn('MINUS_VARIANTS', profile['risks'])
        self.assertEqual(kanit.classify_text(profile, kanit.LAYOUT_PARAMS), ('EQUATION', True))
        stacked = kanit.math_profile(lines([('a+1', (100, 50, 130, 60)), ('b', (110, 62, 120, 72))]))
        self.assertIn('STACKED_SHORT_LINES', stacked['risks'])
        prose = kanit.math_profile(lines([('Bu cumle yalnizca sozcuklerden olusur ve matematik icermez.', (50, 50, 400, 62))]))
        self.assertEqual(kanit.classify_text(prose, kanit.LAYOUT_PARAMS), ('TEXT', False))
        mixed = kanit.math_profile(lines([('x = 3 oldugunda ifade kac olur', (50, 50, 300, 62))]))
        self.assertEqual(kanit.classify_text(mixed, kanit.LAYOUT_PARAMS), ('TEXT', True))
        private = kanit.math_profile(lines([(f'a{chr(0xE001)}b', (50, 50, 90, 62))]))
        self.assertIn('PRIVATE_USE_GLYPH', private['risks'])

    def test_unreliable_text_layer(self):
        broken = kanit.text_quality('abc ' + kanit.REPLACEMENT * 5 + ' de', kanit.LAYOUT_PARAMS)
        self.assertTrue(broken['unreliable'])
        self.assertFalse(kanit.text_quality('Normal temiz metin burada.', kanit.LAYOUT_PARAMS)['unreliable'])

    def test_caption_prefixes(self):
        for value in ('Şekil 3. Grafik', 'Tablo 2', 'Grafik 10:', 'Figure 1'):
            self.assertTrue(kanit.CAPTION.match(value), value)
        self.assertFalse(kanit.CAPTION.match('Sekilsiz bir cumle'))


class StageKeyTest(PackCase):
    def test_second_run_rebuilds_nothing_and_page_files_are_byte_identical(self):
        pdf = make_pdf(self.dir / 'again.pdf', figure_page, pages=3)
        _, first = self.build(pdf)
        self.assertEqual((first['layoutBuilt'], first['cropsBuilt']), (3, 3))
        before = {p.name: p.read_bytes() for p in (self.pack(pdf) / 'sayfalar').glob('*.json')}
        _, skipped = self.build(pdf)
        self.assertEqual(skipped['skippedPack'], 1)
        _, paged = self.build(pdf, pages='1-3')
        self.assertEqual((paged['layoutBuilt'], paged['layoutReused'], paged['cropsBuilt'], paged['cropsReused']), (0, 3, 0, 3))
        self.assertEqual(before, {p.name: p.read_bytes() for p in (self.pack(pdf) / 'sayfalar').glob('*.json')})
        self.assertEqual((paged['modelCalls'], paged['externalCalls']), (0, 0))

    def test_crop_parameter_change_reruns_only_crops(self):
        pdf = make_pdf(self.dir / 'dpi.pdf', figure_page, pages=2)
        self.build(pdf)
        with patch.dict(kanit.CROP_PARAMS, {'dpi': 96}):
            _, stats = self.build(pdf)
            self.assertEqual((stats['layoutBuilt'], stats['layoutReused'], stats['cropsBuilt']), (0, 2, 2))
            record = self.page(pdf, 1)
            self.assertEqual(list(record['crops'].values())[0]['dpi'], 96)
            self.assertTrue(kanit.verify_pack(self.pack(pdf))['ok'])

    def test_layout_parameter_change_reruns_layout_and_dependent_crops(self):
        pdf = make_pdf(self.dir / 'param.pdf', figure_page)
        self.build(pdf)
        with patch.dict(kanit.LAYOUT_PARAMS, {'equationScore': 0.9}):
            _, stats = self.build(pdf)
        self.assertEqual((stats['layoutBuilt'], stats['layoutReused']), (1, 0))
        self.assertEqual(stats['cropsBuilt'] + stats['cropsReused'], 1)

    def test_changed_source_gets_its_own_pack_and_the_old_one_is_untouched(self):
        first = make_pdf(self.dir / 'v1.pdf', figure_page, pages=1)
        second = make_pdf(self.dir / 'v2.pdf', figure_page, pages=2)
        a, _ = self.build(first)
        before = (self.pack(first) / 'ozet.json').read_bytes()
        b, _ = self.build(second)
        self.assertNotEqual(a['sourceSha256'], b['sourceSha256'])
        self.assertNotEqual(a['packSha256'], b['packSha256'])
        self.assertEqual(before, (self.pack(first) / 'ozet.json').read_bytes())

    def test_layout_key_changes_with_every_declared_input(self):
        base = kanit.layout_key('a' * 64, 1, 'd')
        self.assertNotEqual(base, kanit.layout_key('b' * 64, 1, 'd'))
        self.assertNotEqual(base, kanit.layout_key('a' * 64, 2, 'd'))
        self.assertNotEqual(base, kanit.layout_key('a' * 64, 1, 'e'))
        self.assertEqual(base, kanit.layout_key('a' * 64, 1, 'd'))
        with patch.object(kanit, 'LAYOUT_VERSION', 'kanit-layout-v2'):
            self.assertNotEqual(base, kanit.layout_key('a' * 64, 1, 'd'))
        with patch.object(kanit, 'TOOL', 'pymupdf-0.0'):
            self.assertNotEqual(base, kanit.layout_key('a' * 64, 1, 'd'))


class IntegrityTest(PackCase):
    def test_tampered_page_is_reported_and_only_that_page_is_repaired(self):
        pdf = make_pdf(self.dir / 'tamper.pdf', figure_page, pages=3)
        self.build(pdf)
        target = self.pack(pdf) / 'sayfalar' / '0002.json'
        record = json.loads(target.read_text(encoding='utf-8'))
        record['layout']['blocks'][0]['text'] = 'degistirildi'
        target.write_text(json.dumps(record), encoding='utf-8')
        report = kanit.verify_pack(self.pack(pdf))
        self.assertFalse(report['ok'])
        self.assertTrue(any('0002.json' in p for p in report['problems']))
        _, stats = self.build(pdf, pages='1-3')
        self.assertEqual((stats['layoutBuilt'], stats['layoutReused'], stats['repaired']), (1, 2, 1))
        self.assertTrue(kanit.verify_pack(self.pack(pdf))['ok'])

    def test_missing_or_corrupt_crop_is_detected_and_rewritten(self):
        pdf = make_pdf(self.dir / 'crop.pdf', figure_page)
        self.build(pdf)
        crop = next((self.pack(pdf) / 'gorseller').glob('*.png'))
        original = crop.read_bytes()
        crop.write_bytes(b'bozuk')
        self.assertFalse(kanit.verify_pack(self.pack(pdf))['ok'])
        _, stats = self.build(pdf, pages='1')
        self.assertEqual((stats['cropsBuilt'], stats['layoutReused']), (1, 1))
        self.assertEqual(crop.read_bytes(), original)

    def test_half_written_page_file_counts_as_missing(self):
        pdf = make_pdf(self.dir / 'half.pdf', figure_page)
        self.build(pdf)
        (self.pack(pdf) / 'sayfalar' / '0001.json').write_text('{"schema": "ivme.pdf-kanit/v1.sayfa", "layou', encoding='utf-8')
        _, stats = self.build(pdf, pages='1')
        self.assertEqual((stats['layoutBuilt'], stats['layoutReused']), (1, 0))
        self.assertTrue(kanit.verify_pack(self.pack(pdf))['ok'])

    def test_leftover_temporary_file_is_reported(self):
        pdf = make_pdf(self.dir / 'tmp.pdf', figure_page)
        self.build(pdf)
        (self.pack(pdf) / 'sayfalar' / '0001.json.tmp.99').write_text('x', encoding='utf-8')
        self.assertFalse(kanit.verify_pack(self.pack(pdf))['ok'])

    def test_lock_blocks_a_second_owner_and_stale_lock_is_taken_over(self):
        pdf = make_pdf(self.dir / 'lock.pdf', figure_page)
        directory = self.pack(pdf)
        directory.mkdir(parents=True)
        (directory / '.kilit').write_text('1', encoding='utf-8')
        with self.assertRaises(kanit.PackBusy):
            self.build(pdf)
        old = time.time() - kanit.LOCK_STALE_SECONDS - 60
        os.utime(directory / '.kilit', (old, old))
        summary, _ = self.build(pdf)
        self.assertTrue(summary['complete'])
        self.assertFalse((directory / '.kilit').exists())

    def test_wrong_pdf_bytes_fail_verification(self):
        pdf = make_pdf(self.dir / 'bytes.pdf', figure_page)
        other = make_pdf(self.dir / 'other.pdf', figure_page, pages=2)
        self.build(pdf)
        self.assertTrue(kanit.verify_pack(self.pack(pdf), pdf)['ok'])
        self.assertFalse(kanit.verify_pack(self.pack(pdf), other)['ok'])


class OcrAndDecisionTest(PackCase):
    def scan(self):
        return make_pdf(self.dir / 'scan2.pdf', blank_and_scan_page, pages=2)

    def test_existing_shared_ocr_is_reused_and_nothing_is_run(self):
        pdf = self.scan()
        reference = {'extractorVersion': 'tur-ocr-144dpi-v1', 'status': 'EXTRACTED', 'textSha256': 'a' * 64, 'modelSha256': 'b' * 64,
                     'hasLines': False, 'chars': 400, 'versions': ['tur-ocr-144dpi-v1']}
        with patch.object(kanit, 'shared_ocr', return_value=reference), patch.object(kanit, 'ocr_model_sha', return_value='b' * 64), \
                patch.object(kanit, 'build_ocr_lines', side_effect=AssertionError('OCR must not run')):
            _, stats = self.build(pdf, ocr=True)
        record = self.page(pdf, 2)
        self.assertEqual(record['disposition']['overall'], 'COMPLETE')
        self.assertEqual(record['ocr']['reference']['textSha256'], 'a' * 64)
        self.assertEqual((stats['ocrBuilt'], stats['ocrReused'], stats['modelCalls']), (0, 1, 0))

    def test_line_ocr_runs_once_per_input_then_is_reused(self):
        pdf = self.scan()
        fake = {'status': 'EXTRACTED', 'text': 'Okunan metin', 'textSha256': 'c' * 64, 'elapsedSeconds': 0.1, 'figures': [],
                'blocks': [{'id': 'ocr-1', 'kind': 'TEXT', 'role': 'body', 'source': 'OCR', 'bbox': [100, 100, 200, 120], 'lines': 1,
                            'text': 'Okunan metin', 'textSha256': 'c' * 64, 'fonts': [], 'tableId': None, 'containsMath': False,
                            'mathScore': 0.0, 'mathRisks': [], 'verification': None, 'order': 0}]}
        with patch.object(kanit, 'ocr_model_sha', return_value='m' * 64), patch.object(kanit, 'build_ocr_lines', return_value=fake) as run:
            _, first = self.build(pdf, ocr=True)
            _, again = self.build(pdf, pages='2', ocr=True)
            self.assertEqual(run.call_count, 1)
        self.assertEqual((first['ocrBuilt'], again['ocrBuilt'], again['ocrReused']), (1, 0, 1))
        self.assertEqual(self.page(pdf, 2)['disposition']['overall'], 'COMPLETE')
        view = kanit.page_view(self.page(pdf, 2))
        self.assertEqual([b['source'] for b in view['blocks']], ['OCR'])
        with patch.object(kanit, 'ocr_model_sha', return_value='n' * 64), patch.object(kanit, 'build_ocr_lines', return_value=fake) as run:
            self.build(pdf, pages='2', ocr=True)
            self.assertEqual(run.call_count, 1)

    @unittest.skipUnless((kanit.TESSDATA / 'tur.traineddata').is_file(), 'tur.traineddata yok')
    def test_real_ocr_produces_lines_with_boxes_inside_the_page(self):
        source = pymupdf.open()
        text(source.new_page(width=595, height=842), 72, 120, 'Merhaba dunya bu bir deneme sayfasidir ve okunabilir.', 18)
        pix = source[0].get_pixmap(dpi=150)
        scan = pymupdf.open()
        page = scan.new_page(width=595, height=842)
        page.insert_image(page.rect, pixmap=pix)
        pdf = self.dir / 'realscan.pdf'
        scan.save(pdf)
        self.build(pdf, ocr_lines=True)
        record = self.page(pdf, 1)
        lines_ = record['ocr']['lines']
        self.assertEqual(lines_['status'], 'EXTRACTED')
        self.assertTrue(any('deneme' in b['text'].lower() for b in lines_['blocks']))
        self.assertTrue(kanit.verify_pack(self.pack(pdf))['ok'])
        self.assertEqual(record['disposition']['text'], 'COMPLETE')

    def test_human_decision_is_bound_to_the_page_render(self):
        pdf = make_pdf(self.dir / 'decide.pdf', figure_page)
        self.build(pdf)
        sha = kanit.file_sha256(pdf)
        render = self.page(pdf, 1)['layout']['render']['sha256']
        kanit.save_decision(sha, 1, 'OUT_OF_SCOPE', 'inceleyen', 'Kapak sayfasi', render)
        self.build(pdf, pages='1')
        applied = self.page(pdf, 1)['disposition']
        self.assertEqual((applied['overall'], applied['decision']['applied']), ('OUT_OF_SCOPE', True))
        kanit.save_decision(sha, 1, 'OUT_OF_SCOPE', 'inceleyen', 'Eski goruntu', 'f' * 64)
        self.build(pdf, pages='1')
        stale = self.page(pdf, 1)['disposition']
        self.assertEqual((stale['overall'], stale['decision']['applied'], stale['decision']['reason']), ('COMPLETE', False, 'STALE_RENDER_HASH'))
        with self.assertRaises(ValueError):
            kanit.save_decision(sha, 1, 'VERIFIED', 'x', 'y', render)


class CommandLineTest(PackCase):
    def run_cli(self, *argv):
        buffer = io.StringIO()
        with patch.object(kanit, 'OUT', self.out), contextlib.redirect_stdout(buffer), \
                patch.object(sys.stdout, 'reconfigure', create=True, new=lambda **kw: None):
            try:
                kanit.main(list(argv))
                code = 0
            except SystemExit as stop:
                code = stop.code or 0
        return code, buffer.getvalue()

    def test_create_verify_show_and_summary(self):
        pdf = make_pdf(self.dir / 'cli.pdf', figure_page, pages=2)
        with patch.object(kanit, 'build_pack', side_effect=lambda *a, **k: kanit.build_pack.__wrapped__(*a, out=self.out, **k)) \
                if hasattr(kanit.build_pack, '__wrapped__') else contextlib.nullcontext():
            pass
        self.build(pdf)
        sha = kanit.file_sha256(pdf)
        code, output = self.run_cli('dogrula', sha[:10])
        self.assertEqual(code, 0)
        self.assertTrue(json.loads(output)['ok'])
        code, output = self.run_cli('goster', str(pdf), '--sayfa', '1')
        shown = json.loads(output)
        self.assertEqual((shown['pageIndex'], len(shown['figures'])), (1, 1))
        self.assertIsNotNone(shown['figures'][0]['crop'])
        code, output = self.run_cli('ozet', sha)
        self.assertEqual(json.loads(output)['pagesInPack'], 2)
        code, _ = self.run_cli('goster', sha, '--sayfa', '9')
        self.assertNotEqual(code, 0)


if __name__ == '__main__':
    unittest.main()
