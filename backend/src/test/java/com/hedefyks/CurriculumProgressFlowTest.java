package com.hedefyks;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.hedefyks.user.Role;
import org.junit.jupiter.api.Test;

class CurriculumProgressFlowTest extends TestBase {
    @Override protected boolean catalogFixtureRequired() { return true; }
    @Test
    void recordsCompletionPerStudentAndAllowsUndo() throws Exception {
        user("konu_ayse", Role.USER);
        user("konu_mehmet", Role.USER);
        var ayse = login("konu_ayse", "Sifre1234");
        var ayseSecond = login("konu_ayse", "Sifre1234");
        var mehmet = login("konu_mehmet", "Sifre1234");
        String topic=jdbc.queryForObject("SELECT category_id FROM learning_catalog.current_categories WHERE definition->>'canonicalUnit'='true' AND definition->>'subjectId'='matematik' AND definition->>'exam'='TYT' ORDER BY category_id LIMIT 1",String.class);
        String path = "/api/curriculum/progress/"+topic;

        assertThat(read(send(ayse, get("/api/curriculum/progress"), null)).size()).isZero();
        var saved = read(send(ayse, put(path), "{\"completed\":true}").andExpect(status().isOk()));
        assertThat(saved.get("topicId").asText()).isEqualTo(topic);
        assertThat(saved.get("completedAt").asText()).isNotBlank();
        var repeated = read(send(ayse, put(path), "{\"completed\":true}").andExpect(status().isOk()));
        assertThat(repeated.get("completedAt").asText()).isEqualTo(saved.get("completedAt").asText());
        assertThat(read(send(ayse, get("/api/curriculum/progress"), null)).size()).isEqualTo(1);
        assertThat(read(send(ayseSecond, get("/api/curriculum/progress"), null)).size()).isEqualTo(1);
        assertThat(read(send(mehmet, get("/api/curriculum/progress"), null)).size()).isZero();

        send(ayse, put(path), "{\"completed\":false}").andExpect(status().isOk());
        assertThat(read(send(ayse, get("/api/curriculum/progress"), null)).size()).isZero();
        assertThat(read(send(ayseSecond, get("/api/curriculum/progress"), null)).size()).isZero();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM user_record_audit WHERE record_type = 'curriculum_topic_progress'",
                Integer.class)).isEqualTo(3);
        send(ayse, put("/api/curriculum/progress/invalid"), "{\"completed\":true}")
                .andExpect(status().isBadRequest());
        send(ayse, put(path), "{}").andExpect(status().isBadRequest());
    }

    @Test void legacyCompletionMapsOnceAndCanBeUndoneWithoutCompletingSplitTopics() throws Exception {
        var student=user("legacy_progress",Role.USER);
        var session=login("legacy_progress","Sifre1234");
        var ids=jdbc.queryForList("SELECT category_id FROM learning_catalog.current_categories WHERE definition->>'canonicalUnit'='true' ORDER BY category_id LIMIT 2",String.class);
        for(String legacy:java.util.List.of("legacy-single","legacy-split")) {
            var definition=json.createObjectNode().put("id",legacy).put("origin","CURRICULUM").put("selectable",false);
            var targets=definition.putArray("canonicalTopicIds");targets.add(ids.get(0));
            if(legacy.endsWith("split"))targets.add(ids.get(1));
            jdbc.update("INSERT INTO learning_catalog.categories SELECT run_key,?,?::jsonb FROM learning_catalog.current_run",legacy,definition.toString());
            jdbc.update("INSERT INTO curriculum_topic_progress(user_id,topic_id) VALUES (?,?)",student.getId(),legacy);
        }
        var saved=read(send(session,get("/api/curriculum/progress"),null).andExpect(status().isOk()));
        var names=new java.util.ArrayList<String>();saved.forEach(row->names.add(row.path("topicId").asText()));
        assertThat(names).contains(ids.get(0)).doesNotContain(ids.get(1));
        send(session,put("/api/curriculum/progress/legacy-single"),"{\"completed\":true}").andExpect(status().isBadRequest());
        send(session,put("/api/curriculum/progress/"+ids.get(0)),"{\"completed\":false}").andExpect(status().isOk());
        var remaining=read(send(session,get("/api/curriculum/progress"),null).andExpect(status().isOk()));
        assertThat(remaining.size()).isEqualTo(1);
        assertThat(remaining.get(0).path("topicId").asText()).isEqualTo("legacy-split");
    }
}
