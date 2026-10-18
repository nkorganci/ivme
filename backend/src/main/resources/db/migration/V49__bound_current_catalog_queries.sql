-- The singleton is a scalar boundary, so history is never scanned before
-- resolving the published run. Keep all historic rows and view columns intact.
CREATE OR REPLACE VIEW learning_catalog.current_items AS
    SELECT i.* FROM learning_catalog.items i
    WHERE i.run_key=(SELECT run_key FROM learning_catalog.current_run WHERE singleton);
CREATE OR REPLACE VIEW learning_catalog.current_categories AS
    SELECT c.* FROM learning_catalog.categories c
    WHERE c.run_key=(SELECT run_key FROM learning_catalog.current_run WHERE singleton);
CREATE OR REPLACE VIEW learning_catalog.current_assignments AS
    SELECT a.* FROM learning_catalog.assignments a
    WHERE a.run_key=(SELECT run_key FROM learning_catalog.current_run WHERE singleton);
