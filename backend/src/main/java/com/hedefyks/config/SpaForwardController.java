package com.hedefyks.config;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Üretim paketinde (ön yüz jar içinde) tarayıcıda doğrudan açılan/yenilenen React rotalarını index.html'e yönlendirir.
 * Ön yüze yeni bir üst düzey rota eklenirse buraya da eklenmelidir.
 */
@Controller
class SpaForwardController {

    @GetMapping({"/giris", "/kayit", "/sorular", "/cikmis-sorular", "/soru-bankasi", "/soru/{code}", "/pratik/yeni", "/pratik/{id}", "/sinav/yeni", "/sinav/{id}", "/sinav/{id}/sonuc",
            "/kaynakli-ders-notlari", "/kaynakli-ders-notlari/{subject}",
            "/gecmis", "/ilerleme", "/hedefler", "/ogrenci-takip", "/oneriler", "/geri-bildirim", "/konu-anlatimlari", "/konu-anlatimlari/{id}", "/hesap", "/yonetim", "/icerik-bakimi"})
    String spa() {
        return "forward:/index.html";
    }
}
