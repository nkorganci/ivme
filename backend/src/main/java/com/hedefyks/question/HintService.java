package com.hedefyks.question;

import com.hedefyks.common.ApiException;
import com.hedefyks.exam.ExamQuestionRepository;
import com.hedefyks.exam.ExamRepository;
import com.hedefyks.exam.ExamStatus;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Yalnız yayımlanmış, güncel taksonomi bağı olan ipuçlarını doğru zamanda sunar. */
@Service
@Transactional(readOnly = true)
public class HintService {
    public record PracticeHint(String text) {}
    public record Explanation(String text, String sourcePdfUrl) {}

    private static final String ELIGIBLE = """
            FROM question_hints h
            JOIN questions q ON q.id = h.question_id
            WHERE h.question_id = ? AND h.review_status = 'APPROVED' AND q.active
              AND EXISTS (
                SELECT 1 FROM question_taxonomy qt
                JOIN taxonomy_nodes n ON n.id = qt.node_id
                WHERE qt.question_id = q.id AND qt.approval_status = 'APPROVED'
                  AND qt.source IN ('HUMAN', 'AI_REVIEWED') AND n.active
                  AND n.kind = 'QUESTION_TYPE' AND n.code = h.question_type_code
                  AND qt.taxonomy_version = h.taxonomy_version
              )
            """;

    private final JdbcTemplate jdbc;
    private final QuestionRepository questions;
    private final AttemptService attempts;
    private final ExamRepository exams;
    private final ExamQuestionRepository examQuestions;

    public HintService(JdbcTemplate jdbc, QuestionRepository questions, AttemptService attempts,
                       ExamRepository exams, ExamQuestionRepository examQuestions) {
        this.jdbc = jdbc;
        this.questions = questions;
        this.attempts = attempts;
        this.exams = exams;
        this.examQuestions = examQuestions;
    }

    public boolean available(Long questionId) {
        return !jdbc.query("SELECT 1 " + ELIGIBLE, (rs, row) -> 1, questionId).isEmpty();
    }

    public Optional<PracticeHint> practiceHint(Long questionId, Long userId) {
        active(questionId);
        guardActiveExam(questionId, userId);
        return jdbc.query("SELECT h.pre_answer_hint " + ELIGIBLE,
                (rs, row) -> new PracticeHint(rs.getString(1)), questionId).stream().findFirst();
    }

    private void guardActiveExam(Long questionId, Long userId) {
        Boolean inActiveExam = jdbc.queryForObject("""
                SELECT EXISTS (
                  SELECT 1 FROM exam_questions eq JOIN exams e ON e.id = eq.exam_id
                  WHERE eq.question_id = ? AND e.user_id = ? AND e.status = 'IN_PROGRESS'
                )
                """, Boolean.class, questionId, userId);
        if (Boolean.TRUE.equals(inActiveExam)) {
            throw ApiException.notFound("Sınav sırasında ipucu gösterilmez.");
        }
    }

    public Optional<Explanation> practiceExplanation(Long questionId, Long userId) {
        active(questionId);
        guardActiveExam(questionId, userId);
        if (!attempts.canSeeSolution(questionId, userId)) {
            throw ApiException.notFound("Açıklama için önce soruyu çöz veya cevabı göster.");
        }
        return explanation(questionId);
    }

    public Optional<Explanation> examExplanation(Long examId, Long questionId, Long userId) {
        var exam = exams.findByIdAndUserId(examId, userId)
                .orElseThrow(() -> ApiException.notFound("Sınav bulunamadı."));
        if (exam.getStatus() != ExamStatus.SUBMITTED) {
            throw ApiException.conflict("Açıklama sınav tesliminden sonra açılır.");
        }
        if (examQuestions.findByExamIdAndQuestionId(examId, questionId).isEmpty()) {
            throw ApiException.notFound("Bu soru sınavda yok.");
        }
        guardActiveExam(questionId, userId);
        return explanation(questionId);
    }

    private Optional<Explanation> explanation(Long questionId) {
        return jdbc.query("SELECT h.post_submission_explanation, h.catalog_id, h.source_page " + ELIGIBLE,
                (rs, row) -> new Explanation(rs.getString(1),
                        "/konu-anlatimlari/" + rs.getInt(2) + "#page=" + rs.getInt(3)),
                questionId).stream().findFirst();
    }

    private void active(Long questionId) {
        if (questions.findById(questionId).filter(Question::isActive).isEmpty()) {
            throw ApiException.notFound("Soru bulunamadı.");
        }
    }
}
