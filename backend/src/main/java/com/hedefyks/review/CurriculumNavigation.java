package com.hedefyks.review;

import java.util.*;

/** Preferred curriculum presentation without changing saved/reviewed category definitions. */
public final class CurriculumNavigation {
    private CurriculumNavigation() {}
    @SuppressWarnings("unchecked")
    public static Map<String,Object> object(Object value) {
        return value instanceof Map<?,?> map ? (Map<String,Object>)map : Map.of();
    }
    @SuppressWarnings("unchecked")
    private static List<Map<String,Object>> rows(Object value) {
        if (!(value instanceof List<?> list)) throw new IllegalStateException("Curriculum navigation list missing");
        return list.stream().map(CurriculumNavigation::object).toList();
    }
    private static Map<String,Object> fields(Map<String,Object> row,String... names) {
        var result=new LinkedHashMap<String,Object>();
        for(String name:names) if(row.containsKey(name) && row.get(name)!=null)result.put(name,row.get(name));
        return result;
    }
    private static void validate(Map<String,Object> navigation) {
        if(!(navigation.get("version") instanceof Number version) || version.intValue()!=1
                || !"MEBI_PROVIDER".equals(navigation.get("authority")))
            throw new IllegalStateException("Unsupported curriculum navigation version/authority");
    }
    /** Whitelist prevents local filenames or extraction evidence entering public metadata. */
    public static Map<String,Object> publicView(Map<String,Object> navigation) {
        if(navigation.isEmpty())return Map.of();
        validate(navigation);
        var courses=new ArrayList<Map<String,Object>>();
        for(var source:rows(navigation.get("courses"))) {
            var course=fields(source,"id","exam","subjectId","title","order");
            var units=new ArrayList<Map<String,Object>>();
            for(var sourceUnit:rows(source.get("units"))) {
                var unit=fields(sourceUnit,"id","title","order","legacyScopeIds");
                var topics=new ArrayList<Map<String,Object>>();
                for(var sourceTopic:rows(sourceUnit.get("topics")))
                    topics.add(fields(sourceTopic,"categoryId","sourceExam","subjectId","unitId","title",
                            "order","orderInUnit","contentKey","examScopes","examCategoryIds"));
                unit.put("topics",topics);units.add(unit);
            }
            course.put("units",units);courses.add(course);
        }
        return Map.of("version",1,"authority","MEBI_PROVIDER","courses",courses);
    }
    /** Synthetic display rows only. Original definitions stay in categories/current_categories. */
    public static List<Map<String,Object>> selections(Map<String,Object> navigation,List<Map<String,Object>> definitions) {
        if(navigation.isEmpty())return definitions.stream().filter(c->Boolean.TRUE.equals(c.get("canonicalUnit"))
                && !Boolean.FALSE.equals(c.get("selectable"))).toList();
        validate(navigation);
        var byId=new HashMap<String,Map<String,Object>>();
        definitions.forEach(c->byId.put(c.get("id").toString(),c));
        var chosen=new LinkedHashMap<String,Map<String,Object>>();
        for(var course:rows(navigation.get("courses"))) for(var unit:rows(course.get("units")))
            for(var topic:rows(unit.get("topics"))) {
                String primary=String.valueOf(topic.get("categoryId"));
                String sourceExam=String.valueOf(topic.get("sourceExam"));
                var exams=new LinkedHashMap<String,List<String>>();
                for(var entry:object(topic.get("examCategoryIds")).entrySet()) {
                    if(!(entry.getValue() instanceof List<?> ids))throw new IllegalStateException("Invalid counterpart identifiers");
                    // A shared byte bundle is not permission to choose one of several topics.
                    if(ids.size()==1)exams.put(entry.getKey(),List.of(ids.get(0).toString()));
                }
                exams.put(sourceExam,List.of(primary));
                for(var entry:exams.entrySet()) for(String id:entry.getValue()) {
                    var definition=byId.get(id);
                    if(definition==null || !entry.getKey().equals(definition.get("exam"))
                            || !course.get("subjectId").equals(definition.get("subjectId")))
                        throw new IllegalStateException("Curriculum navigation identity/scope mismatch");
                    var previous=chosen.get(id);
                    if(previous!=null && definition.get("exam").equals(previous.get("navigationSourceExam")))continue;
                    var display=new LinkedHashMap<>(definition);
                    display.put("topic",topic.get("title"));display.put("unit",unit.get("title"));
                    display.put("unitId",unit.get("id"));display.put("order",topic.getOrDefault("order",0));
                    display.put("canonicalUnit",true);display.put("canonicalTopic",true);display.put("selectable",true);
                    display.put("navigationSelected",true);display.put("navigationSourceExam",sourceExam);
                    display.put("contentKey",topic.get("contentKey"));display.remove("canonicalTopicIds");
                    display.put("navigationUnitLegacyScopeIds",unit.getOrDefault("legacyScopeIds",List.of()));
                    chosen.put(id,display);
                }
            }
        var result=new ArrayList<>(chosen.values());
        result.sort(Comparator.comparing((Map<String,Object> c)->c.get("exam").toString())
                .thenComparing(c->c.get("subjectId").toString())
                .thenComparingInt(c->((Number)c.getOrDefault("order",0)).intValue()));
        var numbers=new HashMap<String,Integer>();
        for(var row:result)row.put("topicNumber",numbers.merge(row.get("exam")+":"+row.get("subjectId"),1,Integer::sum));
        definitions.stream().filter(c->c.get("exam")!=null && !Set.of("TYT","AYT").contains(c.get("exam"))
                && Boolean.TRUE.equals(c.get("canonicalUnit")) && !Boolean.FALSE.equals(c.get("selectable"))).forEach(result::add);
        return List.copyOf(result);
    }
}
