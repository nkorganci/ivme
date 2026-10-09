package com.hedefyks.question;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hedefyks.common.ApiException;
import com.hedefyks.user.UserRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Öğrencinin her soruya ait sınırlı vektör çizimi. */
@Service
public class BoardService {
    public record Board(int version, JsonNode strokes) {}
    public record SaveBoard(Integer version, JsonNode strokes) {}

    private final JdbcTemplate jdbc;
    private final ObjectMapper json;
    private final QuestionService questions;
    private final UserRepository users;

    public BoardService(JdbcTemplate jdbc, ObjectMapper json, QuestionService questions, UserRepository users) {
        this.jdbc = jdbc;
        this.json = json;
        this.questions = questions;
        this.users = users;
    }

    @Transactional(readOnly = true)
    public Board get(Long questionId, Long userId) {
        questions.findActive(questionId);
        return read(questionId, userId);
    }

    @Transactional
    public Board save(Long questionId, Long userId, SaveBoard request) {
        questions.findActive(questionId);
        if (request == null || request.version() == null || request.version() < 0) {
            throw ApiException.badRequest("Karalama sürümü geçersiz.");
        }
        String strokes = validate(request.strokes());
        // Aynı öğrencinin iki cihazından gelen ilk kayıtlar dahil yazmaları sırala.
        users.lockById(userId).orElseThrow(() -> ApiException.notFound("Kullanıcı bulunamadı."));
        Board current = read(questionId, userId);
        if (current.version() != request.version()) {
            throw ApiException.conflict("Karalama başka bir oturumda değişti. Çizimini kaybetmeden sayfayı yenile.");
        }
        if (current.version() == 0) {
            jdbc.update("INSERT INTO question_boards(user_id, question_id, strokes_json) VALUES (?, ?, ?)",
                    userId, questionId, strokes);
        } else {
            jdbc.update("UPDATE question_boards SET strokes_json = ?, version = version + 1, updated_at = now() "
                    + "WHERE user_id = ? AND question_id = ?", strokes, userId, questionId);
        }
        return new Board(current.version() + 1, request.strokes());
    }

    private Board read(Long questionId, Long userId) {
        return jdbc.query("SELECT version, strokes_json FROM question_boards WHERE user_id = ? AND question_id = ?",
                rs -> {
                    if (!rs.next()) return new Board(0, json.createArrayNode());
                    try {
                        return new Board(rs.getInt(1), json.readTree(rs.getString(2)));
                    } catch (JsonProcessingException e) {
                        throw new IllegalStateException("Karalama verisi okunamadı.", e);
                    }
                }, userId, questionId);
    }

    private String validate(JsonNode strokes) {
        if (strokes == null || !strokes.isArray() || strokes.size() > 100) {
            throw ApiException.badRequest("Karalama en fazla 100 çizgiden oluşabilir.");
        }
        for (JsonNode stroke : strokes) {
            if (!stroke.isArray() || stroke.isEmpty() || stroke.size() > 250) {
                throw ApiException.badRequest("Bir çizgi 1–250 noktadan oluşmalıdır.");
            }
            for (JsonNode point : stroke) {
                if (!point.isArray() || point.size() != 2 || !validCoordinate(point.get(0))
                        || !validCoordinate(point.get(1))) {
                    throw ApiException.badRequest("Karalama noktası geçersiz.");
                }
            }
        }
        String value = strokes.toString();
        if (value.length() > 65536) {
            throw ApiException.badRequest("Karalama çok büyük. Birkaç çizgiyi geri al.");
        }
        return value;
    }

    private static boolean validCoordinate(JsonNode coordinate) {
        return coordinate.isNumber() && Double.isFinite(coordinate.doubleValue())
                && coordinate.doubleValue() >= 0 && coordinate.doubleValue() <= 1;
    }
}
