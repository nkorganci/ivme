package com.hedefyks.review;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hedefyks.common.ApiException;
import com.hedefyks.storage.ImageStorage;
import com.hedefyks.topicpdf.TopicPdfService;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Isolation;

@Service
@Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
public class ContentReviewService {
    private static final Set<String> VERDICTS = Set.of("APPROVE", "FIX", "WRONG_BRANCH", "REMOVE", "UNSURE");
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;
    private final TopicPdfService pdfs;
    private final ImageStorage images;
    private final List<Map<String, Object>> catalog;
    private final ReviewCatalog vocabulary;
    private final PdfReviewLabels pdfLabels;
    private final LearningLabelStore learningLabels;

    public ContentReviewService(JdbcTemplate jdbc, ObjectMapper json, TopicPdfService pdfs, ImageStorage images, ReviewCatalog vocabulary, PdfReviewLabels pdfLabels, LearningLabelStore learningLabels) {
        this.jdbc = jdbc; this.json = json; this.pdfs = pdfs; this.images = images;
        this.vocabulary = vocabulary; this.catalog = vocabulary.items();
        this.pdfLabels = pdfLabels;
        this.learningLabels = learningLabels;
    }
    public Map<String, Object> catalog() { return vocabulary.metadata(); }

    private List<Map<String, Object>> sourceItems() {
        var all = new ArrayList<Map<String, Object>>(catalog);
        var stored = learningLabels.reviewItems();
        all.addAll(pdfLabels.items());
        all.replaceAll(source -> {
            var item = new LinkedHashMap<>(source);
            item.remove("automaticLabels");
            var labelledItem = stored.remove(source.get("key"));
            if (labelledItem != null) item.put("automaticLabels", labelledItem.get("automaticLabels"));
            return item;
        });
        // Retain source-only cards in the teacher queue, without adding unusable questions to student practice.
        all.addAll(stored.values());
        var labelledIds = all.stream().filter(i -> "PDF".equals(i.get("kind")) && i.get("catalogId") instanceof Number)
            .map(i -> ((Number)i.get("catalogId")).intValue()).collect(java.util.stream.Collectors.toSet());
        // Include unavailable PDFs as review candidates instead of silently losing them.
        for (int page = 0; ; page++) {
            var batch = pdfs.list(null, null, null, null, null, page, 50);
            for (var pdf : batch.content()) {
                if (labelledIds.contains(pdf.id())) continue;
                var item = new LinkedHashMap<String, Object>();
                item.put("key", "pdf:" + pdf.id()); item.put("kind", "PDF");
                item.put("exam", pdf.exam()); item.put("subject", pdf.subject()); item.put("subjectId", vocabulary.subjectId(pdf.subject()));
                item.put("grade", pdf.grade());
                item.put("topic", ""); item.put("subtopic", ""); item.put("title", pdf.title());
                item.put("source", pdf.kind()); item.put("catalogId", pdf.id());
                item.put("availability", pdf.status()); item.put("pageCount", pdf.pageCount());
                item.put("sourceSha256", pdfs.reviewSourceSha256(pdf.id()));
                item.put("url", "/api/operator/content-review/pdf/" + pdf.id());
                // Preserve existing explicit curriculum mappings; an unmapped PDF stays unmapped.
                for (String exam : List.of("TYT", "AYT")) {
                    for (var link : pdfs.reviewCurriculumLinks(exam, pdf.subject())) if (link.id() == pdf.id()) {
                        var parent = catalog.stream().filter(i -> link.topicId().equals(i.get("topicId"))
                                && "".equals(i.get("subtopic"))).findFirst();
                        parent.ifPresent(p -> { item.put("topic", p.get("topic")); item.put("topicId", p.get("topicId")); });
                    }
                }
                all.add(item);
            }
            if (page + 1 >= batch.totalPages()) break;
        }
        return all;
    }

