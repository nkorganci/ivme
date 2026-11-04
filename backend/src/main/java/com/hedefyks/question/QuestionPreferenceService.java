package com.hedefyks.question;

import com.hedefyks.common.ApiException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * TAS-06: öğrencinin kişisel soru işaretleri. İki ayrı anlam vardır ve ikisi de yalnız o öğrenciye aittir:
 * <ul>
 * <li><b>Benim zorluk etiketim</b> (KOLAY / ORTA / ZOR / yok): mevcut `feedback` RATING kaydındaki `difficulty_vote`;
 *     ikinci bir oy tablosu yoktur. Öğretmen zorluğu (katalog etiketi) ayrı ve ortaktır.</li>
 * <li><b>Tekrar tercihim</b> (DEFAULT / AGAIN / HIDE): `student_question_preferences`; satır yoksa DEFAULT.
 *     HIDE soruyu otomatik pratik havuzundan, motor setlerinden ve önerilerden çıkarır; soruyu, cevap geçmişini ve
 *     sabit deneme kitapçıklarını değiştirmez. AGAIN, sonraki otomatik seçimde soruyu öne alır ve soru işaretten sonra
 *     bir kez cevaplanınca bekleyen sırası biter (işaret kalır, kontrolsüz tekrar üretmez).</li>
 * </ul>
 * Kullanıcı her zaman oturumdan belirlenir; bütün yazmalar tek SQL deyimiyle atomiktir.
 */
@Service
public class QuestionPreferenceService {
    public static final Set<String> DIFFICULTY_CHOICES = Set.of("KOLAY", "ORTA", "ZOR", "NONE");
    public static final Set<String> REPEAT_CHOICES = Set.of("DEFAULT", "AGAIN", "HIDE");

    /** Kullanıcının bu soruya kişisel işareti. difficulty: KOLAY/ORTA/ZOR ya da null; repeat: DEFAULT/AGAIN/HIDE. */
    public record State(Long questionId, String difficulty, String repeat) {}
    /** Alan yoksa (null) o işaret değişmez; difficulty=NONE zorluk etiketini temizler, repeat=DEFAULT tercihi kaldırır. */
    public record Change(String difficulty, String repeat) {}
    public record Summary(long again, long hidden, long easy, long medium, long hard) {}
    /** Ders motoru için: gizli ve bekleyen-tekrar soru kimlikleri ile kişisel zorluk etiketleri. */
    public record EngineView(List<Long> hidden, List<Long> again, Map<Long, String> difficulty) {}

    /** `q` takma adlı soru için kişisel işaret koşulları (bağlı parametre :userId). */
    public static final String HIDDEN = "EXISTS (SELECT 1 FROM student_question_preferences sp WHERE sp.user_id = :userId "
            + "AND sp.question_id = q.id AND sp.repeat_preference = 'HIDE')";
    public static final String AGAIN_MARKED = "EXISTS (SELECT 1 FROM student_question_preferences sp WHERE sp.user_id = :userId "
            + "AND sp.question_id = q.id AND sp.repeat_preference = 'AGAIN')";
    /** İşaretten sonra henüz cevaplanmamış AGAIN: otomatik seçimde öne alınır. */
    public static final String AGAIN_PENDING = "EXISTS (SELECT 1 FROM student_question_preferences sp WHERE sp.user_id = :userId "
            + "AND sp.question_id = q.id AND sp.repeat_preference = 'AGAIN' AND NOT EXISTS (SELECT 1 FROM question_attempts qa "
            + "WHERE qa.user_id = sp.user_id AND qa.question_id = sp.question_id AND qa.event_type = 'ANSWER' AND qa.created_at > sp.updated_at))";

    private final JdbcClient jdbc;

