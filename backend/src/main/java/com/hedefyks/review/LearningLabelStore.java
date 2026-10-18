package com.hedefyks.review;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/** PostgreSQL is the shared, versioned source of truth for machine labels. */
@Component
public class LearningLabelStore {
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;
    public LearningLabelStore(JdbcTemplate jdbc, ObjectMapper json) { this.jdbc=jdbc; this.json=json; }
    public Map<String,Object> parse(String value) {
        try { return value == null ? Map.of() : json.readValue(value,new TypeReference<>(){}); }
        catch(Exception e) { throw new IllegalStateException("Kaynak etiket kaydı okunamadı.",e); }
    }
    public Map<String,Map<String,Object>> reviewItems() {
        var result=new LinkedHashMap<String,Map<String,Object>>();
        jdbc.query("SELECT item_key,data::text FROM learning_catalog.current_items WHERE kind <> 'QUESTION' OR question_code IS NULL OR NOT student_visible",rs->{
            result.put(rs.getString(1),parse(rs.getString(2)));
        });
        return result;
    }
    public List<Map<String,Object>> categories() {
        return jdbc.query("SELECT definition::text FROM learning_catalog.current_categories ORDER BY category_id",
            (rs,n)->parse(rs.getString(1)));
    }
}
