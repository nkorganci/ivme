import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch
from urllib.error import HTTPError

spec=importlib.util.spec_from_file_location('video_inventory',Path(__file__).resolve().parents[1]/'scripts/video-source-inventory.py')
video=importlib.util.module_from_spec(spec);spec.loader.exec_module(video)


class VideoInventoryTest(unittest.TestCase):
    def test_same_video_different_topic_time_playlist_keeps_provider_identity(self):
        self.assertEqual(video.provider_id('https://youtu.be/abcdefghijk?t=70&list=list-id'),
                         video.provider_id('https://www.youtube.com/watch?v=abcdefghijk'))
        self.assertEqual(video.provider_id('https://www.youtube.com/playlist?list=list-id'),'youtube-playlist:list-id')
        self.assertIsNone(video.provider_id('https://unrelated.example/watch?v=abcdefghijk'))

    def test_chapter_bounds_and_malformed_times(self):
        chapters=video.description_chapters('00:00 Giriş\n01:00 Hareket\n00:99 Bozuk\n09:00 Dışarı',120)
        self.assertEqual([(r['startSeconds'],r['endSeconds']) for r in chapters],[(0,60),(60,120)])

    def test_rate_limit_does_not_become_deleted_video_or_fabricated_duration(self):
        with patch.object(video,'urlopen',side_effect=HTTPError('https://www.youtube.com',429,'Rate limited',{},None)):
            result=video.fetch_metadata('youtube:abcdefghijk')
        self.assertEqual(result['availability'],'RATE_LIMITED')
        self.assertIsNone(result['durationSeconds'])
        self.assertEqual(result['chapters'],[])

    def test_playlist_does_not_get_single_video_timeline(self):
        with patch.object(video,'urlopen') as fetch:
            result=video.fetch_metadata('youtube-playlist:list-id')
        fetch.assert_not_called()
        self.assertEqual(result['availability'],'PLAYLIST_REFERENCE')
        self.assertIsNone(result['durationSeconds'])


if __name__=='__main__':unittest.main()