    public QuestionPreferenceService(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional
    public State change(long userId, long questionId, Change change) {
        if (change == null || (change.difficulty() == null && change.repeat() == null)) throw ApiException.badRequest("Değiştirilecek bir işaret seç.");
        if (change.difficulty() != null && !DIFFICULTY_CHOICES.contains(change.difficulty())) throw ApiException.badRequest("Zorluk KOLAY, ORTA, ZOR veya NONE olmalı.");
        if (change.repeat() != null && !REPEAT_CHOICES.contains(change.repeat())) throw ApiException.badRequest("Tekrar tercihi DEFAULT, AGAIN veya HIDE olmalı.");
        boolean active = jdbc.sql("SELECT active FROM questions WHERE id = :id").param("id", questionId).query(Boolean.class).optional()
                .orElseThrow(() -> ApiException.notFound("Soru bulunamadı."));
        boolean sets = (change.difficulty() != null && !"NONE".equals(change.difficulty())) || (change.repeat() != null && !"DEFAULT".equals(change.repeat()));
        if (sets && !active) throw ApiException.notFound("Soru bulunamadı.");
        if (change.difficulty() != null) {
            if ("NONE".equals(change.difficulty())) clearDifficulty(userId, questionId);
            else jdbc.sql("""
                    INSERT INTO feedback (user_id, question_id, category, difficulty_vote, resolved, created_at, updated_at)
                    VALUES (:userId, :questionId, 'RATING', :difficulty, true, now(), now())
                    ON CONFLICT (user_id, question_id) WHERE category = 'RATING'
                    DO UPDATE SET difficulty_vote = EXCLUDED.difficulty_vote, updated_at = now()
                    """).param("userId", userId).param("questionId", questionId).param("difficulty", change.difficulty()).update();
        }
        if (change.repeat() != null) {
            if ("DEFAULT".equals(change.repeat())) jdbc.sql("DELETE FROM student_question_preferences WHERE user_id = :userId AND question_id = :questionId")
                    .param("userId", userId).param("questionId", questionId).update();
            else jdbc.sql("""
                    INSERT INTO student_question_preferences (user_id, question_id, repeat_preference)
                    VALUES (:userId, :questionId, :repeat)
                    ON CONFLICT (user_id, question_id)
                    DO UPDATE SET repeat_preference = EXCLUDED.repeat_preference, updated_at = now()
                    """).param("userId", userId).param("questionId", questionId).param("repeat", change.repeat()).update();
        }
        return state(userId, questionId);
    }

    public State state(long userId, long questionId) {
        String difficulty = jdbc.sql("SELECT difficulty_vote FROM feedback WHERE user_id = :userId AND question_id = :questionId AND category = 'RATING'")
                .param("userId", userId).param("questionId", questionId).query(String.class).optional().orElse(null);
        String repeat = jdbc.sql("SELECT repeat_preference FROM student_question_preferences WHERE user_id = :userId AND question_id = :questionId")
                .param("userId", userId).param("questionId", questionId).query(String.class).optional().orElse("DEFAULT");
        return new State(questionId, difficulty, repeat);
    }

    public List<Long> hiddenIds(long userId) {
        return jdbc.sql("SELECT question_id FROM student_question_preferences WHERE user_id = :userId AND repeat_preference = 'HIDE'")
                .param("userId", userId).query(Long.class).list();
    }

    private void clearDifficulty(long userId, long questionId) {
        jdbc.sql("""
                UPDATE feedback SET difficulty_vote = NULL, updated_at = now()
                WHERE user_id = :userId AND question_id = :questionId AND category = 'RATING' AND difficulty_vote IS NOT NULL
                """).param("userId", userId).param("questionId", questionId).update();
        // Yıldızı ve mesajı olmayan boş değerlendirme satırı kalmaz; yıldız/mesaj varsa korunur.
        jdbc.sql("""
                DELETE FROM feedback WHERE user_id = :userId AND question_id = :questionId AND category = 'RATING'
                  AND difficulty_vote IS NULL AND rating IS NULL AND message IS NULL
                """).param("userId", userId).param("questionId", questionId).update();
    }

    @Transactional(readOnly = true)
    public Summary summary(long userId) {
        return jdbc.sql("""
                SELECT (SELECT count(*) FROM student_question_preferences p JOIN questions q ON q.id = p.question_id AND q.active
                         WHERE p.user_id = :userId AND p.repeat_preference = 'AGAIN') AS again,
                       (SELECT count(*) FROM student_question_preferences p JOIN questions q ON q.id = p.question_id AND q.active
                         WHERE p.user_id = :userId AND p.repeat_preference = 'HIDE') AS hidden,
                       (SELECT count(*) FROM feedback f JOIN questions q ON q.id = f.question_id AND q.active
                         WHERE f.user_id = :userId AND f.category = 'RATING' AND f.difficulty_vote = 'KOLAY') AS easy,
                       (SELECT count(*) FROM feedback f JOIN questions q ON q.id = f.question_id AND q.active
                         WHERE f.user_id = :userId AND f.category = 'RATING' AND f.difficulty_vote = 'ORTA') AS medium,
                       (SELECT count(*) FROM feedback f JOIN questions q ON q.id = f.question_id AND q.active
                         WHERE f.user_id = :userId AND f.category = 'RATING' AND f.difficulty_vote = 'ZOR') AS hard
                """).param("userId", userId).query((rs, n) -> new Summary(rs.getLong("again"), rs.getLong("hidden"),
                rs.getLong("easy"), rs.getLong("medium"), rs.getLong("hard"))).single();
    }

    /**
     * Toplu sıfırlama: yalnız kullanıcının kendi işaretleri silinir. Cevap geçmişi, deneme, yıldız puanı ve mesajlar
     * korunur; kişisel zorluk etiketi kaldırılınca topluluk zorluk sayımından da çıkar (oy öğrencinin kendisine aittir).
     */
    @Transactional
    public Summary reset(long userId, String scope) {
        if (!Set.of("REPEAT", "DIFFICULTY", "ALL").contains(scope == null ? "" : scope)) throw ApiException.badRequest("Sıfırlama kapsamı REPEAT, DIFFICULTY veya ALL olmalı.");
        if (!"DIFFICULTY".equals(scope)) jdbc.sql("DELETE FROM student_question_preferences WHERE user_id = :userId").param("userId", userId).update();
        if (!"REPEAT".equals(scope)) {
            jdbc.sql("UPDATE feedback SET difficulty_vote = NULL, updated_at = now() WHERE user_id = :userId AND category = 'RATING' AND difficulty_vote IS NOT NULL")
                    .param("userId", userId).update();
            jdbc.sql("DELETE FROM feedback WHERE user_id = :userId AND category = 'RATING' AND difficulty_vote IS NULL AND rating IS NULL AND message IS NULL")
                    .param("userId", userId).update();
        }
        return summary(userId);
    }

    @Transactional(readOnly = true)
    public EngineView engineView(long userId) {
        List<Long> hidden = jdbc.sql("SELECT p.question_id FROM student_question_preferences p JOIN questions q ON q.id = p.question_id AND q.active "
                + "WHERE p.user_id = :userId AND p.repeat_preference = 'HIDE' ORDER BY p.question_id").param("userId", userId).query(Long.class).list();
        List<Long> again = jdbc.sql("SELECT q.id FROM questions q WHERE q.active AND " + AGAIN_PENDING + " ORDER BY q.id")
                .param("userId", userId).query(Long.class).list();
        Map<Long, String> difficulty = new LinkedHashMap<>();
        jdbc.sql("SELECT f.question_id, f.difficulty_vote FROM feedback f WHERE f.user_id = :userId AND f.category = 'RATING' AND f.difficulty_vote IS NOT NULL ORDER BY f.question_id")
                .param("userId", userId).query((rs, n) -> { difficulty.put(rs.getLong(1), rs.getString(2)); return 0; }).list();
        return new EngineView(new ArrayList<>(hidden), new ArrayList<>(again), difficulty);
    }
}
