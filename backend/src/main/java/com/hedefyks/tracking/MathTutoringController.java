package com.hedefyks.tracking;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hedefyks.common.ApiException;
import com.hedefyks.user.AppUserDetails;
import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/math-tutoring")
public class MathTutoringController {
    public record LessonInput(LocalDate date, LocalTime start, LocalTime end, String topic, String homework,
                              String status, String note, MathLearning learning, Long revision) {}
    public record FileInfo(Long id, String name) {}
    public record LessonChange(Long id, LessonInput lesson) {}
    public record Lesson(Long id, LocalDate date, LocalTime start, LocalTime end, String topic, String homework,
                         String status, String note, List<FileInfo> files, MathLearning learning, Long revision) {}
    private record StoredFile(String name, String type, byte[] content) {}

    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;
    private final com.hedefyks.review.ReviewCatalog vocabulary;

    public MathTutoringController(JdbcTemplate jdbc, ObjectMapper mapper,com.hedefyks.review.ReviewCatalog vocabulary) { this.jdbc = jdbc; this.mapper = mapper;this.vocabulary=vocabulary; }

    @GetMapping
    public List<Lesson> list(@AuthenticationPrincipal AppUserDetails me) {
        return jdbc.query("""
                SELECT id, lesson_date, start_time, end_time, topic, homework, status, note, learning, revision
                FROM math_tutoring_lessons WHERE user_id = ? ORDER BY lesson_date, start_time, id
                """, (rs, n) -> lesson(rs), me.id());
    }

    @PostMapping
    @Transactional
    public Lesson create(@AuthenticationPrincipal AppUserDetails me, @RequestBody LessonInput input) {
        LessonInput checked = validate(input);
        Long id = jdbc.queryForObject("""
                INSERT INTO math_tutoring_lessons(user_id, lesson_date, start_time, end_time, topic, homework, status, note, learning)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?::jsonb) RETURNING id
                """, Long.class, me.id(), checked.date(), checked.start(), checked.end(), checked.topic(),
                checked.homework(), checked.status(), checked.note(), encodeLearning(checked.learning()));
        return get(me.id(), id);
    }

    @PatchMapping("/{id}")
    @Transactional
    public Lesson update(@AuthenticationPrincipal AppUserDetails me, @PathVariable Long id,
                         @RequestBody LessonInput input) {
        LessonInput checked = validate(input);
        get(me.id(), id);
        if (checked.revision() == null || checked.revision() < 1)
            throw ApiException.badRequest("Ders sürümü gerekli.");
        int count = jdbc.update("""
                UPDATE math_tutoring_lessons SET lesson_date = ?, start_time = ?, end_time = ?,
                    topic = ?, homework = ?, status = ?, note = ?, learning = COALESCE(?::jsonb, learning),
                    revision = revision + 1 WHERE id = ? AND user_id = ? AND revision = ?
                """, checked.date(), checked.start(), checked.end(), checked.topic(), checked.homework(),
                checked.status(), checked.note(), encodeLearning(checked.learning()), id, me.id(), checked.revision());
        if (count == 0) {
            get(me.id(), id);
            throw ApiException.conflict("Ders başka bir oturumda değişti. Taslağınızı koruyarak sayfayı yenileyin.");
        }
        return get(me.id(), id);
    }

    @PostMapping("/bulk")
    @Transactional
    public List<Lesson> saveAll(@AuthenticationPrincipal AppUserDetails me, @RequestBody List<LessonChange> changes) {
        if (changes == null || changes.isEmpty() || changes.size() > 1000)
            throw ApiException.badRequest("1 ile 1000 arasında ders kaydedebilirsiniz.");
        var ids = new HashSet<Long>();
        for (LessonChange change : changes) {
            if (change == null) throw ApiException.badRequest("Ders kaydı geçersiz.");
            validate(change.lesson());
            if (change.id() != null) {
                if (change.id() <= 0 || !ids.add(change.id())) throw ApiException.badRequest("Ders kimliği geçersiz veya tekrarlı.");
                get(me.id(), change.id());
            }
        }
        var saved = new ArrayList<Lesson>();
        for (LessonChange change : changes)
            saved.add(change.id() == null ? create(me, change.lesson()) : update(me, change.id(), change.lesson()));
        // Each result is read back from the database; Spring commits the whole batch before responding.
        return saved;
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal AppUserDetails me, @PathVariable Long id) {
        if (jdbc.update("DELETE FROM math_tutoring_lessons WHERE id = ? AND user_id = ?", id, me.id()) == 0)
            throw ApiException.notFound("Ders bulunamadı.");
        return ResponseEntity.noContent().build();
    }

