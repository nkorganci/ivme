-- YURT_DISI_MY kimliği, deneme kaydının eski 10 karakterlik alanına da sığmalı.
-- Var olan deneme/öğrenci kayıtları yalnız kolon genişletmesiyle korunur.
ALTER TABLE exams ALTER COLUMN exam_type TYPE varchar(20);
ALTER TABLE exam_coverage_gaps ALTER COLUMN exam_type TYPE varchar(20);
