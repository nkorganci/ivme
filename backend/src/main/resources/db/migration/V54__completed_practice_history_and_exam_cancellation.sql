-- Keep unfinished/abandoned practice answers out of every shared history calculation.
-- Standalone question practice has no session to finish; its recorded events remain eligible.
CREATE VIEW completed_practice_attempts AS
SELECT a.* FROM question_attempts a
WHERE a.session_id IS NULL OR EXISTS (
    SELECT 1 FROM study_sessions s
    WHERE s.id = a.session_id AND s.user_id = a.user_id AND s.status = 'COMPLETED'
);

ALTER TABLE exams DROP CONSTRAINT exams_status_check;
ALTER TABLE exams ADD CONSTRAINT exams_status_check
    CHECK (status IN ('IN_PROGRESS', 'SUBMITTED', 'CANCELLED'));
