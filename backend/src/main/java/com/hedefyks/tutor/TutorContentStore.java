package com.hedefyks.tutor;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** tutor_contents okuma kuralları. Öğrenci görünürlüğü yalnız burada tanımlanır. */
@Repository
public class TutorContentStore {

    public record Stored(long id, long questionId, String questionCode, int versionNo, String status,
                         double confidence, String band, boolean reviewFlag, JsonNode reviewReasons,
                         JsonNode verification, JsonNode content, String subjectId, String categoryId,
                         String patternKey, String generator, String generationTier, Instant createdAt,
                         Instant reviewedAt) {}

    private static final String COLUMNS = """
            c.id, c.question_id, c.question_code, c.version_no, c.status, c.confidence, c.confidence_band,
            c.review_flag, c.review_reasons::text AS reasons, c.verification::text AS verification,
            c.content::text AS content, c.subject_id, c.category_id, c.pattern_key, c.generator,
            c.generation_tier, c.created_at, c.reviewed_at""";

    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;
    private final TutorProperties props;

    public TutorContentStore(JdbcTemplate jdbc, ObjectMapper mapper, TutorProperties props) {
        this.jdbc = jdbc;
        this.mapper = mapper;
        this.props = props;
    }

    /** Öğrencinin görebileceği durumlar: öğretmen onaylı; pilot politikasında ayrıca otomatik doğrulanmış. */
    String visibleStatuses() {
        return props.studentVisibility() == TutorProperties.Visibility.APPROVED_ONLY
                ? "('APPROVED')" : "('APPROVED','AUTO_VERIFIED')";
    }

    /** Onaylı en son sürüm; yoksa (politika izin veriyorsa) otomatik doğrulanmış en son sürüm. */
    public Optional<Stored> visibleForQuestion(long questionId) {
        return jdbc.query("SELECT " + COLUMNS + " FROM tutor_contents c JOIN questions q ON q.id = c.question_id AND q.active "
                        + "WHERE c.question_id = ? AND c.status IN " + visibleStatuses()
                        + " ORDER BY (c.status = 'APPROVED') DESC, c.version_no DESC LIMIT 1",
                this::map, questionId).stream().findFirst();
    }

    public Optional<Stored> byId(long contentId) {
        return jdbc.query("SELECT " + COLUMNS + " FROM tutor_contents c WHERE c.id = ?", this::map, contentId)
                .stream().findFirst();
    }

    public List<Stored> versionsForCode(String code) {
        return jdbc.query("SELECT " + COLUMNS + " FROM tutor_contents c WHERE c.question_code = ? ORDER BY c.version_no DESC",
                this::map, code);
    }

    /** Öğrenci kataloğu: soru başına görünür tek sürüm. */
    public List<Stored> visibleCatalog() {
        return jdbc.query("SELECT DISTINCT ON (c.question_id) " + COLUMNS
                        + " FROM tutor_contents c JOIN questions q ON q.id = c.question_id AND q.active"
                        + " WHERE c.status IN " + visibleStatuses()
                        + " ORDER BY c.question_id, (c.status = 'APPROVED') DESC, c.version_no DESC",
                this::map);
    }

    /** Öğretmen listesi: soru başına en son sürüm. */
    public List<Stored> latestPerQuestion() {
        return jdbc.query("SELECT DISTINCT ON (c.question_id) " + COLUMNS
                + " FROM tutor_contents c ORDER BY c.question_id, c.version_no DESC", this::map);
    }

    private Stored map(ResultSet rs, int row) throws SQLException {
        return new Stored(rs.getLong("id"), rs.getLong("question_id"), rs.getString("question_code"),
                rs.getInt("version_no"), rs.getString("status"), rs.getBigDecimal("confidence").doubleValue(),
                rs.getString("confidence_band"), rs.getBoolean("review_flag"), json(rs.getString("reasons")),
                json(rs.getString("verification")), json(rs.getString("content")), rs.getString("subject_id"),
                rs.getString("category_id"), rs.getString("pattern_key"), rs.getString("generator"),
                rs.getString("generation_tier"), rs.getTimestamp("created_at").toInstant(),
                rs.getTimestamp("reviewed_at") == null ? null : rs.getTimestamp("reviewed_at").toInstant());
    }

    private JsonNode json(String raw) {
        try {
            return mapper.readTree(raw == null ? "null" : raw);
        } catch (Exception error) {
            throw new IllegalStateException("Öğretim içeriği okunamadı.", error);
        }
    }

}
