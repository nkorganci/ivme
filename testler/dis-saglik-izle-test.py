import importlib.util
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from unittest.mock import patch

module = Path(__file__).resolve().parents[1] / "scripts/dis-saglik-izle.py"
spec = importlib.util.spec_from_file_location("dis_saglik_izle", module)
probe = importlib.util.module_from_spec(spec)
spec.loader.exec_module(probe)


def test_alert_and_recovery_only_once():
    state = {}
    with patch.object(probe, "notify", return_value=True) as send:
        for _ in range(4):
            probe.update(state, False, "https://example.test/hook", "İvme")
        assert send.call_count == 1
        for _ in range(3):
            probe.update(state, True, "https://example.test/hook", "İvme")
        assert send.call_count == 2
        assert state["alerted"] is False


def test_failed_delivery_is_retried():
    state = {"failures": 2}
    with patch.object(probe, "notify", side_effect=[False, True]) as send:
        probe.update(state, False, "https://example.test/hook", "İvme")
        assert state.get("alerted") is None
        probe.update(state, False, "https://example.test/hook", "İvme")
        assert state["alerted"] is True
        assert send.call_count == 2


def test_missing_webhook_does_not_mark_alert_delivered():
    state = {"failures": 2}
    probe.update(state, False, "", "İvme")
    assert state.get("alerted") is None


def test_webhook_receives_alert_without_application_running():
    received = []

    class Handler(BaseHTTPRequestHandler):
        def do_POST(self):
            received.append(json.loads(self.rfile.read(int(self.headers["Content-Length"]))))
            self.send_response(204)
            self.end_headers()

        def log_message(self, *_args):
            pass

    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        state = {"failures": 2}
        probe.update(state, False, f"http://127.0.0.1:{server.server_port}/", "İvme")
        assert state["alerted"] is True
        assert received[0]["text"].startswith("ALARM: İvme")
    finally:
        server.shutdown()
        server.server_close()
        thread.join()
