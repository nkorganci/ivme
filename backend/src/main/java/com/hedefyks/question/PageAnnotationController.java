package com.hedefyks.question;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hedefyks.common.ApiException;
import com.hedefyks.topicpdf.TopicPdfService;
import com.hedefyks.user.AppUserDetails;
import com.hedefyks.user.UserRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/page-annotations")
public class PageAnnotationController {
    public record Annotation(int version, JsonNode strokes, JsonNode graph) {}
    public record Save(Integer version, JsonNode strokes, JsonNode graph) {}

    private final JdbcTemplate jdbc;
    private final ObjectMapper json;
    private final QuestionService questions;
    private final TopicPdfService pdfs;
    private final UserRepository users;

    public PageAnnotationController(JdbcTemplate jdbc, ObjectMapper json, QuestionService questions,
                                    TopicPdfService pdfs, UserRepository users) {
        this.jdbc = jdbc;
        this.json = json;
        this.questions = questions;
        this.pdfs = pdfs;
        this.users = users;
    }

    private void validateResource(String type, long id, int page) {
        if (id <= 0 || page <= 0) throw ApiException.badRequest("Sayfa geçersiz.");
        switch (type) {
            case "QUESTION" -> {
                if (page != 1) throw ApiException.badRequest("Soru sayfası geçersiz.");
                questions.findActive(id);
            }
            case "PDF" -> {
                if (id > Integer.MAX_VALUE) throw ApiException.badRequest("PDF geçersiz.");
                var pdf = pdfs.annotationItem((int) id);
                if (pdf.pageCount() != null && page > pdf.pageCount()) {
                    throw ApiException.notFound("PDF sayfası bulunamadı.");
                }
            }
            default -> throw ApiException.badRequest("Kaynak türü geçersiz.");
        }
    }

    @GetMapping("/{type}/{id}/{page}")
    @Transactional(readOnly = true)
    public Annotation get(@PathVariable String type, @PathVariable long id, @PathVariable int page,
                          @AuthenticationPrincipal AppUserDetails me) {
        validateResource(type, id, page);
        return read(me.id(), type, id, page);
    }

    @PutMapping("/{type}/{id}/{page}")
    @Transactional
    public Annotation save(@PathVariable String type, @PathVariable long id, @PathVariable int page,
                           @RequestBody Save request, @AuthenticationPrincipal AppUserDetails me) {
        validateResource(type, id, page);
        if (request == null || request.version() == null || request.version() < 0) {
            throw ApiException.badRequest("Karalama sürümü geçersiz.");
        }
        String value = validateStrokes(request.strokes());
        String graph = request.graph() == null ? null : validateGraph(request.graph());
        users.lockById(me.id()).orElseThrow(() -> ApiException.notFound("Kullanıcı bulunamadı."));
        Annotation current = read(me.id(), type, id, page);
        if (current.version() != request.version()) {
            throw ApiException.conflict("Karalama başka bir oturumda değişti. Çizimini kaybetmeden sunucudaki çizimi yükle.");
        }
        if (graph == null) graph = current.graph().toString();
        if (current.version() == 0) {
            jdbc.update("INSERT INTO page_annotations(user_id, resource_type, resource_id, page_number, strokes_json, graph_json) VALUES (?, ?, ?, ?, ?, ?)",
                    me.id(), type, id, page, value, graph);
        } else {
            jdbc.update("UPDATE page_annotations SET strokes_json = ?, graph_json = ?, version = version + 1, updated_at = now() "
                    + "WHERE user_id = ? AND resource_type = ? AND resource_id = ? AND page_number = ?",
                    value, graph, me.id(), type, id, page);
        }
        return new Annotation(current.version() + 1, request.strokes(), request.graph() == null ? current.graph() : request.graph());
    }

    private Annotation read(long userId, String type, long id, int page) {
        return jdbc.query("SELECT version, strokes_json, graph_json FROM page_annotations WHERE user_id = ? AND resource_type = ? AND resource_id = ? AND page_number = ?",
                rs -> {
                    if (!rs.next()) return new Annotation(0, json.createArrayNode(), defaultGraph());
                    try { return new Annotation(rs.getInt(1), json.readTree(rs.getString(2)), json.readTree(rs.getString(3))); }
                    catch (JsonProcessingException e) { throw new IllegalStateException("Karalama okunamadı.", e); }
                }, userId, type, id, page);
    }

    private JsonNode defaultGraph() {
        return json.createObjectNode().put("open", false).put("xMin", -10).put("xMax", 10)
                .put("yMin", -10).put("yMax", 10);
    }

    private static String validateGraph(JsonNode graph) {
        if (!graph.isObject() || graph.size() != 5 || !graph.path("open").isBoolean()) throw ApiException.badRequest("Grafik ayarı geçersiz.");
        for (String axis : java.util.List.of("xMin", "xMax", "yMin", "yMax")) {
            JsonNode number = graph.path(axis);
            if (!number.isNumber() || !Double.isFinite(number.doubleValue()) || Math.abs(number.doubleValue()) > 1000000) {
                throw ApiException.badRequest("Grafik sınırı geçersiz.");
            }
        }
        if (graph.path("xMin").doubleValue() >= graph.path("xMax").doubleValue()
                || graph.path("yMin").doubleValue() >= graph.path("yMax").doubleValue()) {
            throw ApiException.badRequest("Grafikte alt sınır üst sınırdan küçük olmalıdır.");
        }
        String value = graph.toString();
        if (value.length() > 1024) throw ApiException.badRequest("Grafik ayarı çok büyük.");
        return value;
    }

    private static String validateStrokes(JsonNode strokes) {
        if (strokes == null || !strokes.isArray() || strokes.size() > 100) {
            throw ApiException.badRequest("Karalama en fazla 100 çizgiden oluşabilir.");
        }
        for (JsonNode stroke : strokes) {
            JsonNode points = stroke.isObject() ? stroke.path("points") : stroke;
            if (stroke.isObject() && (stroke.size() != 2 || !java.util.Set.of("BLACK", "RED", "BLUE", "GREEN", "ERASE", "AREA_ERASE")
                    .contains(stroke.path("color").asText())) || !points.isArray() || points.isEmpty() || points.size() > 250) {
                throw ApiException.badRequest("Bir çizgi 1–250 noktadan oluşmalıdır.");
            }
            if (stroke.isObject() && "AREA_ERASE".equals(stroke.path("color").asText()) && points.size() != 2) {
                throw ApiException.badRequest("Silinecek alan iki köşeyle belirtilmelidir.");
            }
            for (JsonNode point : points) {
                if (!point.isArray() || point.size() != 2 || !valid(point.get(0)) || !valid(point.get(1))) {
                    throw ApiException.badRequest("Karalama noktası geçersiz.");
                }
            }
        }
        String value = strokes.toString();
        if (value.length() > 65536) throw ApiException.badRequest("Karalama çok büyük. Birkaç çizgiyi geri al.");
        return value;
    }

    private static boolean valid(JsonNode node) {
        return node.isNumber() && Double.isFinite(node.doubleValue())
                && node.doubleValue() >= 0 && node.doubleValue() <= 1;
    }
}
