"""Test seven local vision requests and cache reuse with a fake loopback Ollama API."""

import importlib.util
import json
import tempfile
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


spec = importlib.util.spec_from_file_location("ollama_etiket_pilotu", Path(__file__).with_name("ollama-etiket-pilotu.py"))
pilot = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pilot)


class FakeOllama(BaseHTTPRequestHandler):
    calls = 0

    def reply(self, value):
        data = json.dumps(value).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        assert self.path == "/api/tags"
        self.reply({"models": [{"name": "fake-vision", "digest": "a" * 64}]})

    def do_POST(self):
        assert self.path == "/api/generate"
        request = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        assert request["stream"] is False and request["images"] and request["format"]
        FakeOllama.calls += 1
        self.reply({"done": True, "done_reason": "stop",
                    "response": json.dumps({"question_type_code": "tyt.turkce.tip.paragraf_anlam",
                                            "confidence": 0.7, "abstain": False,
                                            "evidence": "Fake model output for transport test"}),
                    "prompt_eval_count": 10, "eval_count": 5, "total_duration": 1000})

    def log_message(self, *_):
        pass


server = ThreadingHTTPServer(("127.0.0.1", 0), FakeOllama)
threading.Thread(target=server.serve_forever, daemon=True).start()
try:
    with tempfile.TemporaryDirectory() as directory:
        pilot.BASE = f"http://127.0.0.1:{server.server_port}"
        pilot.OUTPUT_DIR = Path(directory)
        pilot.run("fake-vision", False)
        assert FakeOllama.calls == 7
        pilot.run("fake-vision", False)
        assert FakeOllama.calls == 7
        files = list(Path(directory).glob("*.json"))
        assert len(files) == 1
        data = json.loads(files[0].read_text(encoding="utf-8"))
        assert len(data["drafts"]) == 7 and not data["errors"]
        assert data["run"]["model_version"] == "a" * 64
        print("Ollama batch PASS: 7 local vision requests, model digest, validation and cache reuse")
finally:
    server.shutdown()
    server.server_close()
