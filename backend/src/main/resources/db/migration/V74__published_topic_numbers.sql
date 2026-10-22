-- Keep the lesson number on the existing published category definition.
-- No second subject/topic reference table is introduced.
WITH numbered AS (
    SELECT c.run_key, c.category_id,
           row_number() OVER (
               PARTITION BY c.definition->>'exam', c.definition->>'subjectId'
               ORDER BY (c.definition->>'order')::integer, c.category_id
           )::integer AS topic_number
    FROM learning_catalog.categories c
    JOIN learning_catalog.current_run r USING (run_key)
    WHERE c.definition->>'canonicalUnit' = 'true'
      AND c.definition->>'selectable' = 'true'
      AND c.definition ? 'order'
)
UPDATE learning_catalog.categories c
SET definition = jsonb_set(c.definition, '{topicNumber}', to_jsonb(n.topic_number), true)
FROM numbered n
WHERE c.run_key = n.run_key AND c.category_id = n.category_id
  AND c.definition->'topicNumber' IS DISTINCT FROM to_jsonb(n.topic_number);
