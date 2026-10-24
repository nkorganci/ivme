package com.hedefyks.examtrack;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hedefyks.common.ApiException;
import com.hedefyks.question.ExamType;
import com.hedefyks.question.QuestionFilter;
import com.hedefyks.question.QuestionSource;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/**
 * Öğrencinin hesabına kayıtlı sınavı (YKS, KPSS Ortaöğretim...) soru kapsamına çevirir.
 * Menüler ortaktır; listeler, sayımlar, pratik ve denemeler yalnız seçili sınavın testlerinden gelir.
 */
@Service
public class ExamTrackService {
    public record Track(String id, String family, String status, List<ExamType> examTypes, List<String> readyFeatures) {}
    public record SectionSubject(String name, int questions) {}
    /** Bir sınav testinin resmî ders dağılımı ve süresi (exam_tracks.sections). */
    public record Section(ExamType exam, String name, int minutes, List<SectionSubject> subjects) {}

    private final JdbcTemplate jdbc;
    private final ObjectMapper json;

    public ExamTrackService(JdbcTemplate jdbc, ObjectMapper json) {
        this.jdbc = jdbc;
        this.json = json;
    }

    public Track current(Long userId) {
        var rows = jdbc.queryForList("""
                SELECT t.id, t.family, t.status, t.sections::text AS sections, t.ready_features
                FROM exam_tracks t
                WHERE t.id = coalesce((SELECT u.track_id FROM user_exam_tracks u JOIN exam_tracks s ON s.id = u.track_id
                                       WHERE u.user_id = ? AND s.status <> 'PLANNED'),
                                      (SELECT id FROM exam_tracks WHERE status = 'ACTIVE' ORDER BY sort_order LIMIT 1))
                """, userId);
        if (rows.isEmpty()) throw new IllegalStateException("Etkin sınav tanımı yok.");
        var row = rows.get(0);
        var types = new ArrayList<ExamType>();
        try {
            for (var section : json.readTree(row.get("sections").toString())) {
                String id = section.path("examId").asText();
                Arrays.stream(ExamType.values()).filter(t -> t.name().equals(id)).forEach(types::add);
            }
        } catch (java.io.IOException error) { throw new IllegalStateException(error); }
        var features = row.get("ready_features") instanceof java.sql.Array array ? readArray(array) : List.<String>of();
        return new Track(row.get("id").toString(), row.get("family").toString(), row.get("status").toString(),
                List.copyOf(types), features);
    }

    public List<ExamType> examTypes(Long userId) {
        return current(userId).examTypes();
    }

    public String trackId(Long userId) {
        return current(userId).id();
    }

    public List<QuestionSource> sources(Long userId) {
        var types = examTypes(userId);
        return Arrays.stream(QuestionSource.values()).filter(s -> types.contains(s.examType())).toList();
    }

    /** Seçili sınavın dışındaki test ve kaynakları süzgeçten çıkarır; boş seçim sınavın bütün kaynaklarıdır. */
    public QuestionFilter scope(QuestionFilter filter, Long userId) {
        var types = examTypes(userId);
        var allowed = Arrays.stream(QuestionSource.values()).filter(s -> types.contains(s.examType())).toList();
        ExamType exam = filter.examType() != null && types.contains(filter.examType()) ? filter.examType() : null;
        var requested = filter.source().stream().filter(allowed::contains)
                .filter(s -> exam == null || s.examType() == exam).toList();
        // Banka seçimi sınavda yoksa (ör. KPSS'de soru bankası) çelişen süzgeç boş sonuç verir.
        var sources = !requested.isEmpty() ? requested
                : allowed.stream().filter(s -> exam == null || s.examType() == exam).toList();
        return new QuestionFilter(filter.bank(), exam, filter.subject(), filter.topic(), filter.categoryId(),
                filter.categoryMatch(), filter.includeCandidates(), filter.questionTypeId(), filter.teacherDifficulty(), sources);
    }

    public void requireExam(ExamType examType, Long userId) {
        if (examType != null && !examTypes(userId).contains(examType))
            throw ApiException.badRequest("Bu sınav türü seçili sınavının kapsamında değil.");
    }

    /** Kategori/ders kaydının seçili sınava ait olup olmadığı (katalog tanımındaki sınav kimliği). */
    public boolean includesCategoryExam(Object exam, List<ExamType> types) {
        String value = exam == null ? "" : exam.toString();
        boolean kpssTrack = types.stream().anyMatch(ExamType::kpss);
        return kpssTrack ? types.stream().anyMatch(t -> t.name().equals(value)) : !value.startsWith("KPSS_");
    }

    public static boolean kpss(QuestionFilter filter) {
        if (filter.examType() != null) return filter.examType().kpss();
        return !filter.source().isEmpty() && filter.source().stream().allMatch(s -> s.examType().kpss());
    }

    /** Aynı test birden çok sınav hedefinde (ör. Lisans GY-GK) yer alabilir; tanım ilk hedeften okunur. */
    public Section section(ExamType exam) {
        var rows = jdbc.queryForList("""
                SELECT s.value::text AS section FROM exam_tracks t CROSS JOIN LATERAL jsonb_array_elements(t.sections) s
                WHERE s.value->>'examId' = ? ORDER BY t.sort_order LIMIT 1
                """, exam.name());
        if (rows.isEmpty()) throw ApiException.badRequest("Bu test için sınav tanımı yok.");
        try {
            var node = json.readTree(rows.get(0).get("section").toString());
            var subjects = new ArrayList<SectionSubject>();
            node.path("subjects").forEach(s -> subjects.add(new SectionSubject(s.path("name").asText(), s.path("questions").asInt())));
            return new Section(exam, node.path("name").asText(), node.path("minutes").asInt(), List.copyOf(subjects));
        } catch (java.io.IOException error) { throw new IllegalStateException(error); }
    }

    private static List<String> readArray(java.sql.Array array) {
        try { return List.of((String[]) array.getArray()); }
        catch (java.sql.SQLException error) { throw new IllegalStateException(error); }
    }
}