    private List<Map<String, Object>> questionItems(String subject, Set<String> extraKeys, String key) {
        var args = new ArrayList<Object>();
        String where = "1=1";
        if (key != null) { where = "code=?"; args.add(key.substring("question:".length())); }
        else if(subject==null && !extraKeys.isEmpty()) {
            var codes=extraKeys.stream().filter(k->k.startsWith("question:")).map(k->k.substring(9)).toList();
            where="code IN ("+String.join(",",Collections.nCopies(codes.size(),"?"))+")";args.addAll(codes);
        }
        else if (subject != null && !subject.equals("all")) {
            var aliases = ReviewCatalog.ALIASES.getOrDefault(subject, List.of("__unmapped__"));
            where = "(subject IN (" + String.join(",", Collections.nCopies(aliases.size(), "?")) + ") OR ?=ANY(l.subject_ids)";
            args.addAll(aliases);
            args.add(subject);
            var questionKeys = extraKeys.stream().filter(k -> k.startsWith("question:")).map(k -> k.substring(9)).toList();
            if (!questionKeys.isEmpty()) { where += " OR code IN (" + String.join(",", Collections.nCopies(questionKeys.size(), "?")) + ")"; args.addAll(questionKeys); }
            where += ")";
        }
        return jdbc.query("""
                SELECT q.id, q.code, q.bank, q.exam_type, q.subject, q.topic, q.source, q.correct_answer, q.choice_count,
                       q.image, q.solution_image, q.solution_url, q.active, q.updated_at,
                       CASE WHEN l.source_stamp=extract(epoch from q.updated_at)::text THEN l.data->'automaticLabels' END AS automatic_labels
                FROM questions q LEFT JOIN learning_catalog.current_items l ON l.item_key='question:'||q.code WHERE
                """ + where + " ORDER BY bank, exam_type, topic, code", (rs, n) -> {
            var item = new LinkedHashMap<String, Object>();
            item.put("key", "question:" + rs.getString("code")); item.put("kind", "QUESTION");
            item.put("questionId", rs.getLong("id")); item.put("title", rs.getString("code"));
            item.put("bank", rs.getString("bank")); item.put("exam", rs.getString("exam_type"));
            item.put("subject", rs.getString("subject")); item.put("topic", rs.getString("topic"));
            item.put("subjectId", vocabulary.subjectId(rs.getString("subject")));
            item.put("subtopic", ""); item.put("source", rs.getString("source"));
            item.put("correctAnswer", rs.getString("correct_answer")); item.put("choiceCount", rs.getInt("choice_count"));
            item.put("image", rs.getString("image")); item.put("solutionImage", rs.getString("solution_image"));
            item.put("solutionUrl", rs.getString("solution_url")); item.put("active", rs.getBoolean("active"));
            item.put("updatedAt", rs.getTimestamp("updated_at").toInstant().toString());
            if (rs.getString("automatic_labels") != null) item.put("automaticLabels", learningLabels.parse(rs.getString("automatic_labels")));
            return item;
        }, args.toArray());
    }

