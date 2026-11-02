// Özgün kırpımlar incelendi; öğretmen onayı değildir.
export const KAR_ZARAR_EXAMS = {
  "TYT-0672": {
    "conceptId": "kar-zarar",
    "archetype": "indirim-zam",
    "answer": "A",
    "title": "2020 TYT · iki kampanya, aynı etiket fiyatı",
    "cue": "Kırmızıda indirim yalnız ikinci kaleme, mavide her kaleme uygulanıyor. İki kampanyanın 2 kalemlik ödemesini etiket fiyatı $f$ cinsinden yaz.",
    "steps": [
      {
        "text": "Kırmızı: birinci kalem $f$, ikinci kalem %50 indirimli $0{,}5f$; toplam $1{,}5f$.",
        "why": "“Bir alana ikincisi %50 indirimli”: indirim tek kaleme uygulanır."
      },
      {
        "text": "Mavi: iki kalem de %30 indirimli; toplam $2\\cdot0{,}7f=1{,}4f$.",
        "why": "Etiket fiyatı üzerinden %30 indirim her kalemde aynı."
      },
      {
        "text": "Maviye ödenen 4,5 lira az: $1{,}5f-1{,}4f=0{,}1f=4{,}5$, $f=45$.",
        "why": "Fark, iki kampanyanın etiket fiyatına göre katsayı farkıdır."
      }
    ],
    "result": "A · 45 lira",
    "tip": "Kampanyaları aynı adet için toplam ödeme olarak yaz; farkı etiket fiyatının katsayı farkına böl.",
    "check": "$f=45$: kırmızı $67{,}5$, mavi $63$; fark $4{,}5$.",
    "mistake": "“İkincisi %50” kampanyasını iki kaleme de %50 indirim sanmak: o zaman kırmızı $f$ olur ve mavi daha pahalı çıkar."
  },
  "TYT-0658": {
    "conceptId": "kar-zarar",
    "archetype": "indirim-zam",
    "answer": "D",
    "title": "2019 TYT · 50 lira eşiği ve beş üründe 2'şer lira",
    "cue": "Son ürün eklenince toplam 50 lirayı geçiyor; indirim yalnız önceden alınan ürünlerden beşine uygulanıyor. Ödenen 43 lira indirimli toplamdır.",
    "steps": [
      {
        "text": "Son ürünün fiyatı $p$: indirimsiz toplam $45+p$.",
        "why": "İlk ürünlerin toplamı 45 lira; bir ürün daha eklendi."
      },
      {
        "text": "Beş ürüne 2'şer lira: indirim 10 lira. $45+p-10=43$.",
        "why": "İndirim ürün başına sabit tutar; yüzde değil."
      },
      {
        "text": "$p=8$; $45+8=53\\ge50$, kampanya koşulu sağlanıyor.",
        "why": "Eşik indirimden önceki toplamla kontrol edilir."
      }
    ],
    "result": "D · 8 lira",
    "tip": "Eşik kampanyalarında önce indirimsiz toplamı yaz, eşiği kontrol et, indirimi yalnız uygulandığı ürünlerden düş.",
    "check": "$45+8=53$ lira; $53-10=43$ lira ödendi.",
    "mistake": "İndirimi son alınan ürüne de uygulamak ya da eşiği indirimli toplamla (43) kontrol etmek."
  },
  "TYT-0649": {
    "conceptId": "kar-zarar",
    "archetype": "adet-maliyet",
    "answer": "D",
    "title": "2018 TYT · evden arsaya iki aşamalı alım–satım",
    "cue": "Ev metrekareyle, arsa dönümle fiyatlanıyor. Evin metrekaresini bul, satıştan gelen parayla kaç dönüm arsa alındığını hesapla; kâr yalnız arsa satışında soruluyor.",
    "steps": [
      {
        "text": "Ev: $450\\,000:3000=150$ m²; satış $150\\cdot3200=480\\,000$ lira.",
        "why": "Alış ve satış birim fiyatları metrekare başına."
      },
      {
        "text": "Arsa: $480\\,000:20\\,000=24$ dönüm; satış $24\\cdot25\\,000=600\\,000$ lira.",
        "why": "Evin satışından gelen paranın tamamı arsaya yatırıldı."
      },
      {
        "text": "Arsa kârı $600\\,000-480\\,000=120\\,000$ lira.",
        "why": "Arsanın maliyeti 480 000 liradır; evdeki kâr bu hesaba girmez."
      }
    ],
    "result": "D · 120 000 lira",
    "tip": "Zincirli alım–satımda her aşamanın adedini ayrı bul; istenen kâr hangi satışa aitse o aşamanın maliyetinden çıkar.",
    "check": "Dönüm başına kâr 5000 lira, 24 dönüm: 120 000 lira.",
    "mistake": "Kârı en baştaki 450 000 liraya göre hesaplamak (150 000) ya da ev ve arsa kârlarını toplamak."
  }
};
