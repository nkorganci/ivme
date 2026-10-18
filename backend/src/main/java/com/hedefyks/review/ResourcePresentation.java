package com.hedefyks.review;

import java.text.Collator;
import java.util.*;

/** Display names use effective category identities; original titles remain searchable. */
final class ResourcePresentation {
    private ResourcePresentation() {}
    static String pdfFilename(String title,int id) {
        String slug=java.text.Normalizer.normalize(title.toLowerCase(Locale.forLanguageTag("tr-TR")).replace('ı','i'),java.text.Normalizer.Form.NFD)
            .replaceAll("\\p{M}","").replaceAll("[^a-z0-9]+","-").replaceAll("^-|-$","");
        if(slug.length()>160)slug=slug.substring(0,160).replaceAll("-$","");
        return (slug.isBlank()?"kaynak":slug)+"-"+id+".pdf";
    }
    private static String text(Object value) { return value == null ? "" : value.toString(); }
    private static List<String> distinct(List<String> values) {
        var result = new ArrayList<>(new LinkedHashSet<>(values.stream().filter(s -> !s.isBlank()).toList()));
        result.sort(Collator.getInstance(Locale.forLanguageTag("tr-TR")));
        return result;
    }
    static String title(Map<String,Object> source, List<Map<String,Object>> assignments, Map<String,Map<String,Object>> categories) {
        var selected = assignments.stream().filter(a -> !"PREREQUISITE".equals(a.get("relation")))
            .map(a -> categories.get(a.get("categoryId"))).filter(Objects::nonNull).toList();
        if (selected.isEmpty()) return text(source.get("originalTitle"));
        var topics = distinct(selected.stream().map(c -> text(c.get("topic"))).toList());
        var branches = distinct(selected.stream().map(c -> text(c.get("subject"))).toList());
        boolean mixed = topics.size() > 3 || branches.size() > 1;
        boolean provisional = assignments.stream().anyMatch(a -> "LOW".equals(a.get("confidence")) || "CANDIDATE".equals(a.get("scopeStatus")));
        String scope = mixed ? "Karma konular" : String.join("; ",topics);
        if (provisional) scope += " (tahmini)";
        String kind = switch (text(source.get("kind"))) {
            case "PDF" -> "PDF"; case "VIDEO" -> "Video"; case "NOTE" -> "Ders notu";
            case "QUESTION" -> "Soru"; case "TOPIC" -> "Konu"; default -> text(source.get("kind"));
        };
        return String.join(" | ", List.of(
            String.join("/",distinct(selected.stream().map(c -> text(c.get("exam"))).filter(e -> !e.equals("UNKNOWN")).toList())),
            String.join("; ",branches),
            String.join("/",distinct(selected.stream().filter(c->Boolean.TRUE.equals(c.get("canonicalTopic")) && c.get("grade")!=null)
                .map(c->text(c.get("grade"))+". sınıf").toList())), scope,
            mixed ? "" : String.join("; ",distinct(selected.stream().map(c -> text(c.get("subtopic"))).toList())),
            text(source.get("sourceLabel")), kind).stream().filter(s -> !s.isBlank()).toList());
    }
}
