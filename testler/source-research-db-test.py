"""Yerel araştırma arşivini okur; tek yazma denemesi geri alınan onay reddi testidir."""
import json
import subprocess
import sys
import unittest
from pathlib import Path

APP = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(APP / "scripts"))
from kaynakli_arastirma_db import db_connection, query, status


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


if __name__ == "__main__":
    unittest.main()