    @PostMapping(path = "/{id}/files", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Transactional
    public Lesson upload(@AuthenticationPrincipal AppUserDetails me, @PathVariable Long id,
                         @RequestParam("file") MultipartFile file) throws IOException {
        get(me.id(), id);
        if (file.isEmpty()) throw ApiException.badRequest("Dosya boş.");
        String name = file.getOriginalFilename() == null ? "dosya" : file.getOriginalFilename()
                .replace('\\', '/');
        name = name.substring(name.lastIndexOf('/') + 1).trim();
        if (name.isEmpty()) name = "dosya";
        if (name.length() > 255) throw ApiException.badRequest("Dosya adı çok uzun.");
        String type = file.getContentType() == null ? "application/octet-stream" : file.getContentType();
        if (type.length() > 255) type = "application/octet-stream";
        jdbc.update("INSERT INTO math_tutoring_files(lesson_id, original_name, content_type, content) VALUES (?, ?, ?, ?)",
                id, name, type, file.getBytes());
        return get(me.id(), id);
    }

    @GetMapping("/{id}/files/{fileId}")
    public ResponseEntity<byte[]> download(@AuthenticationPrincipal AppUserDetails me, @PathVariable Long id,
                                           @PathVariable Long fileId) {
        List<StoredFile> found = jdbc.query("""
                SELECT f.original_name, f.content_type, f.content FROM math_tutoring_files f
                JOIN math_tutoring_lessons l ON l.id = f.lesson_id
                WHERE l.id = ? AND l.user_id = ? AND f.id = ?
                """, (rs, n) -> new StoredFile(rs.getString(1), rs.getString(2), rs.getBytes(3)), id, me.id(), fileId);
        StoredFile file = found.stream().findFirst().orElseThrow(() -> ApiException.notFound("Dosya bulunamadı."));
        String encoded = URLEncoder.encode(file.name(), StandardCharsets.UTF_8).replace("+", "%20");
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename*=UTF-8''" + encoded)
                .contentType(MediaType.APPLICATION_OCTET_STREAM).body(file.content());
    }

    @DeleteMapping("/{id}/files/{fileId}")
    public ResponseEntity<Void> deleteFile(@AuthenticationPrincipal AppUserDetails me, @PathVariable Long id,
                                           @PathVariable Long fileId) {
        int count = jdbc.update("""
                DELETE FROM math_tutoring_files WHERE id = ? AND lesson_id = ?
                AND EXISTS (SELECT 1 FROM math_tutoring_lessons WHERE id = ? AND user_id = ?)
                """, fileId, id, id, me.id());
        if (count == 0) throw ApiException.notFound("Dosya bulunamadı.");
        return ResponseEntity.noContent().build();
    }

    private Lesson get(Long userId, Long id) {
        return jdbc.query("""
                SELECT id, lesson_date, start_time, end_time, topic, homework, status, note, learning, revision
                FROM math_tutoring_lessons WHERE id = ? AND user_id = ?
                """, (rs, n) -> lesson(rs), id, userId).stream().findFirst()
                .orElseThrow(() -> ApiException.notFound("Ders bulunamadı."));
    }

    private Lesson lesson(ResultSet rs) throws SQLException {
        long id = rs.getLong("id");
        List<FileInfo> files = jdbc.query("SELECT id, original_name FROM math_tutoring_files WHERE lesson_id = ? ORDER BY id",
                (file, n) -> new FileInfo(file.getLong(1), file.getString(2)), id);
        return new Lesson(id, rs.getObject("lesson_date", LocalDate.class), rs.getObject("start_time", LocalTime.class),
                rs.getObject("end_time", LocalTime.class), rs.getString("topic"), rs.getString("homework"),
                rs.getString("status"), rs.getString("note"), files, decodeLearning(rs.getString("learning")), rs.getLong("revision"));
    }

    private String encodeLearning(MathLearning learning) {
        if (learning == null) return null;
        try { return mapper.writeValueAsString(learning); }
        catch (JsonProcessingException e) { throw ApiException.badRequest("Takip bilgileri işlenemedi."); }
    }

    private MathLearning decodeLearning(String value) {
        if (value == null) return null;
        try { return mapper.readValue(value, MathLearning.class); }
        catch (JsonProcessingException e) { throw new IllegalStateException("Takip bilgileri okunamadı.", e); }
    }

    private LessonInput validate(LessonInput input) {
        if (input == null || input.date() == null || input.start() == null || input.end() == null
                || !input.end().isAfter(input.start())) throw ApiException.badRequest("Tarih ve geçerli saat aralığı gerekli.");
        String topic = input.topic() == null ? "" : input.topic().trim();
        String homework = input.homework() == null ? "" : input.homework().trim();
        String note = input.note() == null ? "" : input.note().trim();
        if (topic.length() > 1000 || homework.length() > 2000 || note.length() > 2000)
            throw ApiException.badRequest("Konu, ödev veya not metni çok uzun.");
        if (input.status() == null || !List.of("PLANNED", "COMPLETED", "CANCELLED").contains(input.status()))
            throw ApiException.badRequest("Ders durumu geçersiz.");
        var learning=input.learning()==null?null:input.learning().checked();
        if(learning!=null && learning.categoryId()!=null && !learning.categoryId().isBlank()) {
            String branch="GEOMETRY".equals(learning.branch())?"geometri":"matematik";
            if(vocabulary.categories().stream().noneMatch(c->learning.categoryId().equals(c.get("id")) && learning.examType().equals(c.get("exam")) && branch.equals(c.get("subjectId"))))
                throw ApiException.badRequest("Seçilen ortak konu sınav/branş kapsamıyla uyuşmuyor.");
        }
        if(learning!=null)for(String key:learning.resourceKeys())
            if(learning.categoryId().isBlank() || jdbc.queryForObject("SELECT count(*) FROM learning_catalog.current_assignments WHERE item_key=? AND category_id=?",Long.class,key,learning.categoryId())==0)
                throw ApiException.badRequest("Bağlanan kaynak seçilen ortak konuya ait değil.");
        return new LessonInput(input.date(), input.start(), input.end(), topic, homework, input.status(), note,learning,input.revision());
    }
}
