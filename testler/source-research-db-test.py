"""Yerel araştırma arşivini okur; tek yazma denemesi geri alınan onay reddi testidir."""
import json
import subprocess
import sys
import unittest
from pathlib import Path

APP = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(APP / "scripts"))
from kaynakli_arastirma_db import db_connection, query, status
from incele_kaynakli_arastirma import inspect


class ResearchArchiveTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.connection = db_connection()
        cls.state = status(cls.connection)
        if not cls.state.get("runKey"):
            raise RuntimeError("Önce kaynaklı araştırmayı --write ile kaydedin.")
        cls.key = cls.state["runKey"]

    def test_archive_has_complete_source_and_guide_counts(self):
        expected = self.state["summary"]
        self.assertEqual(self.state["questions"], expected["questions"])
        self.assertEqual(self.state["guides"], expected["guides"])
        self.assertEqual(self.state["topics"], expected["topicLabels"])
        self.assertEqual(expected["missingImages"], 0)
        count = int(query(self.connection, f"SELECT count(*) FROM source_research.document_pages p JOIN source_research.run_documents r ON r.catalog_id=p.catalog_id AND r.document_sha256=p.document_sha256 WHERE r.run_key='{self.key}'"))
        self.assertEqual(count, expected["pdfPages"])
        patterns = int(query(self.connection, f"SELECT sum(jsonb_array_length(content->'patterns')) FROM source_research.topic_guides WHERE run_key='{self.key}'"))
        self.assertEqual(patterns, expected["patterns"])

    def test_saved_notes_match_published_notes(self):
        saved = json.loads(query(self.connection, f"SELECT published_notes FROM source_research.runs WHERE run_key='{self.key}'"))
        published = json.loads((APP / "frontend/public/kaynakli-notlar.json").read_text(encoding="utf-8"))
        self.assertEqual(saved, published)
        self.assertEqual(self.state["reviewStatus"], "DRAFT")
        self.assertEqual(self.state["summary"]["teacherApproved"], 0)

    def test_research_cannot_be_marked_teacher_approved(self):
        with self.assertRaisesRegex(RuntimeError, "review_status"):
            query(self.connection, f"BEGIN; UPDATE source_research.runs SET review_status='APPROVED' WHERE run_key='{self.key}'; ROLLBACK")
        self.assertEqual(status(self.connection)["reviewStatus"], "DRAFT")

    def test_turkish_topic_lookup_recovers_references(self):
        result = subprocess.run([sys.executable, "-X", "utf8", "-B", str(APP / "scripts/kaynakli_arastirma_db.py"),
                                 "--find", "Cümlede Anlam"], capture_output=True, text=True, encoding="utf-8", check=True)
        evidence = json.loads(result.stdout)
        self.assertTrue(any(item["topic_id"] == "cumlede-anlam" for item in evidence["guides"]))
        self.assertTrue(any(item["catalog_id"] == 29 and item["page_number"] == 17 for item in evidence["pdfPages"]))

    def test_inspection_recovers_visual_notes_and_source_checksums(self):
        result = inspect(self.connection, question="TYT_DinKulturu-0002", bank="CIKMIS")
        self.assertEqual(len(result["questions"]), 1)
        question = result["questions"][0]
        self.assertEqual(question["inspection_status"], "ASSISTANT_IMAGE_REVIEWED")
        self.assertEqual(result["observations"][0]["evidence"]["imageSha256"], question["image_sha256"])

    def test_topic_inspection_keeps_conflict_and_bank_scope(self):
        result = inspect(self.connection, topic="fiilde çatı", subject="Türkçe", limit=1)
        self.assertEqual(sum(row["records"] for row in result["totals"]), 2)
        self.assertTrue(all(row["bank"] == "OGM" for row in result["questions"]))
        self.assertTrue(any(row["object_key"] == "OGM:mt-tyt-turkce-02-25"
                            and row["evidence"]["excludeFromGuides"] for row in result["observations"]))
        self.assertEqual(inspect(self.connection, question="' OR true --")["questions"], [])

    def test_pdf_inspection_recovers_reviewed_table_and_source_url(self):
        result = inspect(self.connection, pdf_page=(39, 137))
        self.assertEqual(len(result["pages"]), 1)
        self.assertEqual(result["pages"][0]["visual_review_status"], "ASSISTANT_REVIEWED")
        self.assertIsNotNone(result["pages"][0]["has_vector_graphics"])
        self.assertTrue(result["pages"][0]["official_url"].startswith("https://"))

    def test_all_cited_pages_have_vector_presence_checked(self):
        missing = int(query(self.connection, f"""SELECT count(*) FROM source_research.topic_guides g,
          jsonb_array_elements(g.content->'sources') s WHERE g.run_key='{self.key}' AND NOT EXISTS (
            SELECT 1 FROM source_research.document_pages p JOIN source_research.run_documents rd
              ON rd.catalog_id=p.catalog_id AND rd.document_sha256=p.document_sha256
            WHERE rd.run_key=g.run_key AND p.catalog_id=(s->>'catalogId')::int
              AND p.page_number=(s->>'page')::int AND p.has_vector_graphics IS NOT NULL)"""))
        self.assertEqual(missing, 0)

    def test_corrupted_source_glyph_remains_losslessly_recoverable(self):
        result = inspect(self.connection, question="3a-ayt-fizik-56-04", bank="OGM")
        self.assertEqual(len(result["questions"]), 1)
        row = result["questions"][0]
        self.assertIn("\0", row["source_text"])
        self.assertTrue(row["evidence"]["requiresVisualReview"])


if __name__ == "__main__":
    unittest.main()
