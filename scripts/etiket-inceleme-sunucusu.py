"""Local-only 14.02 review screen for the 200-question CSV; no student API writes."""

import argparse
import csv
import importlib.util
import json
import threading
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote

QUEUE_SCRIPT = Path(__file__).with_name("altin-ornek-kuyrugu.py")
SPEC = importlib.util.spec_from_file_location("altin_ornek_kuyrugu", QUEUE_SCRIPT)
QUEUE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(QUEUE)
OUTPUT, SOURCE_ROOT, TAXONOMY, FIELDS, sha256 = (
    QUEUE.OUTPUT, QUEUE.SOURCE_ROOT, QUEUE.TAXONOMY, QUEUE.FIELDS, QUEUE.sha256
)
AI_DRAFTS = Path(__file__).resolve().parents[1] / "ornek-veri/ai-etiket-qwen35-pilot-7.json"
DRAFT_FILE = AI_DRAFTS


LOCK = threading.Lock()
HTML = """<!doctype html>
<html lang="tr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>İvme · Etiket incelemesi</title>
<style>
body{font:16px/1.5 system-ui,sans-serif;background:#f7f5fb;color:#242032;margin:0}
main{max-width:1100px;margin:auto;padding:20px}h1{font-size:1.5rem}p{margin:.4rem 0 1rem}
.panel{background:white;border:1px solid #dad4e5;border-radius:14px;padding:18px;margin:12px 0;min-width:0;overflow-wrap:anywhere}
.grid{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(270px,1fr);gap:16px}
img{max-width:100%;height:auto;border:1px solid #ddd;border-radius:8px}
label{display:block;font-weight:600;margin:12px 0 4px}input,select,textarea,button{font:inherit}
input,select,textarea{box-sizing:border-box;width:100%;padding:10px;border:1px solid #81758f;border-radius:8px}
textarea{min-height:80px}button{min-height:44px;padding:8px 14px;border-radius:8px;border:1px solid #674291;background:white;cursor:pointer}
button.primary{background:#674291;color:white}button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible{outline:3px solid #bd94ff}
.row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.muted{color:#51465f}.error{color:#9b1729}.success{color:#22663a}
@media(max-width:700px){.grid{grid-template-columns:1fr}main{padding:12px}}
</style>
<main><h1>14.02 · Soru etiketi incelemesi</h1>
<p>Geçici pilot etiketleri tek tek kontrol edin. Kaydettiğiniz kararlar yerel CSV'ye yazılır; öğrenci veritabanına aktarılmaz.</p>
<div class="panel row"><label for="reviewer">İnceleyen kimliği</label><input id="reviewer" style="max-width:240px" autocomplete="name" required>
<span id="counts" aria-live="polite"></span></div>
<div class="panel row"><button id="previous">Önceki</button><label for="jump">Soru</label><select id="jump" style="max-width:270px"></select><button id="next">Sonraki</button></div>
<div class="grid"><div class="panel"><h2 id="title"></h2><p id="source" class="muted"></p><img id="image" alt="İncelenen sorunun kaynak görseli"></div>
<div class="panel"><p id="current"></p><p id="suggestion" class="muted"></p><p id="aiDraft" class="muted"></p>
<label for="label">İncelenen soru tipi</label><select id="label"></select>
<label for="evidence">Sorudaki kanıt / gerekçe</label><textarea id="evidence" placeholder="Sorunun hangi ifadesi veya görseli bu etiketi destekliyor?"></textarea>
<label for="note">Ret / belirsizlik nedeni</label><textarea id="note" placeholder="Etiket neden belirsiz veya taksonomi dışında?"></textarea>
<div class="row"><button class="primary" id="approve">İnsan onayı olarak kaydet</button><button id="uncertain">Belirsiz</button><button id="reject">Reddet</button></div>
<p id="message" role="status" aria-live="polite"></p></div></div></main>
<script>
let rows=[],drafts={},index=0;
const $=id=>document.getElementById(id);
async function load(){const [rowResponse,draftResponse]=await Promise.all([fetch('/api/rows'),fetch('/api/drafts')]);
  if(!rowResponse.ok||!draftResponse.ok)throw new Error('Kuyruk veya AI taslağı doğrulanamadı');
  rows=await rowResponse.json();drafts=await draftResponse.json();
  $('jump').innerHTML=rows.map((r,i)=>`<option value="${i}">${i+1}. ${r.question_code}</option>`).join('');show();}
function show(){const r=rows[index];if(!r)return;
  $('jump').value=index;$('title').textContent=`${index+1}/200 · ${r.question_code}`;
  $('source').textContent=`${r.source_topic} · ${r.source_year} · Görsel SHA-256: ${r.image_sha256.slice(0,12)}…`;
  $('image').src='/image/'+encodeURIComponent(r.question_code);
  $('current').textContent=`Durum: ${r.review_status}${r.reviewer_id?' · '+r.reviewer_id:''}`;
  $('suggestion').textContent=`Kaynak konudan gelen taslak: ${r.suggested_question_type_code} (insan onayı değildir)`;
  const draft=drafts[r.question_code];
  $('aiDraft').textContent=draft?`AI taslağı: ${draft.abstain?'Emin değilim':draft.question_type_code} · güven ${draft.confidence} (kalibre edilmedi) · ${draft.evidence}`:'Bu soruda AI taslağı yok.';
  const codes=r.allowed_question_type_codes.split('|');
  $('label').innerHTML='<option value="">Seçiniz</option>'+codes.map(code=>`<option value="${code}">${code}</option>`).join('');
  $('label').value=r.reviewed_question_type_code||'';
  $('evidence').value=r.review_evidence||'';$('note').value=r.review_status==='provisional'?'':r.review_note||'';
  $('message').textContent='';$('counts').textContent=`İnsan onayı: ${rows.filter(x=>x.review_status==='approved').length}/200 · Geçici: ${rows.filter(x=>x.review_status==='provisional').length}`;
}
async function save(status){const r=rows[index],reviewer=$('reviewer').value.trim();
  if(!reviewer){$('message').textContent='Önce inceleyen kimliğini girin.';return;}
  const data={question_code:r.question_code,reviewer_id:reviewer,review_status:status,
    reviewed_question_type_code:$('label').value,review_evidence:$('evidence').value.trim(),review_note:$('note').value.trim()};
  const response=await fetch('/api/review',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
  const result=await response.json();if(!response.ok){$('message').textContent=result.error||'Kayıt başarısız';$('message').className='error';return;}
  rows[index]=result.row;$('message').textContent='Karar CSV’ye kaydedildi.';$('message').className='success';
  $('counts').textContent=`İnsan onayı: ${rows.filter(x=>x.review_status==='approved').length}/200 · Geçici: ${rows.filter(x=>x.review_status==='provisional').length}`;
  $('current').textContent=`Durum: ${result.row.review_status} · ${result.row.reviewer_id}`;
}
$('previous').onclick=()=>{index=Math.max(0,index-1);show()};$('next').onclick=()=>{index=Math.min(rows.length-1,index+1);show()};
$('jump').onchange=()=>{index=Number($('jump').value);show()};
$('approve').onclick=()=>save('approved');$('uncertain').onclick=()=>save('uncertain');$('reject').onclick=()=>save('rejected');
load().catch(error=>{$('message').textContent='Kuyruk yüklenemedi: '+error.message});
</script></html>"""


