package com.hedefyks.examtrack;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hedefyks.common.ApiException;
import com.hedefyks.user.AppUserDetails;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Sınav hedefleri (YKS, KPSS türleri) ve öğrencinin hesabına kayıtlı seçimi. */
@RestController
@RequestMapping("/api/exam-tracks")
public class ExamTrackController {
    public record Track(String id, String family, String name, String audience, String status,
                        String summary, String note, JsonNode sections) {}
    public record Tracks(List<Track> tracks, String currentId) {}
    public record Selection(String trackId) {}

    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;

    public ExamTrackController(JdbcTemplate jdbc, ObjectMapper mapper) {
        this.jdbc = jdbc;
        this.mapper = mapper;
    }

    @GetMapping
    public Tracks list(@AuthenticationPrincipal AppUserDetails me) {
        List<Track> tracks = jdbc.query("""
                SELECT id, family, name, audience, status, summary, note, sections::text
                FROM exam_tracks ORDER BY sort_order
                """, (rs, row) -> new Track(rs.getString(1), rs.getString(2), rs.getString(3), rs.getString(4),
                rs.getString(5), rs.getString(6), rs.getString(7), sections(rs.getString(8))));
        String saved = jdbc.query("SELECT track_id FROM user_exam_tracks WHERE user_id = ?",
                (rs, row) -> rs.getString(1), me.id()).stream().findFirst().orElse(null);
        String current = tracks.stream().filter(t -> t.id().equals(saved) && !"PLANNED".equals(t.status()))
                .map(Track::id).findFirst()
                .orElseGet(() -> tracks.stream().filter(t -> "ACTIVE".equals(t.status())).map(Track::id)
                        .findFirst().orElseThrow(() -> new IllegalStateException("Etkin sınav tanımı yok.")));
        return new Tracks(tracks, current);
    }

    @PutMapping("/current")
    @Transactional
    public Tracks select(@AuthenticationPrincipal AppUserDetails me, @RequestBody Selection input) {
        if (input == null || input.trackId() == null) throw ApiException.badRequest("Sınav seçimi geçersiz.");
        String status = jdbc.query("SELECT status FROM exam_tracks WHERE id = ?",
                (rs, row) -> rs.getString(1), input.trackId()).stream().findFirst()
                .orElseThrow(() -> ApiException.badRequest("Sınav seçimi geçersiz."));
        if ("PLANNED".equals(status)) throw ApiException.badRequest("Bu sınav henüz hazır değil.");
        jdbc.update("""
                INSERT INTO user_exam_tracks(user_id, track_id) VALUES (?, ?)
                ON CONFLICT (user_id) DO UPDATE SET track_id = EXCLUDED.track_id, updated_at = now()
                WHERE user_exam_tracks.track_id IS DISTINCT FROM EXCLUDED.track_id
                """, me.id(), input.trackId());
        return list(me);
    }

    private JsonNode sections(String value) {
        try { return mapper.readTree(value); }
        catch (JsonProcessingException error) { throw new IllegalStateException(error); }
    }
}
