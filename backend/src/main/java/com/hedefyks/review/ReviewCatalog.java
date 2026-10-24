package com.hedefyks.review;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

/** Controlled identities shared by every teacher; display labels never act as saved identities. */
@Component
public class ReviewCatalog {
    public static final Map<String, List<String>> ALIASES = Map.ofEntries(
            Map.entry("turkce", List.of("Türkçe")), Map.entry("edebiyat", List.of("Türk Dili ve Edebiyatı")),
            Map.entry("matematik", List.of("Matematik")), Map.entry("geometri", List.of("Geometri", "Matematik")),
            Map.entry("tarih", List.of("Tarih", "Tarih-1", "Tarih-2")),
            Map.entry("cografya", List.of("Coğrafya", "Coğrafya-1", "Coğrafya-2")),
            Map.entry("felsefe", List.of("Felsefe", "Felsefe Grubu")),
            Map.entry("psikoloji", List.of("Felsefe", "Felsefe Grubu")), Map.entry("sosyoloji", List.of("Felsefe", "Felsefe Grubu")),
            Map.entry("mantik", List.of("Felsefe", "Felsefe Grubu")), Map.entry("din", List.of("Din Kültürü")),
            Map.entry("fizik", List.of("Fizik")), Map.entry("kimya", List.of("Kimya")), Map.entry("biyoloji", List.of("Biyoloji")));
    public static final Map<String, Map<String, String>> LABELS = readLabels();
    public static final Set<String> DIFFICULTIES = LABELS.get("difficulty").keySet();
    public static final Set<String> FORMATS = LABELS.get("contentFormat").keySet();
    public static final Set<String> SKILLS = LABELS.get("skills").keySet();
    private static Map<String, Map<String, String>> readLabels() {
        try (var in = new ClassPathResource("review-vocabulary.json").getInputStream()) {
            return new ObjectMapper().readValue(in, new TypeReference<>() {});
        } catch (Exception e) { throw new IllegalStateException("Ortak etiket sözlüğü okunamadı.", e); }
    }
    private final JdbcTemplate jdbc;
    private final LearningLabelStore learningLabels;
    private final List<Map<String, Object>> items;

    public ReviewCatalog(ObjectMapper json, JdbcTemplate jdbc, LearningLabelStore learningLabels) {
        this.jdbc = jdbc;
        this.learningLabels = learningLabels;
        try (var in = new ClassPathResource("content-review-catalog.json").getInputStream()) {
            var root = json.readTree(in);
            items = json.convertValue(root.get("items"), new TypeReference<>() {});
        } catch (Exception e) { throw new IllegalStateException("Öğretmen denetim kataloğu okunamadı.", e); }
    }

    public String subjectId(String label) {
        return switch (label == null ? "" : label) {
            case "Türkçe / Edebiyat" -> "turkce";
            case "Matematik + Geometri" -> "matematik";
            case "Din Kültürü (DKAB)" -> "din";
            case "Türkçe", "turkce" -> "turkce";
            case "Türk Dili ve Edebiyatı", "edebiyat" -> excelCurriculum() ? "turkce" : "edebiyat";
            case "Matematik", "matematik" -> "matematik";
            case "Geometri", "geometri" -> excelCurriculum() ? "matematik" : "geometri";
            case "Tarih", "Tarih-1", "Tarih-2", "tarih" -> "tarih";
            case "Coğrafya", "Coğrafya-1", "Coğrafya-2", "cografya" -> "cografya";
            case "Felsefe", "Felsefe Grubu", "felsefe" -> "felsefe";
            case "Din Kültürü", "Din Kültürü ve Ahlak Bilgisi", "din" -> "din";
            case "Fizik", "fizik" -> "fizik"; case "Kimya", "kimya" -> "kimya"; case "Biyoloji", "biyoloji" -> "biyoloji";
            case "Psikoloji", "psikoloji" -> "psikoloji"; case "Sosyoloji", "sosyoloji" -> "sosyoloji"; case "Mantık", "mantik" -> "mantik";
            default -> "unmapped";
        };
    }

    private boolean excelCurriculum() {
        return Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS (SELECT 1 FROM learning_catalog.current_categories WHERE definition->>'curriculumSource'='EXCEL_FIRST_SHEET')",Boolean.class));
    }

    public List<Map<String, Object>> items() { return items; }
    public List<Map<String, Object>> branches() {
        var branches=new LinkedHashMap<String,Map<String,Object>>();
        for(var category:learningLabels.categories()) {
            if(Boolean.FALSE.equals(category.get("selectable")) || category.get("subjectId")==null)continue;
            String id=category.get("subjectId").toString();
            branches.putIfAbsent(id,Map.of("id",id,"name",category.get("subject")));
        }
        return List.copyOf(branches.values());
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public List<Map<String, Object>> categories() {
        // Packaged JSON is a generation input. Only a published DB definition
        // may be selected, named, or captured in a teacher decision at runtime.
        var categories = new ArrayList<>(learningLabels.categories());
        // Preserve any already configured taxonomy, including its branch-specific skills/question types.
        var nodes = jdbc.queryForList("SELECT id,parent_id,kind,code,name FROM taxonomy_nodes WHERE active ORDER BY id");
        var byId = new HashMap<Long, Map<String, Object>>();
        nodes.forEach(n -> byId.put(((Number)n.get("id")).longValue(), n));
        for (var node : nodes) {
            if (!Set.of("TOPIC", "SUBTOPIC", "SKILL", "QUESTION_TYPE").contains(node.get("kind"))) continue;
            var chain = new HashMap<String, String>(); var cursor = node;
            for (int depth=0; cursor != null && depth<12; depth++) {
                chain.put(cursor.get("kind").toString(), cursor.get("name").toString());
                cursor = cursor.get("parent_id") == null ? null : byId.get(((Number)cursor.get("parent_id")).longValue());
            }
            if (!chain.containsKey("EXAM") || !chain.containsKey("SUBJECT")) continue;
            String id = "taxonomy:"+node.get("id");
            if (categories.stream().anyMatch(c -> id.equals(c.get("id")))) continue;
            var definition=new LinkedHashMap<String,Object>(Map.of("id", id, "exam", chain.get("EXAM"),
                    "subjectId", subjectId(chain.get("SUBJECT")), "subject", chain.get("SUBJECT"),
                    "topic", chain.getOrDefault("TOPIC", node.get("name").toString()),
                    "subtopic", chain.getOrDefault("SUBTOPIC", ""), "detail", node.get("name"),
                    "nodeKind", node.get("kind"), "origin", "TAXONOMY", "code", node.get("code")));
            definition.put("selectable",false);
            categories.add(definition);
        }
        return categories;
    }
    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public Map<String, Object> metadata() {
        return Map.of("version", 2, "branches", branches(), "categories", categories(),
                "labels", LABELS);
    }

    @SuppressWarnings("unchecked")
    public List<List<String>> categoryGroups(List<String> ids) {
        var definitions=new HashMap<String,Map<String,Object>>();
        categories().forEach(c->definitions.put(c.get("id").toString(),c));
        return ids.stream().map(id->{
            var c=definitions.get(id);
            if(c==null) throw com.hedefyks.common.ApiException.badRequest("Konu etiketi artık kullanılmıyor.");
            if(!c.containsKey("canonicalTopicIds")) return List.of(id);
            var targets=(List<String>)c.get("canonicalTopicIds");
            return targets.isEmpty()?List.of(c.get("id").toString().startsWith("system.")?id:
                "system."+c.get("subjectId")+"."+c.get("exam").toString().toLowerCase(Locale.ROOT)+".konu-incelemesi"):targets;
        }).toList();
    }
}
