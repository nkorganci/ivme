-- Soruların kendi zorluk alanı kaldırıldı. Zorluk bilgisi artık yalnızca kullanıcıların verdiği oydur
-- (feedback.difficulty_vote: KOLAY / ORTA / ZOR). Sütun düşünce ix_questions_difficulty indeksi de düşer.
ALTER TABLE questions DROP COLUMN difficulty;
