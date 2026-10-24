-- KPSS test süreleri sınav tanımında tutulur; deneme planı ve süre buradan okunur.
-- ÖSYM KPSS Ortaöğretim: 120 soru 130 dakika; GY ve GK ayrı denemelerde 65'er dakika.
UPDATE exam_tracks t SET sections = (
    SELECT jsonb_agg(s.value || jsonb_build_object('minutes', 65, 'detail', '60 soru · 65 dakika') ORDER BY s.ordinality)
    FROM jsonb_array_elements(t.sections) WITH ORDINALITY s
) WHERE t.id = 'KPSS_ORTAOGRETIM';
