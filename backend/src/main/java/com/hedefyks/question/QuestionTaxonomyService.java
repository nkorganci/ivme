package com.hedefyks.question;

import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/** Yalnız insan tarafından yayımlanmış eşlemeleri sunar ve olay anında değişmez kopyasını alır. */
@Service
public class QuestionTaxonomyService {
    public record Label(String kind, String code, String name, String version) {}

    private final JdbcTemplate jdbc;

    public QuestionTaxonomyService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<Label> approved(Long questionId) {
        return jdbc.query("""
                SELECT n.kind, n.code, n.name, qt.taxonomy_version
                FROM question_taxonomy qt JOIN taxonomy_nodes n ON n.id = qt.node_id
                WHERE qt.question_id = ? AND qt.approval_status = 'APPROVED'
                  AND qt.source IN ('HUMAN', 'AI_REVIEWED') AND n.active AND qt.source_stamp=(SELECT extract(epoch FROM q.updated_at)::text FROM questions q WHERE q.id=qt.question_id) AND (qt.source_version IS NULL OR EXISTS(SELECT 1 FROM learning_catalog.current_items i JOIN questions q ON i.question_code=q.code WHERE q.id=qt.question_id AND i.data->>'sourceVersion'=qt.source_version))
                  AND n.kind IN ('SUBTOPIC', 'QUESTION_TYPE')
                ORDER BY n.kind, n.code
                """, (rs, row) -> new Label(rs.getString(1), rs.getString(2), rs.getString(3), rs.getString(4)), questionId);
    }

    public void snapshot(Long attemptId, Long questionId) {
        jdbc.update("""
                INSERT INTO attempt_taxonomy_snapshot(attempt_id, node_id, node_kind, node_code, node_name, taxonomy_version)
                SELECT ?, n.id, n.kind, n.code, n.name, qt.taxonomy_version
                FROM question_taxonomy qt JOIN taxonomy_nodes n ON n.id = qt.node_id
                WHERE qt.question_id = ? AND qt.approval_status = 'APPROVED'
                  AND qt.source IN ('HUMAN', 'AI_REVIEWED') AND n.active AND qt.source_stamp=(SELECT extract(epoch FROM q.updated_at)::text FROM questions q WHERE q.id=qt.question_id) AND (qt.source_version IS NULL OR EXISTS(SELECT 1 FROM learning_catalog.current_items i JOIN questions q ON i.question_code=q.code WHERE q.id=qt.question_id AND i.data->>'sourceVersion'=qt.source_version))
                  AND n.kind IN ('SUBTOPIC', 'QUESTION_TYPE')
                """, attemptId, questionId);
    }

    public List<Label> snapshotFor(Long attemptId) {
        return jdbc.query("""
                SELECT node_kind, node_code, node_name, taxonomy_version
                FROM attempt_taxonomy_snapshot WHERE attempt_id = ? ORDER BY node_kind, node_code
                """, (rs, row) -> new Label(rs.getString(1), rs.getString(2), rs.getString(3), rs.getString(4)), attemptId);
    }

    public void snapshotExam(Long examId) {
        jdbc.update("""
                INSERT INTO exam_taxonomy_snapshot(exam_question_id,node_id,node_kind,node_code,node_name,taxonomy_version)
                SELECT eq.id,n.id,n.kind,n.code,n.name,qt.taxonomy_version
                FROM exam_questions eq JOIN question_taxonomy qt ON qt.question_id=eq.question_id
                JOIN taxonomy_nodes n ON n.id=qt.node_id
                WHERE eq.exam_id=? AND qt.approval_status='APPROVED'
                  AND qt.source IN ('HUMAN','AI_REVIEWED') AND n.active AND qt.source_stamp=(SELECT extract(epoch FROM q.updated_at)::text FROM questions q WHERE q.id=qt.question_id) AND (qt.source_version IS NULL OR EXISTS(SELECT 1 FROM learning_catalog.current_items i JOIN questions q ON i.question_code=q.code WHERE q.id=qt.question_id AND i.data->>'sourceVersion'=qt.source_version))
                  AND n.kind IN ('SUBTOPIC','QUESTION_TYPE')
                ON CONFLICT DO NOTHING
                """,examId);
    }
}
