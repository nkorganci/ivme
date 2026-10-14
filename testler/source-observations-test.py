"""Kaynak değişince eski görsel incelemesinin taşınmasını engeller."""
import copy
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from kaynakli_arastirma_db import validate_observations


class ObservationEvidenceTest(unittest.TestCase):
    def test_changed_question_text_or_image_rejects_old_review(self):
        question = {"bank": "OGM", "code": "q1", "text_sha256": "text1", "image_sha256": "image1"}
        observation = {"key": "OGM:q1", "evidence": {"inspection": "assistant_image_review",
                       "sourceTextSha256": "text1", "imageSha256": "image1"}}
        validate_observations({"q1": observation}, [question], [])
        self.assertEqual(question["inspection_status"], "ASSISTANT_IMAGE_REVIEWED")
        for field in ("text_sha256", "image_sha256"):
            changed = {**question, field: "different"}
            with self.subTest(field=field), self.assertRaisesRegex(ValueError, "kaynağı değişmiş"):
                validate_observations({"q1": observation}, [changed], [])

    def test_pdf_review_requires_matching_document_and_page_text(self):
        page = {"catalog_id": 39, "page_number": 26, "document_sha256": "pdf1", "text_sha256": "page1"}
        observation = {"key": "PDF:39:26", "evidence": {"inspection": "assistant_image_review",
                       "catalogId": 39, "page": 26, "documentSha256": "pdf1", "pageTextSha256": "page1"}}
        validate_observations({"page": observation}, [], [page])
        self.assertEqual(page["visual_review_status"], "ASSISTANT_REVIEWED")
        changed = copy.deepcopy(observation)
        changed["evidence"]["pageTextSha256"] = "changed"
        with self.assertRaisesRegex(ValueError, "kaynağı değişmiş"):
            validate_observations({"page": changed}, [], [page])


if __name__ == "__main__":
    unittest.main()
