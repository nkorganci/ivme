# 07.07 — Pratik geçmişi ve yeniden açma

**Durum:** BITTI · **Bağımlılık:** 07.06 BITTI · **Model:** GPT-6 Luna · Medium.

## Kapsam ve kabul

1. Kullanıcının kendi pratik oturumları en yeni önce, sayfalı listelenir. Süresi geçmiş açık oturumlar listede kapanmış görünür; başka hesabın oturumu listelenmez.
2. Açık oturum yeniden açılınca kayıtlı soru sırası ve süre korunur. Bitmiş oturum yeniden açılınca sonuç görünür; yeni yanıt yazılamaz.
3. Geçmiş ekranında sınav/pratik ayrımı, hesap ekranından pratik geçmişine erişim, boş/yükleme/hata durumları ve 390 px telefon kontrolü bulunur.
4. Test DB ve sahte API ile doğrula; gerçek DB ve canlı süreci değiştirme.

## Oturum sonu kaydı

Tarih · değişiklik · UI · test · yerel commit · açık risk. Repo ve dış plan kopyasını eşitle; tamamlanırsa 07.07 BITTI ve sonraki bağımsız iş SIRADAKI. Push yapma.

2026-10-09 · Kendi oturumlarını sayfalayan API, Geçmişim ekranında sınav/pratik ayrımı ve Hesap bağlantısı eklendi. Açık oturum aynı soru sırasına, bitmiş oturum sonuca döner. · Edge'de 1280/390 px liste, boş, hata ve Hesap ekranları sahte API ile kontrol edildi; yatay taşma ve tarayıcı hatası yok. · `StudySessionTest` + `AttemptTest` ve `npm run build` geçti. · Yerel commit: bu işin Git kaydı. · Açık risk: canlı DB ve gerçek telefon provası 05.03/05.05 kapsamında.
