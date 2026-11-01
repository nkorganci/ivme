"""TAS-11: gerçek küçük medyayla önbellek/kanıt, bozuk kaynak ve onay sınırı.

Geçici dizin; ağ/model/öğrenci DB'si kullanılmaz. ffmpeg bulunan ortamda
gerçek decode ve aynı kareyi tek dosyada tutma da doğrulanır.
"""
import copy
import importlib.util
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
import video_hatti as h


class VideoPipelineTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='ivme-video-test-')
        self.root = Path(self.temp.name)
        self.state = self.root / 'state'
        self.patches = [patch.object(h, 'STATE', self.state)]
        for p in self.patches:
            p.start()
        self.task = {'schema': h.VERSION, 'id': 'test-pilot', 'topicId': 'tyt.matematik.temel-kavramlar',
                     'sources': [dict(providerId='youtube:abcdefghijk', durationSeconds=3,
                                      usage=dict(status='USER_SUPPLIED', note='Test girdisi'))]}
        self.source = self.task['sources'][0]

    def tearDown(self):
        for p in self.patches:
            p.stop()
        self.temp.cleanup()

    def write(self, name, content):
        p = self.root / name
        p.write_text(content, encoding='utf-8')
        return str(p)

    def transcript(self, text='Sıfır çift sayıdır.'):
        self.source['transcript'] = self.write('captions.vtt', f'WEBVTT\n\n00:00.000 --> 00:02.000\n{text}\n')

    def run_pipeline(self):
        with patch.object(h.Pipeline, 'access', return_value={'status': 'LOCAL_TEST'}):
            return h.Pipeline(self.task).run()

    def test_vtt_and_srt_preserve_actual_timestamps(self):
        for ext, stamp in [('vtt', '00:01.250'), ('srt', '00:00:01,250')]:
            path = self.write('a.' + ext, f'1\n{stamp} --> 00:00:02.500\n<b>Çift</b> &amp; tek\n')
            rows = h.subtitles(path, 3)
            self.assertEqual(rows[0], dict(startSeconds=1.25, endSeconds=2.5, text='Çift & tek'))

    def test_empty_and_invalid_subtitles_never_pass(self):
        for text in ['', 'WEBVTT\n\n00:00.000 --> 00:04.000\ntaşma', 'WEBVTT\n\nzamanı yok']:
            with self.assertRaises(ValueError):
                h.subtitles(self.write('bad.vtt', text), 3)

    def test_nan_infinity_negative_and_reverse_ranges_rejected(self):
        for start, end in [(float('nan'), 2), (0, float('inf')), (-1, 2), (2, 1), (True, 2)]:
            with self.assertRaises(ValueError):
                h.validate_segments([dict(startSeconds=start, endSeconds=end, text='x')], 3)

    def test_json3_control_and_final_overrun_are_recorded(self):
        data = {'events': [dict(tStartMs=0, dDurationMs=4000, segs=[{'utf8': 'Sıfır çift.'}]),
                           dict(tStartMs=1000, dDurationMs=1000, segs=[{'utf8': '\n'}])]}
        normalization = {}
        rows = h.subtitles(self.write('a.json', json.dumps(data)), 3, normalization)
        self.assertEqual(rows[0]['endSeconds'], 3)
        self.assertEqual(normalization['endClippedCues'], 1)
        self.assertEqual(normalization['captionControlEvents'], 1)
        data['events'][0]['dDurationMs'] = 7000
        with self.assertRaises(ValueError):
            h.subtitles(self.write('bad.json', json.dumps(data)), 3)

    def test_failure_is_reused_without_a_network_probe(self):
        cached = {'status': 'MANUAL_REVIEW_REQUIRED', 'reason': 'EMPTY_CAPTIONS'}
        runner = h.Pipeline(self.task, network=True)
        with patch.object(h.Path, 'exists', return_value=True), patch.object(h, 'load', return_value=cached), \
             patch.object(h, 'module') as modules:
            modules.return_value.VERSION = 'v3'
            result = runner.access('youtube:abcdefghijk')
            self.assertEqual(result, cached)
            modules.return_value.probe.assert_not_called()

    def test_same_inputs_reuse_all_stages_and_evidence(self):
        self.transcript()
        first = self.run_pipeline()
        second = self.run_pipeline()
        self.assertEqual(first['evidenceHash'], second['evidenceHash'])
        self.assertEqual(second['metrics']['stagesBuilt'], 0)
        self.assertEqual(second['metrics']['stagesReused'], 2)
        self.assertEqual(second['metrics']['networkRequests'], 0)
        self.assertEqual(second['metrics']['modelCalls'], 0)
        self.assertEqual(second['metrics']['frameDecodes'], 0)
        self.assertEqual(h.check(self.task)['integrity'], 'PASS')

    def test_changed_subtitles_invalidate_only_text_and_dependent_frames(self):
        self.transcript()
        first = self.run_pipeline()
        self.transcript('Negatif çift sayılar da vardır.')
        with self.assertRaisesRegex(ValueError, 'Yerel'):
            h.check(self.task)
        second = self.run_pipeline()
        self.assertNotEqual(first['evidenceHash'], second['evidenceHash'])
        self.assertTrue((self.state / self.task['id'] / 'surumler' / (first['evidenceHash'] + '.json')).exists())

    def test_tampered_checkpoint_is_rebuilt(self):
        self.transcript()
        self.run_pipeline()
        path = next((self.state / self.task['id'] / 'asamalar').rglob('*.json'))
        row = h.load(path)
        row['output']['status'] = 'FORGED'
        h.write_json(path, row)
        self.assertEqual(self.run_pipeline()['metrics']['stagesBuilt'], 1)

    def test_unknown_topic_and_duplicate_source_rejected(self):
        for mutation in ('topic', 'duplicate'):
            task = copy.deepcopy(self.task)
            if mutation == 'topic':
                task['topicId'] = 'invented'
            else:
                task['sources'].append(copy.deepcopy(self.source))
            with self.assertRaises(ValueError):
                h.validate_task(task)

    def test_media_requires_processing_declaration(self):
        self.source['media'] = 'x.mp4'
        with self.assertRaisesRegex(ValueError, 'PROCESSING_ALLOWED'):
            h.validate_task(self.task)

    def test_live_lock_refused_and_dead_owner_recovered(self):
        with h.lock():
            with self.assertRaises(ValueError):
                with h.lock():
                    self.fail('aynı anda ikinci sahip')
        self.state.mkdir(exist_ok=True)
        (self.state / '.kilit').write_text('999999999', encoding='ascii')
        with h.lock():
            self.assertTrue((self.state / '.kilit').exists())
        self.assertFalse((self.state / '.kilit').exists())

    def hint_source(self):
        return [dict(providerId='youtube:abcdefghijk', usage=self.source['usage'],
                     text=dict(status='TIMED_TEXT_READY', durationSeconds=3,
                               segments=[dict(startSeconds=0, endSeconds=2, text='Sıfır çift sayıdır.')]),
                     frames=dict(frames=[dict(seconds=1, sha256='abc', file='a.png')]))]

    def candidate(self):
        candidate = dict(id='zero', providerId='youtube:abcdefghijk', startSeconds=0, endSeconds=2,
                         quote='Sıfır çift sayıdır.', frameSeconds=[1], rule='0 çifttir.', condition='Tam sayılar.',
                         example='0=2·0', counterexample='1 tek.', rationale='Çiftin tanımı 2k.', teacherApproved=True)
        return candidate

    def test_source_quote_and_in_range_frame_required(self):
        for field, value in [('quote', 'uydurma'), ('frameSeconds', [2.5]), ('endSeconds', 9)]:
            candidate = self.candidate()
            candidate[field] = value
            self.task['hints'] = self.write('hints.json', json.dumps([candidate]))
            with self.assertRaises(ValueError):
                h.Pipeline(self.task).hints(self.hint_source())

    def test_input_cannot_forge_teacher_approval(self):
        self.task['hints'] = self.write('hints.json', json.dumps([self.candidate()]))
        row = h.Pipeline(self.task).hints(self.hint_source())[0]
        self.assertFalse(row['teacherApproved'])
        self.assertEqual(row['reviewStatus'], 'PENDING')
        self.assertEqual(row['questionCompleteness'], 'UNREVIEWED')

    @unittest.skipUnless(shutil.which('ffmpeg') and shutil.which('ffprobe'), 'ffmpeg/ffprobe yok')
    def test_actual_video_frames_deduplicate_and_resume_and_repair(self):
        media = self.root / 'test.mp4'
        subprocess.run([shutil.which('ffmpeg'), '-v', 'error', '-f', 'lavfi', '-i', 'color=c=black:s=160x90:r=2:d=3',
                        '-c:v', 'libx264', '-y', str(media)], check=True, capture_output=True)
        self.transcript()
        self.source.update(media=str(media), frameSeconds=[0.5, 1.5], usage=dict(status='PROCESSING_ALLOWED', note='Üretilmiş test videosu'))
        first = self.run_pipeline()
        evidence = h.load(self.state / self.task['id'] / 'surumler' / (first['evidenceHash'] + '.json'))
        frames = evidence['sources'][0]['frames']
        self.assertEqual(len(frames['frames']), 2)
        self.assertEqual(frames['uniqueFiles'], 1)
        self.assertEqual(first['metrics']['frameDecodes'], 2)
        self.assertEqual(self.run_pipeline()['metrics']['frameDecodes'], 0)
        path = self.state / self.task['id'] / frames['frames'][0]['file']
        path.write_bytes(b'broken')
        with self.assertRaises(ValueError):
            h.check(self.task)
        self.assertEqual(self.run_pipeline()['metrics']['frameDecodes'], 2)
        self.assertEqual(h.check(self.task)['integrity'], 'PASS')
        self.source['frameSeconds'] = [3]
        with self.assertRaisesRegex(ValueError, 'Kare zamanı'):
            self.run_pipeline()


if __name__ == '__main__':
    unittest.main()
