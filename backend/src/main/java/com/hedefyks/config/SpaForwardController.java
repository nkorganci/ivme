package com.hedefyks.config;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Üretim paketinde (ön yüz jar içinde) tarayıcıda doğrudan açılan/yenilenen React rotalarını index.html'e yönlendirir.
 * Ön yüze yeni bir üst düzey rota eklenirse buraya da eklenmelidir.
 */
@Controller
class SpaForwardController {

    @GetMapping({"/giris", "/kayit", "/sorular", "/cikmis-sorular", "/soru-bankasi", "/soru/{code}", "/calisma/yeni", "/pratik/yeni", "/pratik/{id}", "/sinav/yeni", "/sinav/{id}", "/sinav/{id}/sonuc",
            "/konular-ve-kaynaklar", "/kaynak-kutuphanesi", "/kaynakli-ders-notlari", "/kaynakli-ders-notlari/{subject}", "/fizik-denetimi", "/ogretmen-dogrulamasi", "/ogretmen-dogrulamasi/{subject}",
            "/calisma/yarim-kalan", "/gecmis", "/ilerleme", "/dersler-ve-konular", "/dersler-ve-konular/pdf-envanteri", "/ogrenci-takip", "/ogrenci-takip/matematik-ozel-ders", "/ogrenci-takip/tyt-denemeleri", "/ogrenci-takip/ayt-denemeleri", "/oneriler", "/geri-bildirim", "/konu-anlatimlari", "/konu-anlatimlari/{id}", "/hesap", "/yonetim", "/icerik-bakimi",
            "/akilli-ogretmen", "/akilli-ogretmen/{code}", "/akilli-ogretmen-inceleme",
            "/interaktif-ogrenme", "/interaktif-ogrenme/{subject}/{unit}"})
    String spa() {
        return "forward:/index.html";
    }
}
