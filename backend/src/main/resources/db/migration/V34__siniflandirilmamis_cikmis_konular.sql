-- 12 çıkmış sorunun görseli incelenerek belirlenen kaynak konu etiketleri.
-- Yalnız eski etiket hâlâ duruyorsa düzelt; daha sonraki editör değişikliklerini koru.
UPDATE questions AS q
SET topic = corrections.topic
FROM (VALUES
    ('2018-AYT-FEN-16', 'Kimyasal Tepkimelerde Hesaplamalar'),
    ('2018-AYT-FEN-25', 'Organik Bileşikler'),
    ('2018-AYT-FEN-26', 'Organik Bileşikler'),
    ('2018-AYT-FEN-40', 'Popülasyon Ekolojisi'),
    ('2018-AYT-MAT-36', 'Analitik Geometri'),
    ('2018-AYT-MAT-37', 'Vektörler ve Olasılık'),
    ('2018-AYT-MAT-38', 'Vektörler'),
    ('2018-AYT-SB2-35', 'Kur’an-ı Kerim’in Okunması'),
    ('2018-TYT-FEN-14', 'Hidrokarbonlar'),
    ('2018-TYT-FEN-20', 'Ekosistem Ekolojisi'),
    ('2019-AYT-TDE-33', 'Millî Mücadele'),
    ('2026-AYT-TDE-20', 'Şair, Yazar ve Eser Eşleştirmeleri')
) AS corrections(code, topic)
WHERE q.code = corrections.code
  AND q.bank = 'CIKMIS'
  AND q.topic = 'Sınıflandırılmadı';
