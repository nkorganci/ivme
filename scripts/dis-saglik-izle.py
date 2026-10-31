"""Dış makinede zamanlanmış readiness kontrolü ve HTTP webhook uyarısı.

Her dakika bir kez çalıştırılır. Durum dosyası aynı makinede kalmalıdır.
"""

import argparse
import json
import os
import sys
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


def check(url):
    try:
        with urlopen(Request(url.rstrip("/") + "/actuator/health/readiness", headers={"Accept": "application/json"}), timeout=8) as response:
            return response.status == 200 and json.load(response).get("status") == "UP"
    except (HTTPError, URLError, TimeoutError, ValueError, OSError):
        return False


def notify(webhook, message):
    if not webhook:
        print(message, flush=True)
        return False
    body = json.dumps({"text": message}).encode("utf-8")
    try:
        with urlopen(Request(webhook, data=body, headers={"Content-Type": "application/json"}), timeout=8) as response:
            return 200 <= response.status < 300
    except (HTTPError, URLError, TimeoutError, OSError):
        print("Uyarı webhook'una erişilemedi; sonraki çalışmada tekrar denenecek.", file=sys.stderr)
        return False


def update(state, healthy, webhook, name):
    state["failures"] = 0 if healthy else state.get("failures", 0) + 1
    state["successes"] = state.get("successes", 0) + 1 if healthy else 0
    if state["failures"] >= 3 and not state.get("alerted", False):
        if notify(webhook, f"ALARM: {name} readiness üç ardışık kontrolde başarısız. Uygulama, DB ve ağ erişimini inceleyin."):
            state["alerted"] = True
    if state["successes"] >= 2 and state.get("alerted", False):
        if notify(webhook, f"DÜZELDİ: {name} readiness iki ardışık kontrolde başarılı."):
            state["alerted"] = False
    return state


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", required=True, help="Dışarıdan erişilen HTTPS site adresi")
    parser.add_argument("--state", required=True, type=Path, help="Dış izleyici makinesindeki kalıcı JSON dosyası")
    parser.add_argument("--name", default="İvme")
    args = parser.parse_args()
    if not args.url.startswith("https://"):
        parser.error("Dış kontrol adresi HTTPS olmalı")
    webhook = os.environ.get("IVME_ALERT_WEBHOOK", "")
    try:
        state = json.loads(args.state.read_text(encoding="utf-8"))
    except FileNotFoundError:
        state = {}
    except (ValueError, OSError):
        print("Durum dosyası okunamadı; uyarı durumu sıfırlanmadı.", file=sys.stderr)
        return 2
    healthy = check(args.url)
    state = update(state, healthy, webhook, args.name)
    args.state.parent.mkdir(parents=True, exist_ok=True)
    temporary = args.state.with_suffix(args.state.suffix + ".tmp")
    temporary.write_text(json.dumps(state), encoding="utf-8")
    temporary.replace(args.state)
    print("UP" if healthy else "DOWN", flush=True)
    return 0 if healthy else 1


if __name__ == "__main__":
    sys.exit(main())
