-- A question can belong to several published units. Their joined names can
-- exceed the original single-topic limit while the exam keeps a snapshot.
ALTER TABLE exam_questions ALTER COLUMN topic TYPE text;
