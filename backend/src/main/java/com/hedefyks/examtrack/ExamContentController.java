package com.hedefyks.examtrack;

import com.hedefyks.common.ApiException;
import com.hedefyks.review.LearningLabelStore;
import com.hedefyks.user.AppUserDetails;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

/** Seçili sınavın DB kataloğundan soru dağılımı ve kaynak envanteri. */
@RestController
@RequestMapping("/api/exam-content")
public class ExamContentController {
    private final JdbcTemplate jdbc;
    private final ExamTrackService tracks;
    private final LearningLabelStore labels;
    private final com.hedefyks.review.ContentReviewService reviews;
    private final com.fasterxml.jackson.databind.ObjectMapper json;
    private final Path yurtDisiRoot;

    public ExamContentController(JdbcTemplate jdbc,ExamTrackService tracks,LearningLabelStore labels,
            com.hedefyks.review.ContentReviewService reviews,com.fasterxml.jackson.databind.ObjectMapper json,
            @Value("${app.topic-pdfs.source-dir:}") String ogmRoot,
            @Value("${app.yurt-disi.source-dir:}") String root) {
        this.jdbc=jdbc;this.tracks=tracks;this.labels=labels;this.reviews=reviews;this.json=json;
        this.yurtDisiRoot=!root.isBlank()?Path.of(root).toAbsolutePath().normalize()
            : ogmRoot.isBlank()?null:Path.of(ogmRoot).toAbsolutePath().normalize().resolveSibling("yurt-disi");
    }

    @GetMapping
    @Transactional(readOnly=true,isolation=org.springframework.transaction.annotation.Isolation.REPEATABLE_READ)
    public Map<String,Object> content(@AuthenticationPrincipal AppUserDetails me) throws com.fasterxml.jackson.core.JsonProcessingException {
        var track=tracks.current(me.id());
        var categories=com.hedefyks.review.CurriculumNavigation.selections(labels.curriculumNavigation(),labels.categories())
            .stream().filter(c->tracks.includesCategoryExam(c.get("exam"),track.examTypes()))
            .filter(c->Boolean.TRUE.equals(c.get("canonicalUnit")) && !Boolean.FALSE.equals(c.get("selectable")))
            .sorted(Comparator.comparingInt(c->((Number)c.getOrDefault("order",0)).intValue())).toList();
        var counts=new HashMap<String,Map<Integer,Long>>();
        jdbc.query("""
            WITH overrides AS (
              SELECT * FROM jsonb_to_recordset(?::jsonb) AS o(item_key text,labels jsonb,status text)
            )
            SELECT a->>'categoryId',q.exam_year,count(DISTINCT q.id) AS questions
            FROM learning_catalog.current_items i
            JOIN questions q ON q.code=i.question_code
            LEFT JOIN overrides o USING(item_key)
            CROSS JOIN LATERAL jsonb_array_elements(coalesce(o.labels,i.data->'automaticLabels')->'assignments') a
            WHERE q.active AND i.student_visible AND q.exam_year IS NOT NULL
              AND i.source_stamp=extract(epoch from q.updated_at)::text
              AND q.exam_type=ANY(string_to_array(?,','))
              AND coalesce(o.status,'PENDING')<>'REMOVE' AND a->>'relation'<>'PREREQUISITE'
            GROUP BY a->>'categoryId',q.exam_year
            """,rs->{counts.computeIfAbsent(rs.getString(1),id->new TreeMap<>()).put(rs.getInt(2),rs.getLong(3));},
            json.writeValueAsString(reviews.studentOverrides()),
            track.examTypes().stream().map(Enum::name).collect(java.util.stream.Collectors.joining(",")));
        var years=new TreeSet<Integer>();
        categories.forEach(c->years.addAll(counts.getOrDefault(c.get("id").toString(),Map.of()).keySet()));
        var rows=new ArrayList<Map<String,Object>>();
        for(var category:categories) {
            var row=new LinkedHashMap<>(category);
            var byYear=counts.getOrDefault(category.get("id").toString(),Map.of());
            row.put("yearCounts",byYear);row.put("total",byYear.values().stream().mapToLong(Long::longValue).sum());
            rows.add(row);
        }
        var docs=jdbc.query("""
            SELECT path,role,status,question_count,active_count,page_count,expected_count,missing_numbers,unanswered_numbers,note
            FROM exam_source_documents WHERE track_id=? ORDER BY path
            """,(rs,n)->{
                var row=new LinkedHashMap<String,Object>();
                row.put("path",rs.getString(1));row.put("role",rs.getString(2));row.put("status",rs.getString(3));
                row.put("questionCount",rs.getInt(4));row.put("activeCount",rs.getInt(5));
                row.put("pageCount",rs.getObject(6));row.put("expectedCount",rs.getObject(7));
                row.put("missingNumbers",Arrays.asList((Integer[])rs.getArray(8).getArray()));
                row.put("unansweredNumbers",Arrays.asList((Integer[])rs.getArray(9).getArray()));row.put("note",rs.getString(10));
                return row;
            },track.id());
        return Map.of("trackId",track.id(),"years",years,"distribution",rows,"documents",docs);
    }

    @GetMapping("/document")
    public ResponseEntity<Resource> document(@AuthenticationPrincipal AppUserDetails me,@RequestParam String path) throws java.io.IOException {
        if(!"YURT_DISI_OGRETMEN".equals(tracks.trackId(me.id())) || yurtDisiRoot==null
                || jdbc.queryForObject("SELECT count(*) FROM exam_source_documents WHERE track_id=? AND path=?",Integer.class,
                    tracks.trackId(me.id()),path)!=1) throw ApiException.notFound("Bu sınavda PDF bulunamadı.");
        Path file=yurtDisiRoot.resolve(path).normalize();
        if(!file.startsWith(yurtDisiRoot) || !Files.isRegularFile(file)
                || !file.toRealPath().startsWith(yurtDisiRoot.toRealPath())) throw ApiException.notFound("PDF bulunamadı.");
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_PDF).cacheControl(CacheControl.noStore())
            .header(HttpHeaders.CONTENT_DISPOSITION,ContentDisposition.inline().filename(file.getFileName().toString(),java.nio.charset.StandardCharsets.UTF_8).build().toString())
            .body(new FileSystemResource(file));
    }
}
