\set ON_ERROR_STOP on
BEGIN;
SELECT 'CREATE ROLE ivme_app NOLOGIN' WHERE NOT EXISTS (
    SELECT FROM pg_roles WHERE rolname = 'ivme_app'
) \gexec
ALTER ROLE ivme_app NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;

GRANT CONNECT ON DATABASE ivme TO ivme_app;
GRANT USAGE ON SCHEMA public, learning_catalog, source_research TO ivme_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ivme_app;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO ivme_app;
REVOKE ALL ON TABLE public.flyway_schema_history FROM ivme_app;
GRANT SELECT ON ALL TABLES IN SCHEMA learning_catalog, source_research TO ivme_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA learning_catalog TO ivme_app;
GRANT INSERT, UPDATE, DELETE ON learning_catalog.question_intake, learning_catalog.pdf_work_queue TO ivme_app;
COMMIT;
