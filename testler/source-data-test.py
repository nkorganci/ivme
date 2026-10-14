"""Kaynak yayınının tamlık, belirsizlik ve kanıt sınırları için regresyonlar."""

import csv
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import yayinla_kaynakli_etiketler as labels
import yayinla_kaynakli_notlar as notes
import analiz_kaynakli_sorular as analysis


class LabelPublicationTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="source-data-")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.source = {"code": "sample-1", "exam_type": "TYT", "subject": "Türkçe",
                       "topic": "Sözcükte Anlam", "active": "true"}
        self.row = {"bank": "OGM", "exam_type": "TYT", "subject": "Türkçe",
                    "code": "sample-1", "source_topic": "Sözcükte Anlam",
                    "label": "Sözcükte Anlam", "evidence_type": "pdf_test_heading",
                    "evidence_ref": "sample.pdf#page=11", "confidence": "medium",
                    "review_required": "true"}
        self.write_csv("sorular-ogm.csv", list(self.source), [self.source])
        self.write_csv("sorular-tum.csv", list(self.source), [])
        self.input = self.root / "labels"
        self.input.mkdir()
        for name, value in (("INPUT", self.input), ("SOURCE", self.root)):
            replacement = patch.object(labels, name, value)
            replacement.start()
            self.addCleanup(replacement.stop)

    def write_csv(self, name, fields, rows):
        with (self.root / name).open("w", encoding="utf-8", newline="") as stream:
            writer = csv.DictWriter(stream, fieldnames=fields)
            writer.writeheader()
            writer.writerows(rows)

    def publish(self, rows=None):
        rows = [self.row] if rows is None else rows
        fields = list(dict.fromkeys([*labels.REQUIRED, *(key for row in rows for key in row)]))
        self.write_csv("labels/fixture.csv", fields, rows)
        return labels.payloads()

    def test_uncertain_subtopic_keeps_real_parent_and_pending_approval(self):
        self.row["label"] = "Sözcükte Anlam (Alt Konu Belirsiz)"
        files, _ = self.publish()
        record = json.loads(files["tyt-turkce.json"])[0]
        self.assertEqual(record["label"], self.row["label"])
        self.assertEqual(record["approval_status"], "teacher_pending")

    def test_uncertain_subtopic_requires_review(self):
        self.row.update(label="Sözcükte Anlam (Alt Konu Belirsiz)", review_required="false")
        with self.assertRaisesRegex(ValueError, "inceleme gerektirir"):
            self.publish()

    def test_empty_and_placeholder_are_rejected(self):
        for label in ("", "  ", "Belirsiz", "Sınıflandırılmamış", "Etiketsiz"):
            with self.subTest(label=label):
                self.row["label"] = label
                with self.assertRaises(ValueError):
                    self.publish()

    def test_duplicate_missing_and_extra_questions_are_rejected(self):
        with self.assertRaisesRegex(ValueError, "yinelenen"):
            self.publish([self.row, self.row])
        with self.assertRaisesRegex(ValueError, "Kapsam farkı"):
            self.publish([])
        self.row["code"] = "not-in-source"
        with self.assertRaisesRegex(ValueError, "Kapsam farkı"):
            self.publish()

    def test_changed_source_topic_is_rejected(self):
        self.row["source_topic"] = "Başka konu"
        with self.assertRaisesRegex(ValueError, "Kaynak alanı değişmiş"):
            self.publish()

    def test_subject_conflict_survives_publication(self):
        self.row["review_reason"] = "possible_subject_error_geography_content_in_history_row"
        files, _ = self.publish()
        record = json.loads(files["tyt-turkce.json"])[0]
        self.assertEqual(record["source_subject_conflict"], "true")
        self.assertEqual(record["suggested_subject"], "Coğrafya")


class NoteEvidenceTest(unittest.TestCase):
    def test_missing_past_question_requires_explicit_scope(self):
        with self.assertRaises(ValueError):
            notes.check_comparison({"id": "sample"}, {"OGM"})
        with self.assertRaises(ValueError):
            notes.check_comparison({"id": "sample", "comparisonStatus": "past_question_not_found"}, {"OGM"})
        notes.check_comparison({"id": "sample", "comparisonStatus": "past_question_not_found",
                                "comparisonNote": "Yerel arşivde eşleşmedi."}, {"OGM"})
        with self.assertRaises(ValueError):
            notes.check_comparison({"id": "sample", "comparisonStatus": "past_question_not_found",
                                    "comparisonNote": "Yerel arşivde eşleşmedi."}, {"CIKMIS", "OGM"})

    def test_conflicting_source_cannot_return_as_teaching_example(self):
        observations = notes.load_observations()
        for key in (("OGM", "3a-tyt-biyoloji-16-02"), ("OGM", "mt-tyt-turkce-02-25")):
            with self.subTest(key=key), self.assertRaisesRegex(ValueError, "çelişkili/uygunsuz"):
                notes.check_example_review(key, observations)

    def test_turkish_letters_and_pdf_line_breaks_match(self):
        notes.check_anchors(["DOĞRU BİLGİ", "ölçütü"], "Doğru\nbilgi ve ölçütü", "fixture")

    def test_missing_source_evidence_cannot_be_published(self):
        with self.assertRaisesRegex(ValueError, "Kaynak dayanağı bulunamadı"):
            notes.check_anchors(["Mecaz anlam"], "Yalnız terim anlam açıklanıyor.", "fixture")

    def test_pdf_hyphenated_line_is_not_a_different_concept(self):
        notes.check_anchors(["karşılaştırma"], "karşılaş-\ntırma", "fixture")

    def test_passage_keywords_cannot_override_actual_question_task(self):
        text = "Yazım kurallarını bilmek önemlidir.\nBu parçada asıl anlatılmak istenen nedir?\nA) Bir seçenek"
        self.assertEqual(analysis.classify_stem(text, "Türkçe"), "ana-dusunce")

    def test_missing_question_text_is_not_a_pattern_claim(self):
        self.assertEqual(analysis.classify_stem("", "Türkçe"), "kok-incelenmeli")


if __name__ == "__main__":
    unittest.main()
