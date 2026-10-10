# 11.01 — Dönemlik toplu kullanım hesabı

**Durum:** BITTI (yalıtılmış test DB; yönetici API yayını 11.02 kapsamında) · **Tarih:** 2026-10-09

`AdminUsageService`, seçilen IANA saat dilimindeki gün/hafta/ay için kayıtlı öğrenci eylemlerinden toplam üretir: tekil aktif öğrenci, başlatılmış pratik oturumu, başlatılmış sınav ve gönderilmiş cevap sayısı. Aktif öğrenci yalnız girişten sayılmaz; cevap, pratik veya sınav başlatma eylemi gerekir. Pratik cevapları ve teslim edilmiş sınavdaki cevaplanmış sorular hacme girer. Dönem başlangıcı dahil, bitişi hariçtir.

`AdminUsageTest` iki öğrenci, bir yönetici, yaz saati değişimindeki 23 saatlik yerel gün, aynı öğrencinin farklı eylemlerinin tekil aktif sayılması, teslim zamanı ve gün sonu sınırını `ivme_test` üzerinde doğruladı. `AuthTest` ve `ExamFlowTest` geçti. Servis kullanıcı kimliği veya tekil olay döndürmez.

Küçük pilot gruplarında kesin dönem sayıları birey çıkarımına yol açabilir. Bu sayılar 11.02 gizleme/yuvarlama ve yönetici ekranı tamamlanmadan `/api/admin/stats` yanıtına eklenmez. Mevcut iki toplu sayı korunur.