class Handler(BaseHTTPRequestHandler):
    def send_bytes(self, status, data, content_type):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def send_json(self, status, value):
        self.send_bytes(status, json.dumps(value, ensure_ascii=False).encode("utf-8"),
                        "application/json; charset=utf-8")

    def rows(self):
        with OUTPUT.open(encoding="utf-8", newline="") as stream:
            return list(csv.DictReader(stream))

    def drafts(self):
        data = json.loads(DRAFT_FILE.read_text(encoding="utf-8"))
        if data["schema_version"] != 1 or data["run"]["status"] != "draft":
            raise ValueError("AI taslak dosyası sürümü veya durumu geçersiz")
        if data["run"]["taxonomy_version"] != "tyt-turkce-v1":
            raise ValueError("AI taslak taksonomisi uyuşmuyor")
        questions = {row["question_code"]: row for row in self.rows()}
        allowed = {node["code"] for node in json.loads(TAXONOMY.read_text(encoding="utf-8"))["nodes"]
                   if node["kind"] == "QUESTION_TYPE"}
        result = {}
        for item in data["drafts"]:
            code = item["question_code"]
            if (code in result or code not in questions
                    or item["image_sha256"] != questions[code]["image_sha256"]
                    or (item["abstain"] and item["question_type_code"] is not None)
                    or (not item["abstain"] and item["question_type_code"] not in allowed)):
                raise ValueError(f"AI taslağı kaynakla uyuşmuyor: {code}")
            result[code] = item
        return result

    def do_GET(self):
        if self.path == "/":
            self.send_bytes(200, HTML.encode("utf-8"), "text/html; charset=utf-8")
        elif self.path == "/api/rows":
            self.send_json(200, self.rows())
        elif self.path == "/api/drafts":
            try:
                self.send_json(200, self.drafts())
            except (KeyError, ValueError, OSError) as error:
                self.send_json(409, {"error": str(error)})
        elif self.path.startswith("/image/"):
            code = unquote(self.path[len("/image/"):])
            row = next((row for row in self.rows() if row["question_code"] == code), None)
            if row is None:
                self.send_json(404, {"error": "Soru bulunamadı"})
                return
            image = (SOURCE_ROOT / row["source_image"]).resolve()
            if not image.is_relative_to(SOURCE_ROOT.resolve()) or sha256(image) != row["image_sha256"]:
                self.send_json(409, {"error": "Kaynak görsel değişmiş"})
                return
            self.send_bytes(200, image.read_bytes(), "image/webp")
        else:
            self.send_json(404, {"error": "Bulunamadı"})

    def do_POST(self):
        if self.path != "/api/review":
            self.send_json(404, {"error": "Bulunamadı"})
            return
        origin = self.headers.get("Origin")
        if origin and origin != f"http://127.0.0.1:{self.server.server_port}":
            self.send_json(403, {"error": "Geçersiz köken"})
            return
        if self.headers.get("Content-Type", "").split(";")[0] != "application/json":
            self.send_json(415, {"error": "JSON gerekli"})
            return
        size = int(self.headers.get("Content-Length", "0"))
        if size < 1 or size > 16384:
            self.send_json(413, {"error": "Geçersiz kayıt boyutu"})
            return
        try:
            data = json.loads(self.rfile.read(size))
            code = data["question_code"]
            status = data["review_status"]
            reviewer = data["reviewer_id"].strip()
            label = data["reviewed_question_type_code"].strip()
            evidence = data["review_evidence"].strip()
            note = data["review_note"].strip()
            if status not in {"approved", "uncertain", "rejected"} or not reviewer or len(reviewer) > 80:
                raise ValueError("Durum veya inceleyen kimliği geçersiz")
            if status == "approved" and (not label or not evidence):
                raise ValueError("Onay için etiket ve kanıt gerekli")
            if status != "approved" and not note:
                raise ValueError("Belirsiz/ret için neden gerekli")
            if any(len(value) > 1000 for value in (evidence, note)):
                raise ValueError("Açıklama çok uzun")
            with LOCK:
                rows = self.rows()
                row = next((row for row in rows if row["question_code"] == code), None)
                if row is None:
                    raise ValueError("Soru bulunamadı")
                allowed = {node["code"] for node in json.loads(TAXONOMY.read_text(encoding="utf-8"))["nodes"]
                           if node["kind"] == "QUESTION_TYPE"}
                if label and label not in allowed:
                    raise ValueError("Etiket izinli taksonomide yok")
                image = (SOURCE_ROOT / row["source_image"]).resolve()
                if sha256(image) != row["image_sha256"]:
                    raise ValueError("Kaynak görsel değişmiş")
                row.update(reviewer_id=reviewer,
                           reviewed_at_utc=datetime.now(timezone.utc).isoformat(),
                           reviewed_question_type_code=label if status == "approved" else "",
                           review_evidence=evidence if status == "approved" else "",
                           review_status=status, review_note=note)
                temporary = OUTPUT.with_suffix(".tmp")
                with temporary.open("w", encoding="utf-8", newline="") as stream:
                    writer = csv.DictWriter(stream, fieldnames=FIELDS, lineterminator="\n")
                    writer.writeheader()
                    writer.writerows(rows)
                temporary.replace(OUTPUT)
            self.send_json(200, {"row": row})
        except (KeyError, ValueError, TypeError, OSError) as error:
            self.send_json(400, {"error": str(error)})


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--draft-file", type=Path, default=AI_DRAFTS,
                        help="Validated AI draft JSON; defaults to seven local Qwen drafts")
    args = parser.parse_args()
    DRAFT_FILE = args.draft_file.resolve()
    server = ThreadingHTTPServer(("127.0.0.1", 8765), Handler)
    print("İnceleme ekranı: http://127.0.0.1:8765")
    server.serve_forever()
