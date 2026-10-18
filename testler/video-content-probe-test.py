import importlib.util
from pathlib import Path
import unittest

spec=importlib.util.spec_from_file_location('video_content_probe',Path(__file__).resolve().parents[1]/'scripts/video-content-probe.py')
probe=importlib.util.module_from_spec(spec);spec.loader.exec_module(probe)


class VideoContentTest(unittest.TestCase):
    def test_empty_http_success_is_not_a_transcript(self):
        self.assertEqual(probe.timed_segments(b'','json3',120),[])

    def test_json_and_xml_keep_actual_timestamps_and_reject_out_of_bounds(self):
        raw=b'{"events":[{"tStartMs":30000,"dDurationMs":10000,"segs":[{"utf8":"Hareket"}]},{"tStartMs":119000,"dDurationMs":5000,"segs":[{"utf8":"bad"}]}]}'
        self.assertEqual(probe.timed_segments(raw,'json3',120),[dict(startSeconds=30,endSeconds=40,text='Hareket')])
        self.assertEqual(probe.timed_segments(b'<transcript><text start="30" dur="10">Hareket</text></transcript>','srv1',120),[dict(startSeconds=30,endSeconds=40,text='Hareket')])

    def test_playlist_duplicates_share_provider_identity(self):
        row={'playlistVideoRenderer':{'videoId':'abcdefghijk','title':{'runs':[{'text':'Ders'}]}}}
        entries=probe.playlist_entries({'contents':[row,row]})
        self.assertEqual(len(entries),1);self.assertEqual(entries[0]['providerId'],'youtube:abcdefghijk')


if __name__=='__main__':unittest.main()
