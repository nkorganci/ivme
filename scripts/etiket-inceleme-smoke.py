"""Exercise local review reads and writes against a temporary CSV copy."""

import csv
import importlib.util
import json
import shutil
import tempfile
import threading
from http.server import ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen


SCRIPT = Path(__file__).with_name("etiket-inceleme-sunucusu.py")
spec = importlib.util.spec_from_file_location("etiket_inceleme_sunucusu", SCRIPT)
review = importlib.util.module_from_spec(spec)
spec.loader.exec_module(review)

with tempfile.TemporaryDirectory() as directory:
    review.OUTPUT = Path(directory) / "review.csv"
    shutil.copyfile(Path(__file__).parents[1] / "ornek-veri/altin-ornek-inceleme-200.csv",
                    review.OUTPUT)
    server = ThreadingHTTPServer(("127.0.0.1", 0), review.Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = f"http://127.0.0.1:{server.server_port}"
    try:
        with urlopen(base + "/api/rows") as response:
            assert len(json.load(response)) == 200
        with urlopen(base + "/api/drafts") as response:
            drafts = json.load(response)
            assert len(drafts) == 200 and drafts["TYT-0001"]["question_type_code"]
        with urlopen(base + "/image/TYT-0100") as response:
            assert response.status == 200 and response.headers["Content-Type"] == "image/webp"

        def post(evidence):
            payload = {
                "question_code": "TYT-0100", "reviewer_id": "smoke-reviewer",
                "review_status": "approved", "reviewed_question_type_code": "tyt.turkce.tip.paragraf_anlam",
                "review_evidence": evidence, "review_note": "",
            }
            return urlopen(Request(base + "/api/review", data=json.dumps(payload).encode(),
                                   headers={"Content-Type": "application/json"}, method="POST"))

        try:
            post("")
            raise AssertionError("empty evidence was accepted")
        except HTTPError as error:
            assert error.code == 400
        with post("Kaynak görselindeki paragraf anlamı sorusu") as response:
            assert json.load(response)["row"]["review_status"] == "approved"
        with review.OUTPUT.open(encoding="utf-8", newline="") as stream:
            rows = list(csv.DictReader(stream))
        assert len(rows) == 200
        assert sum(row["review_status"] == "approved" for row in rows) == 1
        assert next(row for row in rows if row["question_code"] == "TYT-0100")["reviewer_id"] == "smoke-reviewer"
        assert sum(bool(row["ai_reviewer_id"]) for row in rows) == 200
        print("review screen PASS: 200 AI notes retained, image, invalid approval rejected, valid approval saved to temporary CSV")
    finally:
        server.shutdown()
        server.server_close()
