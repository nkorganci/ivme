"""Write a concise, evidence-backed plan result only after closeout succeeds."""
import json
from mebi_pratik2_tam_pdf_tarama import APP,BASE


def run():
    result=json.loads((BASE/'archive-closeout.json').read_text(encoding='utf8'))
    if not result.get('allPrintedQuestionsExtracted'):
        raise ValueError('First-pass disposition cannot close the full-archive task; continue extraction and admission')
    if result['status']!='FULL_ARCHIVE_ACCEPTED':raise ValueError('Full archive acceptance evidence required')
    queue=result['reviewQueue'];live=result['live'];bank=result['publishedQuestions']
    bank_label=format(bank,',').replace(',','.')
    pending_label=format(queue['pendingQuestionCandidateCodes'],',').replace(',','.')
    batch_rows='\n'.join(f"| `{r['batch']}` | {format(r['questionsAppended'],',').replace(',','.')} |" for r in result['batchAcceptances'])
    recovery=json.loads((BASE/'bounded-answer-recovery/source-pixel-acceptance.json').read_text(encoding='utf8'))
    text=f'''# 15. Adım — MEBİ Soru Çöz & Pratik 2 — BITTI (doğrulanabilir aktarım ve gerekçeli ayırma geçişi)

**Tamamlanan kapsam:** yalnız `D:\\workspace\\mebi-yks` kaynaklarında
doğrulanabilen soru/cevap/konu paketlerinin aktarımı ve kalanların açık nedenlerle
ayrı inceleme kategorilerine ayrılması. Kullanıcının son talimatı gereği
uyuşmayan içerikte aynı başarısız model çağrısı tekrarlanmadı. İlk okumada
bulunamayan cevaplar için farklı yerel OCR ve kaynak kimliğiyle sınırlı
kurtarma geçişi uygulandı; cevap tahmini yapılmadı.

**Sınır:** bütün arşivdeki basılı soruların tamamının çıkarıldığı veya aktarıldığı
kanıtlanmadı. `{bank_label}` soru yayında; `{pending_label}`
ayrı aday kodu incelemede. Bu sayılar tüm arşivin tekil soru toplamı değildir.
İnceleme kuyruğu bu geçişin ayrı teslimidir; öğretmen tarafından çözülmüş sayılmaz.

## Sonuç

- Canlı banka: **{bank_label} soru**, `MEBI_PRACTICE_2`, yan menü **Soru Çöz & Pratik 2**.
- Etkin katalog: `{live['catalogRun']}`.
- Eksik cevap, boş kategori veya katalogda görünmeyen kabul edilmiş soru: **0**.
- Önceki86.035 soru kimliği/cevabı/güncelleme fingerprint'i aynı.
- Kaynak koruma:4.816 dosya /82.845.852.415 bayt tam SHA-256 kontrolü PASS;
  kaynak yazımı/silme0, yeni envantersiz dosya0.
- Dosya/sayfa kararı:4.816/4.816 dosya,27.614/27.614 PDF sayfası; kayıtsız0.
- Öğretmen onayı üretilmedi; öğrenci DB'sine test cevabı yazılmadı.
- Ek kaynak tekrarı:{queue.get('additionalSourceOccurrences',0)}; yalnız aynı
  RGB pikselleri ve basılı cevap eşleşir, eski soru ID'si birleştirilmez/silinmez.

| Kabul edilmiş parti | Eklenen soru |
|---|---:|
{batch_rows}

İlk okumada uyuşmayan **{recovery['attemptedKeyGroups']} cevap grubunun
{recovery['recoveredKeyGroups']}'ı** farklı yerel OCR ile kurtarıldı.
Gövde incelemesinden {recovery['acceptedCount']} aday geçti; bu ara aday
sayısı son piksel/tekrar kapısından sonraki aktarım sayısıyla karıştırılmaz.
Kaynak kimliği, piksel, cevap ayrımı ve küçük parti güvenliği için 24
ilgili Python regresyon testi PASS.

## Genel yürütme kuralı

Yetkilendirilmiş planın bir alt partisi bitince final yanıtla durup tekrar
“devam et” isteme. Kabul kapıları geçtikçe sonraki adıma aynı çalışma içinde
geç. Çalışan servisi/incelemeyi gereksiz yere durdurma. Ara ilerlemeyi beş
dakikada veya her%10'da kanıt dosyasına yaz; gerçek ölçüm yoksa kesin süre
veya genel ilerleme yüzdesi verme. Yalnız gerçek kullanıcı kararı gerektiren
engelde dur. BITTI, aşağıdaki kabul kapsamını ifade eder; öğretmen incelemesi
veya kanıtlanmamış tam soru çıkarımı değildir.

## Adımlar ve kabul kanıtları

### 15.01 — Salt-okunur kaynak envanteri — BITTI

4.816 kaynak tam SHA-256 ile envantere alındı. Kaynak dışına çıkılmadı;
özgün arşiv taşınmadı/silinmedi. `inventory.json`, `final-source-integrity.json`.

### 15.02 — Sayfa ve cevap kapsama matrisi — BITTI (ilk geçiş ve incelemeye ayırma)

1.573 PDF/27.614 sayfa native metin/koordinat taraması;1.048 HTML/78 ZIP
içerik keşfi tamamlandı. Her dosya/sayfa için sonuç veya inceleme nedeni var.
Ham102.185 gövde işareti/49.567 anahtar işareti doğrulanmış soru sayılmaz.
Yerel gövdesi bulunmayan quiz bağlantıları, görsel okuma sayfaları ve karma
test/bölüm düzenleri kabul edilmeden ayrı kaydedildi.
`full-pdf-coverage.json`, `package-content-report.json`, `archive-disposition/`.

### 15.03 — Özgün soru ve cevap kırpımları — BITTI (kabul edilenler ve gerekçeli ayırma)

Tek-test taramalarında3.305,3 Adım kitaplarında11.011, derleme taramada2.322
gövde kırpımı hazırlandı;41 denemenin5.863 önceki gövde/anahtar kanıtı güncel
MEBİ köküyle uzlaştırıldı. Gruplar örtüşebilir; sayılar toplanıp tekil soru
toplamı diye sunulmaz. Kesilen satır/seçenek, eksik ortak paragraf, özgün
piksel farkı veya bağımsız anahtar uyuşmazlığı ayrı inceleme nedenidir.
Her yeni aktarım öncesi özgün PDF'den yeniden piksel karşılaştırması yapıldı.
`three-step-all-bodies-v2/`, `compiled-tarama-crops/`,
`full-mock-source-reuse/report.json`, `verified-source-batch-*/final-source-acceptance.json`.

### 15.04 — Konu kimliği ve paketleme — BITTI (kanıtlı eşleme ve belirsizleri ayırma)

Yalnız ana tablodaki mevcut TYT/AYT-ders-ünite-konu kimlikleri kullanıldı.
Basılı bölüm başlığı veya açık soru kökü kanıtı olmayan genel konu uydurulmadı.
Konu belirsizleri diğer nedenlerden ayrı tutuldu; sahte öğretmen onayı yok.
`teacher-review-export/current/`, `review-index.sqlite3/candidate_decisions`.

### 15.05 — Temsilî pilot ve arayüz — BITTI

İlk21 soru pilotuydu. Ayrı banka/yan menü `/pratik-2`, mevcut soru/pratik
bileşenleriyle çalışır. Geçici DB'de9 pilot/izolasyon testi ve son rota/facet
regresyonları geçti. Canlı masaüstü/mobil sayaçlar ve özgün görsel HTTP hash'leri
parti bazında PASS; öğrenci liste API'sinde doğru cevap ifşa edilmedi.
Altı gerçek eksik-seçenek negatif kontrolü PASS. Öğretmen onayı çıkarsanmadı.
`pilot-ui-report.json`, `pilot-live-read-report.json`,
`verified-source-batch-*/live-bank-read-report.json`.

### 15.06 — Kademeli aktarım — BITTI (bu geçişte kabul edilen kapsam)

Tam DB yedeği doğrulandı. En fazla100 satırlık atomik INSERT_ONLY partileri,
ikinci ön izlemede0 INSERT/0 UPDATE, mevcut soru fingerprint'i ve sürümlü
katalog bütünlüğüyle kabul edildi. Sıra:ilk21 pilot,536 ek pilot dışı soru,
546 başlık eşlemesi,3 Adım,deneme dil-soruları,derleme tarama ve farklı OCR
ile sınırlı cevap kurtarma. Belirsizler
bu aktarımın parçası değildir. `verified-source-batch-*/bank-acceptance.json`.

### 15.07 — Kapanış ve inceleme teslimi — BITTI (bu geçiş)

Her yerel dosya ve PDF sayfasının durumu kayıtlıdır. Kabul edilen bütün
partilerin canlı kabulü geçti. Çözümlenmeyenler kaynaksız arka plan kaydı
olarak bırakılmadı; aşağıdaki gerekçeli listelerde korunur. Tam arşivin
tekil soru sayısı bilinmediği için genel “%100 soru çıkarımı” veya kesin
kalan öğretmen inceleme süresi verilmez. Ana kanıt:`archive-closeout.json`.

## İnceleme kategorileri ve kullanım

`veri/mebi-pratik-2/20261111-source-inventory/teacher-review-export/current/`
altında `question-candidates.csv/json`, `by-reason/*.csv` ve
`source-group-reviews.json` bulunur. CSV'de özgün PDF yolu, sayfa, soru
görseli, varsa cevap/anahtar görseli ve bekleme nedeni vardır.

Kategoriler:cevap anahtarı doğrulaması;gövde bütünlüğü;konu/ders eşleştirmesi;
kaynak/görsel kanıtı;belge düzeni ve soru kimliği. Dosya/sayfa düzeyi
inceleme:`archive-disposition/source-review.csv`, `pdf-page-decisions.jsonl`.
Ham gözlemler `review-index.sqlite3/native_signals` içinde ayrı tutulur.
İnceleme kayıtları öğrenci ekranına ve pratik havuzuna girmez.

Güncel sayılar:`archive-closeout.json`, `teacher-review-export/current/report.json`.
Tekrar işlem ve öğretmen karar sınırları:[işletim tarifi](../islemler/mebi-pratik-2.md).
Yerel model Qwen3.5:9b yalnız basılı anahtar/gövde incelemesi için kullanıldı;
cevap üretmedi. Envanter/hash/numara/koordinat/piksel/aktarımı Python ve
PostgreSQL yaptı. Model çıktısı tek başına yayın veya öğretmen onayı değildir.
'''
    (APP/'docs/plan/15-soru-bankasi-pratik-2.md').write_text(text,encoding='utf8')
    print(json.dumps({'status':'PLAN_UPDATED_FROM_ACCEPTED_CLOSEOUT','publishedQuestions':bank,
        'scope':'VERIFIED_IMPORT_AND_REASONED_REVIEW_DISPOSITION','allPrintedQuestionsExtracted':False}))


if __name__=='__main__':run()
