-- Durumu kaydedilmemiş eski dersleri tamamlanmış gibi sayma.
UPDATE math_private_lessons
SET status='PLANNED'
WHERE status='COMPLETED' AND created_at > updated_at;
ALTER TABLE math_private_lessons ALTER COLUMN status SET DEFAULT 'PLANNED';
