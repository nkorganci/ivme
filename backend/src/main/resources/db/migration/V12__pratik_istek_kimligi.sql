-- Ağ tekrarında aynı pratik oturumunu döndürmek için istemci isteği kimliği.
ALTER TABLE study_sessions ADD COLUMN client_request_id uuid;
ALTER TABLE study_sessions ADD CONSTRAINT uq_study_sessions_user_request UNIQUE (user_id, client_request_id);