    private Map<String, Object> review(java.sql.ResultSet rs) throws java.sql.SQLException {
        var row = new LinkedHashMap<String, Object>();
        row.put("key", rs.getString("item_key")); row.put("revision", rs.getInt("revision"));
        row.put("reviewer", rs.getString("username")); row.put("reviewerId", rs.getLong("reviewer_id"));
        row.put("decision", parse(rs.getString("decision"))); row.put("snapshot", parse(rs.getString("snapshot")));
        row.put("fingerprint", rs.getString("fingerprint")); row.put("savedAt", rs.getTimestamp("saved_at").toInstant().toString());
        return row;
    }
    private List<Map<String, Object>> reviews(String table) {
        return jdbc.query("SELECT r.*, u.username FROM " + table + " r JOIN users u ON u.id=r.reviewer_id ORDER BY r.saved_at, r.revision",
                (rs, n) -> review(rs));
    }
    private Map<String, Map<String, Object>> latest() {
        var map = new HashMap<String, Map<String, Object>>();
        reviews("content_reviews").forEach(r -> map.put(r.get("key").toString(), r));
        return map;
    }
    @SuppressWarnings("unchecked")
    private String status(Map<String, Object> item, Map<String, Object> review) {
        if (review == null) return "PENDING";
        var snapshot = new LinkedHashMap<>((Map<String, Object>) review.get("snapshot"));
        snapshot.remove("contentSha256"); snapshot.remove("solutionSha256");
        if (!hash(snapshot).equals(hash(item))) return "STALE";
        return ((Map<String, Object>) review.get("decision")).get("verdict").toString();
    }
    @SuppressWarnings("unchecked")
    private String status(Map<String,Object> item, Map<String,Object> review, Map<String,Map<String,Object>> categories) {
        if (review != null) {
            var decision = (Map<String,Object>)review.get("decision");
            var saved = (List<Map<String,Object>>)decision.getOrDefault("categorySnapshot",List.of());
            if (!decision.containsKey("categorySnapshot") || saved.stream().anyMatch(c -> !hash(c).equals(hash(categories.get(c.get("id")))))) return "STALE";
        }
        return status(item, review);
    }
    private Map<String,Map<String,Object>> categoryMap() {
        var map = new HashMap<String,Map<String,Object>>(); vocabulary.categories().forEach(c -> map.put(c.get("id").toString(),c)); return map;
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> list(String subject, String kind, String exam, String topic, String status, String query, String bank,
                                    String difficulty, String contentFormat, String skill, String labelState, int page) {
        if ((!"all".equals(subject) && !ReviewCatalog.ALIASES.containsKey(subject)) || !ReviewCatalog.LABELS.get("kinds").containsKey(kind) || query.length() > 100
                || !Set.of("", "LABELLED", "UNLABELLED", "PHYSICS_REVIEW", "ESTIMATED").contains(labelState))
            throw ApiException.badRequest("Denetim filtresi geçersiz.");
        var reviews = latest();
        var categories = vocabulary.categories();
        var categoryMap = new HashMap<String, Map<String, Object>>(); categories.forEach(c -> categoryMap.put(c.get("id").toString(), c));
        var extraKeys = new HashSet<String>();
        reviews.forEach((key, review) -> {
            var decision = (Map<String, Object>) review.get("decision");
            for (var assignment : (List<Map<String, Object>>)decision.getOrDefault("assignments", List.of())) {
                var category = categoryMap.get(assignment.get("categoryId"));
                if (category != null && subject.equals(category.get("subjectId"))) extraKeys.add(key);
            }
        });
        var all = new ArrayList<Map<String, Object>>();
        if (kind.equals("QUESTION") && !bank.equals("NOTE")) all.addAll(questionItems(subject, extraKeys, null));
        all.addAll(sourceItems().stream().filter(i -> subject.equals("all") || subject.equals(i.get("subjectId")) || extraKeys.contains(i.get("key"))
                || matchesAssignment(i, reviews, categoryMap, "subjectId", subject)
                || ("geometri".equals(subject) && "PDF".equals(i.get("kind")) && "matematik".equals(i.get("subjectId")))
                || (Set.of("psikoloji","sosyoloji","mantik").contains(subject) && "PDF".equals(i.get("kind")) && "felsefe".equals(i.get("subjectId")))).toList());
        if (kind.equals("PDF")) all.sort(Comparator.<Map<String,Object>, String>comparing(i ->
                subject.equals("all") ? i.get("subjectId").toString() : subject.equals(i.get("subjectId")) ? "0" : "1")
                .thenComparing(i -> i.get("title").toString(), String.CASE_INSENSITIVE_ORDER));
        var scoped = all.stream().filter(i -> kind.equals(i.get("kind")))
                .filter(i -> !"TOPIC".equals(kind) || !Boolean.FALSE.equals(categoryMap.getOrDefault(
                    Objects.toString(i.getOrDefault("categoryId",i.get("topicId")),""),Map.of()).get("selectable")))
                .filter(i -> exam.isBlank() || exam.equals(i.get("exam")) || "TYT-AYT".equals(i.get("exam")) || matchesAssignment(i, reviews, categoryMap, "exam", exam))
                .filter(i -> topic.isBlank() || topic.equals(i.get("topic")) || matchesAssignment(i, reviews, categoryMap, "topic", topic))
                .filter(i -> bank.isBlank() || bank.equals(i.get("bank")))
                .filter(i -> labelMatches(i, reviews, "difficulty", difficulty) && labelMatches(i, reviews, "contentFormat", contentFormat) && labelMatches(i, reviews, "skills", skill))
                .filter(i -> labelState.isBlank() || ("ESTIMATED".equals(labelState) ? estimatedLabels(i,reviews.get(i.get("key"))) : "PHYSICS_REVIEW".equals(labelState)
                    ? physicsSelectionRequired(i,reviews.get(i.get("key")),categoryMap)
                    : ("UNLABELLED".equals(labelState) == ((List<?>)effectiveLabels(i, reviews.get(i.get("key"))).getOrDefault("assignments", List.of())).isEmpty())))
                .filter(i -> query.isBlank() || (i.get("title") + " " + i.get("topic") + " " + i.get("source") + " " + i.get("subtopic"))
                        .toLowerCase(Locale.forLanguageTag("tr-TR")).contains(query.toLowerCase(Locale.forLanguageTag("tr-TR"))))
                .toList();
        var counts = new LinkedHashMap<String, Long>();
        scoped.forEach(i -> counts.merge(status(i, reviews.get(i.get("key")), categoryMap), 1L, Long::sum));
        var matched = scoped.stream().filter(i -> status.isBlank() || status.equals(status(i, reviews.get(i.get("key")), categoryMap))).toList();
        int pageNumber = Math.max(0, page), start = (int) Math.min((long) pageNumber * 25, matched.size());
        var rows = matched.subList(start, Math.min(start + 25, matched.size())).stream().map(i -> {
            var row = new LinkedHashMap<>(i); row.remove("image"); row.remove("solutionImage");
            row.put("reviewStatus", status(i, reviews.get(i.get("key")), categoryMap));
            var review = reviews.get(i.get("key"));
            row.put("labels", effectiveLabels(i, review));
            if("PDF".equals(i.get("kind"))) row.put("displayTitle",ResourcePresentation.title(i,
                (List<Map<String,Object>>)effectiveLabels(i,review).getOrDefault("assignments",List.of()),categoryMap));
            row.put("labelOrigin", review == null && i.containsKey("automaticLabels") ? ((Map<?,?>)i.get("automaticLabels")).get("provenance") : review == null ? "NONE" : "TEACHER");
            return row;
        }).toList();
        var topics = categories.stream().filter(c -> !Boolean.FALSE.equals(c.get("selectable")))
                .filter(c -> subject.equals("all") || subject.equals(c.get("subjectId"))).toList();
        return Map.of("content", rows, "page", pageNumber, "totalPages", (matched.size() + 24) / 25,
                "totalElements", matched.size(), "counts", counts, "topics", topics,
                "labelCounts", Map.of("labelled", scoped.stream().filter(i -> !((List<?>)effectiveLabels(i, reviews.get(i.get("key"))).getOrDefault("assignments", List.of())).isEmpty()).count(),
                                      "unlabelled", scoped.stream().filter(i -> ((List<?>)effectiveLabels(i, reviews.get(i.get("key"))).getOrDefault("assignments", List.of())).isEmpty()).count()));
    }

    @SuppressWarnings("unchecked")
    private boolean labelMatches(Map<String,Object> item, Map<String,Map<String,Object>> reviews, String field, String value) {
        if (value.isBlank()) return true;
        var review = reviews.get(item.get("key"));
        if (review == null && !item.containsKey("automaticLabels")) return field.equals("difficulty") && value.equals("TOPIC".equals(item.get("kind")) ? "UYGULANMAZ" : "BELIRLENMEDI");
        Object label = effectiveLabels(item, review).get(field);
        return label instanceof List<?> labels ? labels.contains(value) : value.equals(label);
    }
    @SuppressWarnings("unchecked")
    private boolean matchesAssignment(Map<String,Object> item, Map<String,Map<String,Object>> reviews, Map<String,Map<String,Object>> categories, String field, String value) {
        var review = reviews.get(item.get("key"));
        for (var assignment : (List<Map<String,Object>>)effectiveLabels(item, review).getOrDefault("assignments",List.of())) {
            var category = categories.get(assignment.get("categoryId"));
            if (category != null && value.equals(category.get(field))) return true;
        }
        return false;
    }

    @SuppressWarnings("unchecked")
    private Map<String,Object> effectiveLabels(Map<String,Object> item, Map<String,Object> review) {
        if (review == null) return (Map<String,Object>)item.getOrDefault("automaticLabels", Map.of());
        var labels = new LinkedHashMap<>((Map<String,Object>)review.get("decision"));
        if (((List<?>)labels.getOrDefault("assignments", List.of())).isEmpty() && item.containsKey("automaticLabels"))
            labels.put("assignments", ((Map<String,Object>)item.get("automaticLabels")).get("assignments"));
        return labels;
    }
    @SuppressWarnings("unchecked")
    private boolean estimatedLabels(Map<String,Object> item,Map<String,Object> review) {
        var labels=effectiveLabels(item,review);
        return "ESTIMATED".equals(labels.get("gradeStatus")) || ((List<Map<String,Object>>)labels.getOrDefault("assignments",List.of())).stream()
            .anyMatch(a->"CANDIDATE".equals(a.get("scopeStatus")));
    }

    @SuppressWarnings("unchecked")
    private boolean physicsSelectionRequired(Map<String,Object> item,Map<String,Object> review,Map<String,Map<String,Object>> categories) {
        var labels = review != null && !"STALE".equals(status(item,review,categories))
            ? effectiveLabels(item,review) : (Map<String,Object>)item.getOrDefault("automaticLabels",Map.of());
        return ((List<Map<String,Object>>)labels.getOrDefault("assignments",List.of())).stream()
            .anyMatch(a->a.get("categoryId").toString().startsWith("system.fizik."));
    }

    /** A topic decision changes shared labels without pretending answer/image/content were approved. */
    @Transactional
    @SuppressWarnings("unchecked")
    public Map<String,Object> saveTopics(long reviewer,ContentReviewController.TopicSave request) {
        var current=detail(request.key());
        var item=(Map<String,Object>)current.get("item");
        var categories=categoryMap();
        var grades=new TreeSet<Integer>();
        if(request.assignments().isEmpty() || request.assignments().stream().noneMatch(a->"PRIMARY".equals(a.relation())))
            throw ApiException.badRequest("En az bir doğrudan ünite seçin.");
        for(var assignment:request.assignments()) {
            var c=categories.get(assignment.categoryId());
            if(c==null || !Boolean.TRUE.equals(c.get("canonicalTopic")))
                throw ApiException.badRequest("Ortak referans ünitelerinden seçim yapın.");
            if("QUESTION".equals(item.get("kind")) && !Objects.equals(c.get("exam"),item.get("exam")))
                throw ApiException.badRequest("Sorunun TYT/AYT kapsamındaki konuyu seçin.");
            if(c.get("grade") instanceof Number grade)grades.add(grade.intValue());
        }
        var labels=(Map<String,Object>)current.get("labels");
        var assignments=new ArrayList<ContentReviewController.Assignment>();
        var topicScopes=new HashMap<String,String>();
        request.assignments().forEach(a->topicScopes.put(a.categoryId(),"CONFIRMED"));
        var selectedSubjects=request.assignments().stream().map(a->categories.get(a.categoryId()).get("subjectId")).collect(java.util.stream.Collectors.toSet());
        for(var a:(List<Map<String,Object>>)labels.getOrDefault("assignments",List.of())) {
            var c=categories.get(a.get("categoryId"));
            if(c!=null && !selectedSubjects.contains(c.get("subjectId"))) {
                assignments.add(new ContentReviewController.Assignment(a.get("categoryId").toString(),a.get("relation").toString()));
                if(a.get("scopeStatus") instanceof String scope)topicScopes.put(a.get("categoryId").toString(),scope);
            }
        }
        assignments.addAll(request.assignments());
        if(assignments.size()>50)throw ApiException.badRequest("Bir kaynağa en fazla 50 konu ilişkisi kaydedilebilir.");
        if(grades.isEmpty() || assignments.size()>request.assignments().size())
            grades.addAll((List<Integer>)labels.getOrDefault("grades",List.of()));
        var checks=new LinkedHashMap<String,String>();
        var keys=switch(item.get("kind").toString()) {
            case "QUESTION" -> List.of("branch","topic","answer","image");
            case "TOPIC" -> List.of("branch","topic","structure");
            default -> List.of("branch","topic","content","coverage");
        };
        keys.forEach(key->checks.put(key,Set.of("branch","topic").contains(key)?"OK":"UNSURE"));
        return save(reviewer,new ContentReviewController.Save(request.key(),request.fingerprint(),request.revision(),
            "FIX",checks,request.note().isBlank()?"Temel fizik konusu seçildi; diğer içerik kontrolleri ayrıca incelenmeli.":request.note(),
            "","","","","","",assignments,
            labels.getOrDefault("difficulty","BELIRLENMEDI").toString(),
            labels.getOrDefault("contentFormat","KONU_ANLATIMI").toString(),
            (List<String>)labels.getOrDefault("skills",List.of()),new ArrayList<>(grades)),true,topicScopes);
    }

    public org.springframework.core.io.Resource pdfFile(int id) {
        if (pdfLabels.contains(id)) return pdfLabels.file(id);
        return pdfs.file(id);
    }

    @SuppressWarnings("unchecked")
    public String pdfFilename(int id) {
        var detail=detail("pdf:"+id);
        var item=(Map<String,Object>)detail.get("item");
        var labels=(Map<String,Object>)detail.get("labels");
        String title=ResourcePresentation.title(item,(List<Map<String,Object>>)labels.getOrDefault("assignments",List.of()),categoryMap());
        return ResourcePresentation.pdfFilename(title.isBlank()?Objects.toString(item.get("title"),"kaynak"):title,id);
    }

    private Map<String, Object> snapshot(String key) {
        var candidates = key.startsWith("question:") ? questionItems(null, Set.of(), key) : sourceItems();
        if (candidates.isEmpty() && key.startsWith("question:")) candidates = sourceItems();
        return snapshot(candidates.stream()
                .filter(i -> key.equals(i.get("key"))).findFirst()
                .orElseThrow(() -> ApiException.notFound("İçerik denetim kaydı bulunamadı.")));
    }
    private Map<String, Object> snapshot(Map<String, Object> source) {
        var item = new LinkedHashMap<>(source);
        if ("QUESTION".equals(item.get("kind")) && item.containsKey("questionId")) {
            item.put("contentSha256", imageHash((String) item.get("image")));
            item.put("solutionSha256", imageHash((String) item.get("solutionImage")));
        }
        if ("PDF".equals(item.get("kind"))) {
            try (var in = pdfFile((Integer) item.get("catalogId")).getInputStream()) {
                item.put("contentSha256", digest(in));
            } catch (Exception e) { item.put("contentSha256", "MISSING"); }
        }
        return item;
    }
    private String imageHash(String path) {
        if (path == null || path.isBlank()) return "NONE";
        try (var in = images.load(path).getInputStream()) { return digest(in); }
        catch (Exception e) { return "MISSING"; }
    }
    public Map<String, Object> detail(String key) {
        var item = snapshot(key);
        var review = latest().get(key);
        String status = review == null ? "PENDING" : hash(item).equals(review.get("fingerprint"))
                ? status(itemWithoutHashes(item), review, categoryMap()) : "STALE";
        var result = new LinkedHashMap<String, Object>();
        result.put("item", item); result.put("fingerprint", hash(item)); result.put("review", review); result.put("status", status);
        result.put("labels", effectiveLabels(item, review));
        result.put("history", jdbc.query("""
                SELECT r.*, u.username FROM content_review_history r JOIN users u ON u.id=r.reviewer_id
                WHERE item_key=? ORDER BY revision DESC
                """, (rs, n) -> review(rs), key));
        return result;
    }

    /** Only current, independently revalidated teacher decisions can override machine labels for students. */
    @SuppressWarnings("unchecked")
    public List<Map<String,Object>> studentOverrides() {
        var currentReviews = latest();
        if (currentReviews.isEmpty()) return List.of();
        var result = new ArrayList<Map<String,Object>>();
        var categories = categoryMap();
        var currentItems=new HashMap<String,Map<String,Object>>();
        var questionKeys=currentReviews.keySet().stream().filter(k->k.startsWith("question:")).toList();
        for(int start=0;start<questionKeys.size();start+=500)
            questionItems(null,new HashSet<>(questionKeys.subList(start,Math.min(start+500,questionKeys.size()))),null)
                .forEach(i->currentItems.put(i.get("key").toString(),i));
        if(!currentItems.keySet().containsAll(currentReviews.keySet()))
            sourceItems().forEach(i->currentItems.putIfAbsent(i.get("key").toString(),i));
        for (var review : currentReviews.values()) {
            String key = review.get("key").toString();
            try {
                var source=currentItems.get(key);if(source==null)continue;
                var item=snapshot(source);
                String state=hash(item).equals(review.get("fingerprint"))
                    ?status(itemWithoutHashes(item),review,categories):"STALE";
                if (!VERDICTS.contains(state)) continue;
                var labels = effectiveLabels(item,review);
                var publicLabels = new LinkedHashMap<String,Object>();
                for (String field : List.of("assignments","difficulty","contentFormat","skills","grades","gradeStatus","gradeReason"))
                    publicLabels.put(field, labels.getOrDefault(field, List.of()));
                var ids = ((List<Map<String,Object>>)publicLabels.get("assignments")).stream().map(a->a.get("categoryId").toString()).toList();
                var selected = ids.stream().map(categories::get).filter(Objects::nonNull).toList();
                result.add(Map.of("item_key", key, "labels", publicLabels, "status", state,"category_ids",ids,
                    "subject_ids",selected.stream().map(c->c.get("subjectId")).distinct().toList(),
                    "exam_ids",selected.stream().map(c->c.get("exam")).distinct().toList()));
            } catch (ApiException e) {
                // Removed/changed sources cannot retain a published teacher approval.
            }
        }
        return result;
    }
    private Map<String, Object> itemWithoutHashes(Map<String, Object> item) {
        var copy = new LinkedHashMap<>(item); copy.remove("contentSha256"); copy.remove("solutionSha256"); return copy;
    }

    @Transactional
    public Map<String, Object> save(long reviewer, ContentReviewController.Save save) {
        return save(reviewer,save,false);
    }
    private Map<String,Object> save(long reviewer,ContentReviewController.Save save,boolean topicSelectionOnly) {
        return save(reviewer,save,topicSelectionOnly,Map.of());
    }
    private Map<String,Object> save(long reviewer,ContentReviewController.Save save,boolean topicSelectionOnly,Map<String,String> topicScopes) {
        var item = snapshot(save.key());
        if (!hash(item).equals(save.fingerprint())) throw ApiException.conflict("Kaynak değişmiş. Kaydı yeniden açıp kontrol edin.");
        validate(save, item);
        var categories = categoryMap();
        var decision = new LinkedHashMap<String, Object>();
        decision.put("verdict", save.verdict()); decision.put("checks", save.checks()); decision.put("note", save.note().trim());
        decision.put("proposedExam", save.proposedExam().trim()); decision.put("proposedSubject", save.proposedSubject().trim());
        decision.put("proposedTopic", save.proposedTopic().trim()); decision.put("proposedSubtopic", save.proposedSubtopic().trim());
        decision.put("proposedAnswer", save.proposedAnswer()); decision.put("proposedUrl", save.proposedUrl().trim());
        decision.put("assignments",topicSelectionOnly ? save.assignments().stream().map(a->
            topicScopes.containsKey(a.categoryId())
                ? Map.of("categoryId",a.categoryId(),"relation",a.relation(),"scopeStatus",topicScopes.get(a.categoryId()))
                : Map.of("categoryId",a.categoryId(),"relation",a.relation())).toList() : save.assignments());
        if(topicSelectionOnly)decision.put("topicSelectionOnly",true);
        if(topicSelectionOnly) {
            decision.put("gradeStatus","ESTIMATED");
            decision.put("gradeReason","Ünite seçimi kaydedildi; sınıf etiketi ayrıca öğretmen kontrolünü bekliyor.");
        }
        decision.put("difficulty", save.difficulty());
        decision.put("contentFormat", save.contentFormat()); decision.put("skills", save.skills()); decision.put("grades", save.grades());
        decision.put("categorySnapshot", save.assignments().stream().map(a -> categories.get(a.categoryId())).toList());
        int updated = jdbc.update("""
                INSERT INTO content_reviews(item_key, revision, reviewer_id, decision, snapshot, fingerprint)
                SELECT ?, 1, ?, ?::jsonb, ?::jsonb, ? WHERE ? = 0
                ON CONFLICT (item_key) DO NOTHING
                """, save.key(), reviewer, write(decision), write(item), save.fingerprint(), save.revision());
        if (save.revision() > 0) updated = jdbc.update("""
                UPDATE content_reviews SET revision=revision+1, reviewer_id=?, decision=?::jsonb,
                snapshot=?::jsonb, fingerprint=?, saved_at=now() WHERE item_key=? AND revision=?
                """, reviewer, write(decision), write(item), save.fingerprint(), save.key(), save.revision());
        if (updated != 1) throw ApiException.conflict("Başka bir oturum bu kararı değiştirmiş. Yeniden açıp kontrol edin.");
        jdbc.update("""
                INSERT INTO content_review_history
                SELECT item_key,revision,reviewer_id,decision,snapshot,fingerprint,saved_at
                FROM content_reviews WHERE item_key=?
                """, save.key());
        return detail(save.key());
    }

    private void validate(ContentReviewController.Save save, Map<String, Object> item) {
        if (!ReviewCatalog.DIFFICULTIES.contains(save.difficulty()) || !ReviewCatalog.FORMATS.contains(save.contentFormat())
                || !ReviewCatalog.SKILLS.containsAll(save.skills()) || save.skills().stream().distinct().count() != save.skills().size()
                || save.grades().stream().anyMatch(g -> g == null || g<9 || g>12) || save.grades().stream().distinct().count() != save.grades().size())
            throw ApiException.badRequest("Ortak etiketlerden geçerli seçim yapın.");
        var categoryDefinitions=categoryMap();
        var categoryIds = categoryDefinitions.keySet();
        var seen = new HashSet<String>();
        for (var a : save.assignments()) if (!categoryIds.contains(a.categoryId()) || !Set.of("PRIMARY","SECONDARY","PREREQUISITE").contains(a.relation()) || !seen.add(a.categoryId()))
            throw ApiException.badRequest("Konu eşleşmesi geçersiz, yinelenmiş veya artık kullanılmıyor.");
        if ("APPROVE".equals(save.verdict()) && save.assignments().stream().noneMatch(a -> "PRIMARY".equals(a.relation())))
            throw ApiException.badRequest("Onay için en az bir doğrudan konu eşleşmesi seçin.");
        if("APPROVE".equals(save.verdict()) && save.assignments().stream().anyMatch(a->
            Boolean.FALSE.equals(categoryDefinitions.get(a.categoryId()).get("selectable"))))
            throw ApiException.badRequest("Onay için eski/inceleme etiketini kaldırıp temel konuyu seçin.");
        if (!VERDICTS.contains(save.verdict())) throw ApiException.badRequest("Karar geçersiz.");
        var checks = switch (item.get("kind").toString()) {
            case "QUESTION" -> Set.of("branch", "topic", "answer", "image");
            case "TOPIC" -> Set.of("branch", "topic", "structure");
            default -> Set.of("branch", "topic", "content", "coverage");
        };
        if (!save.checks().keySet().equals(checks) || save.checks().values().stream().anyMatch(v -> !Set.of("OK", "WRONG", "UNSURE").contains(v)))
            throw ApiException.badRequest("Her kontrol alanını işaretleyin.");
        if (save.note().isBlank()) throw ApiException.badRequest("Kararınız için kısa bir gerekçe yazın.");
        if ("APPROVE".equals(save.verdict()) && save.checks().values().stream().anyMatch(v -> !"OK".equals(v)))
            throw ApiException.badRequest("Onay için tüm kontroller uygun olmalı.");
        if ("APPROVE".equals(save.verdict()) && List.of(save.proposedExam(), save.proposedSubject(), save.proposedTopic(),
                save.proposedSubtopic(), save.proposedAnswer(), save.proposedUrl()).stream().anyMatch(v -> !v.isBlank()))
            throw ApiException.badRequest("Değişiklik önerdiğiniz kayıt için Düzeltilecek kararını seçin.");
        if ("APPROVE".equals(save.verdict()) && ("MISSING".equals(item.get("contentSha256"))
                || ("QUESTION".equals(item.get("kind")) && "NONE".equals(item.get("contentSha256")))))
            throw ApiException.badRequest("Kaynak dosyası bulunamayan kayıt onaylanamaz.");
        if (!save.proposedExam().isBlank() && !Set.of("TYT", "AYT", "TYT-AYT").contains(save.proposedExam()))
            throw ApiException.badRequest("Önerilen sınav geçersiz.");
        if (!save.proposedAnswer().isBlank() && (!save.proposedAnswer().matches("[A-E]") || !"QUESTION".equals(item.get("kind"))
                || save.proposedAnswer().charAt(0) - 'A' >= ((Number) item.get("choiceCount")).intValue()))
            throw ApiException.badRequest("Önerilen cevap geçersiz.");
        if (!save.proposedUrl().isBlank() && !save.proposedUrl().matches("https://[^\\s]+"))
            throw ApiException.badRequest("Önerilen bağlantı https:// ile başlamalı.");
        if ("WRONG_BRANCH".equals(save.verdict()) && save.proposedSubject().isBlank() && save.assignments().isEmpty())
            throw ApiException.badRequest("Doğru branşı veya branşın belirsiz olduğunu yazın.");
    }

    public Map<String, Object> export() {
        var records = reviews("content_reviews");
        var categories = categoryMap();
        var current = new HashMap<String, Map<String, Object>>(); sourceItems().forEach(i -> current.put(i.get("key").toString(), i));
        for (var r : records) {
            String key = r.get("key").toString();
            if (key.startsWith("question:")) questionItems(null, Set.of(), key).forEach(i -> current.put(key,i));
            r.put("currentStatus", current.containsKey(key)
                    ? hash(snapshot(current.get(key))).equals(r.get("fingerprint")) ? status(current.get(key), r, categories) : "STALE"
                    : "SOURCE_REMOVED");
        }
        return Map.of("schemaVersion", 2, "scope", "ALL_SUBJECTS", "catalog", vocabulary.metadata(), "exportedAt", Instant.now().toString(),
                "workflow", "Teacher decisions; content changes must be applied separately after snapshot validation.",
                "reviews", records, "history", reviews("content_review_history"),
                "automaticPdfLabels", sourceItems().stream().filter(i -> "PDF".equals(i.get("kind"))).toList());
    }
    private Object parse(String text) { try { return json.readValue(text, Object.class); } catch (Exception e) { throw new IllegalStateException(e); } }
    private String write(Object value) { try { return json.writeValueAsString(value); } catch (Exception e) { throw new IllegalStateException(e); } }
    private String hash(Object value) { return digest(new java.io.ByteArrayInputStream(write(sort(value)).getBytes(StandardCharsets.UTF_8))); }
    private Object sort(Object value) {
        if (value instanceof Map<?, ?> map) {
            var result = new TreeMap<String, Object>(); map.forEach((k,v) -> result.put(k.toString(), sort(v))); return result;
        }
        if (value instanceof List<?> list) return list.stream().map(this::sort).toList();
        return value;
    }
    private String digest(java.io.InputStream in) {
        try { var md = MessageDigest.getInstance("SHA-256"); byte[] b = new byte[65536];
            for (int n; (n = in.read(b)) != -1;) md.update(b, 0, n);
            return HexFormat.of().formatHex(md.digest());
        } catch (Exception e) { throw new IllegalStateException(e); }
    }
}
