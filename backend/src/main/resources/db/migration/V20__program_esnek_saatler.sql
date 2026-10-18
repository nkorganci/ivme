-- Eski haftalar saat 08:00–22:00 arası birer saatlik düzenle açılır.
ALTER TABLE student_program_weeks
    ADD COLUMN time_boundaries jsonb NOT NULL DEFAULT
      '["08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00","20:00","21:00","22:00"]'::jsonb;
ALTER TABLE student_program_weeks
    ADD CONSTRAINT ck_program_time_boundaries CHECK (
        jsonb_typeof(time_boundaries) = 'array' AND jsonb_array_length(time_boundaries) = 15
    );
