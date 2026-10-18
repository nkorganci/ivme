-- Filter counts must not decompress every source-evidence JSON document.
ALTER TABLE learning_catalog.items ADD COLUMN IF NOT EXISTS question_code text GENERATED ALWAYS AS (data->>'questionCode') STORED;
ALTER TABLE learning_catalog.items ADD COLUMN IF NOT EXISTS source_stamp text GENERATED ALWAYS AS (data->>'sourceUpdatedAt') STORED;
ALTER TABLE learning_catalog.items ADD COLUMN IF NOT EXISTS availability text GENERATED ALWAYS AS (data->>'availability') STORED;
ALTER TABLE learning_catalog.items ADD COLUMN IF NOT EXISTS search_text text GENERATED ALWAYS AS (data->>'searchText') STORED;
ALTER TABLE learning_catalog.items ADD COLUMN IF NOT EXISTS content_format text GENERATED ALWAYS AS (data->'automaticLabels'->>'contentFormat') STORED;
ALTER TABLE learning_catalog.items ADD COLUMN IF NOT EXISTS skills jsonb GENERATED ALWAYS AS (data->'automaticLabels'->'skills') STORED;
ALTER TABLE learning_catalog.items ADD COLUMN IF NOT EXISTS grades jsonb GENERATED ALWAYS AS (data->'automaticLabels'->'grades') STORED;
ALTER TABLE learning_catalog.items ADD COLUMN IF NOT EXISTS category_ids text[] NOT NULL DEFAULT '{}';
ALTER TABLE learning_catalog.items ADD COLUMN IF NOT EXISTS subject_ids text[] NOT NULL DEFAULT '{}';
ALTER TABLE learning_catalog.items ADD COLUMN IF NOT EXISTS exam_ids text[] NOT NULL DEFAULT '{}';
UPDATE learning_catalog.items i SET category_ids=s.categories,subject_ids=s.subjects,exam_ids=s.exams
FROM (SELECT a.run_key,a.item_key,array_agg(DISTINCT a.category_id) AS categories,
      array_agg(DISTINCT c.definition->>'subjectId') AS subjects,array_agg(DISTINCT c.definition->>'exam') AS exams
      FROM learning_catalog.assignments a JOIN learning_catalog.categories c USING(run_key,category_id)
      GROUP BY a.run_key,a.item_key) s
WHERE i.run_key=s.run_key AND i.item_key=s.item_key AND cardinality(i.category_ids)=0;
CREATE INDEX IF NOT EXISTS learning_items_categories ON learning_catalog.items USING gin(category_ids);
CREATE INDEX IF NOT EXISTS learning_items_subjects ON learning_catalog.items USING gin(subject_ids);
CREATE INDEX IF NOT EXISTS learning_items_question_code ON learning_catalog.items(run_key,question_code);
-- Refresh SELECT * views after adding the stored columns.
CREATE OR REPLACE VIEW learning_catalog.current_items AS
    SELECT i.* FROM learning_catalog.items i JOIN learning_catalog.current_run r USING(run_key);
