package com.hedefyks;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.hedefyks.question.QuestionSource;
import com.hedefyks.user.Role;
import java.util.*;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

class PracticeSourceSelectionTest extends TestBase {
    private static final String RUN = "practice-source-test";

    @AfterEach void clearCatalog() {
        jdbc.update("DELETE FROM learning_catalog.current_run WHERE run_key=?", RUN);
        jdbc.update("DELETE FROM learning_catalog.items WHERE run_key=?", RUN);
        jdbc.update("DELETE FROM learning_catalog.categories WHERE run_key=?", RUN);
        jdbc.update("DELETE FROM learning_catalog.runs WHERE run_key=?", RUN);
    }

    private void fixture(boolean published) throws Exception {
        if (published) {
            jdbc.update("INSERT INTO learning_catalog.runs(run_key,method,summary) VALUES (?,'TEST','{}')", RUN);
            jdbc.update("INSERT INTO learning_catalog.current_run VALUES (true,?) ON CONFLICT(singleton) DO UPDATE SET run_key=excluded.run_key", RUN);
            for (String exam : List.of("TYT", "AYT")) jdbc.update("INSERT INTO learning_catalog.categories VALUES (?,?,?::jsonb)",
                    RUN, "source-"+exam, json.writeValueAsString(Map.of("id","source-"+exam,"exam",exam,"subjectId","fizik","subject","Fizik","topic","Hareket")));
        }
        for (var source : QuestionSource.values()) {
            var q = question(source.name(), "Fizik", "A");
            q.setBank(source.bank()); q.setExamType(source.examType());
            questions.saveAndFlush(q);
            if (!published) continue;
            var assignments = List.of(Map.of("categoryId", "source-"+source.examType(), "relation", "PRIMARY", "scopeStatus", "CONFIRMED"));
            String stamp = jdbc.queryForObject("SELECT extract(epoch from updated_at)::text FROM questions WHERE id=?", String.class, q.getId());
            var data = new LinkedHashMap<String,Object>();
            data.put("key","question:"+q.getCode()); data.put("kind","QUESTION"); data.put("exam",source.examType().name());
            data.put("subjectId","fizik"); data.put("subject","Fizik"); data.put("title",q.getCode());
            data.put("url","/soru/"+q.getCode()); data.put("availability","available"); data.put("studentVisible",true);
            data.put("questionCode",q.getCode()); data.put("sourceUpdatedAt",stamp);
            data.put("automaticLabels",Map.of("assignments",assignments)); data.put("bank",source.bank().name());
            jdbc.update("INSERT INTO learning_catalog.items(run_key,item_key,kind,exam,subject_id,student_visible,data,category_ids,subject_ids,exam_ids) VALUES (?,?,'QUESTION',?,'fizik',true,?::jsonb,?::text[],ARRAY['fizik'],?::text[])",
                    RUN,"question:"+q.getCode(),source.examType().name(),json.writeValueAsString(data),"{source-"+source.examType()+"}","{"+source.examType()+"}");
        }
    }

    private void allSourceCombinations(boolean published) throws Exception {
        fixture(published);
        user("source_student", Role.USER);
        var session = login("source_student", "Sifre1234");
        var sources = QuestionSource.values();
        for (int mask=1; mask<16; mask++) {
            var selected = new ArrayList<String>();
            for (int bit=0; bit<4; bit++) if ((mask & (1<<bit))!=0) selected.add(sources[bit].name());
            String[] ids = selected.toArray(String[]::new);
            var count = read(send(session,get("/api/questions/availability").param("source",ids),null).andExpect(status().isOk()));
            assertThat(count.path("total").asInt()).as("sources %s",selected).isEqualTo(selected.size());
            var list = read(send(session,get("/api/questions").param("source",ids),null).andExpect(status().isOk()));
            assertThat(list.path("totalElements").asInt()).isEqualTo(selected.size());
            if (published) {
                var filters = read(send(session,get("/api/questions/filters").param("source",ids),null).andExpect(status().isOk()));
                assertThat(filters.get(0).path("totalCount").asInt()).isEqualTo(selected.size());
                var counts = read(send(session,get("/api/questions/category-counts").param("source",ids),null).andExpect(status().isOk()));
                assertThat(counts.properties().stream().mapToInt(entry->entry.getValue().asInt()).sum()).isEqualTo(selected.size());
            }
            var body = new LinkedHashMap<String,Object>();
            body.put("source",selected); body.put("questionCount",selected.size()); body.put("clientRequestId",UUID.randomUUID());
            var created = read(send(session,post("/api/study-sessions"),json.writeValueAsString(body)).andExpect(status().isCreated()));
            var codes = new ArrayList<String>();
            created.path("questions").forEach(q->codes.add(q.path("code").asText()));
            assertThat(codes).containsExactlyInAnyOrderElementsOf(selected);
            var stored = json.readTree(jdbc.queryForObject("SELECT catalog_filter::text FROM study_sessions WHERE id=?",String.class,created.path("id").asLong()));
            assertThat(stored.path("sources").size()).isEqualTo(selected.size());
        }
        send(session,get("/api/questions/availability").param("source","UNKNOWN"),null).andExpect(status().isBadRequest());
    }

    @Test void allPairsUseTheSamePoolForAvailabilityAndCreationWithoutCatalog() throws Exception {
        allSourceCombinations(false);
    }

    @Test void publishedPairsPreserveTheBankExamPairInEveryFacetAndCreation() throws Exception {
        allSourceCombinations(true);
    }

    @Test void aQuestionWithTwoEffectiveExamsIsCountedAndSelectedOnlyOnce() throws Exception {
        fixture(true);
        jdbc.update("UPDATE learning_catalog.items SET exam_ids=ARRAY['TYT','AYT'] WHERE run_key=? AND item_key='question:OGM_TYT'",RUN);
        user("dual_student",Role.USER);
        var session=login("dual_student","Sifre1234");
        var count=read(send(session,get("/api/questions/availability").param("source","OGM_AYT"),null).andExpect(status().isOk()));
        assertThat(count.path("total").asInt()).isEqualTo(2);
        count=read(send(session,get("/api/questions/availability").param("source","OGM_AYT","OGM_TYT"),null).andExpect(status().isOk()));
        assertThat(count.path("total").asInt()).isEqualTo(2);
        var summary=read(send(session,get("/api/questions/pool-summary"),null).andExpect(status().isOk()));
        assertThat(summary.path("total").asInt()).isEqualTo(4);
        assertThat(summary.at("/sources/OGM_AYT").asInt()).isEqualTo(2);
        assertThat(summary.at("/sources/OGM_TYT").asInt()).isEqualTo(1);
        assertThat(summary.path("sources").has("CIKMIS_KPSS_OO_GY")).isFalse();
        var created=read(send(session,post("/api/study-sessions"),json.writeValueAsString(Map.of(
                "source",List.of("OGM_AYT","OGM_TYT"),"questionCount",2,"clientRequestId",UUID.randomUUID()))).andExpect(status().isCreated()));
        var ids=new HashSet<Long>(); created.path("questions").forEach(q->ids.add(q.path("questionId").asLong()));
        assertThat(ids).hasSize(2);
    }

    private void historyCombinations(boolean published) throws Exception {
        fixture(published);
        var owner = user("history_owner", Role.USER);
        var other = user("history_other", Role.USER);
        var session = login("history_owner", "Sifre1234");
        for (var entry : Map.of("CIKMIS_AYT", List.of(true), "CIKMIS_TYT", List.of(false, true), "OGM_AYT", List.of(false)).entrySet()) {
            long id = questions.findByCode(entry.getKey()).orElseThrow().getId();
            for (boolean correct : entry.getValue()) jdbc.update("""
                INSERT INTO question_attempts(user_id,question_id,client_event_id,event_type,selected_answer,correct_answer,is_correct)
                VALUES (?,?,gen_random_uuid(),'ANSWER',?,'A',?)
                """, owner.getId(), id, correct ? "A" : "B", correct);
        }
        jdbc.update("""
            INSERT INTO question_attempts(user_id,question_id,client_event_id,event_type,selected_answer,correct_answer,is_correct)
            VALUES (?,?,gen_random_uuid(),'ANSWER','A','A',true)
            """, other.getId(), questions.findByCode("OGM_TYT").orElseThrow().getId());
        for (var history : List.of(List.of("CORRECT"), List.of("WRONG"), List.of("CORRECT", "WRONG"))) {
            var expected = history.size() == 2 ? List.of("CIKMIS_AYT", "CIKMIS_TYT", "OGM_AYT")
                    : history.contains("CORRECT") ? List.of("CIKMIS_AYT", "CIKMIS_TYT") : List.of("CIKMIS_TYT", "OGM_AYT");
            for (var sources : List.of(List.<String>of(), List.of("CIKMIS_TYT", "OGM_TYT"))) {
                var allowed = expected.stream().filter(code -> sources.isEmpty() || sources.contains(code)).toList();
                var request = get("/api/questions/availability").param("history", history.toArray(String[]::new));
                if (!sources.isEmpty()) request.param("source", sources.toArray(String[]::new));
                var count = read(send(session, request, null).andExpect(status().isOk()));
                assertThat(count.path("total").asInt()).isEqualTo(allowed.size());
                assertThat(count.path("remaining").asInt()).isZero();
                var body = Map.of("history", history, "source", sources, "selectionMode", "NEW",
                        "questionCount", allowed.size(), "clientRequestId", UUID.randomUUID());
                var created = read(send(session, post("/api/study-sessions"), json.writeValueAsString(body)).andExpect(status().isCreated()));
                var codes = new ArrayList<String>();
                created.path("questions").forEach(q -> codes.add(q.path("code").asText()));
                assertThat(codes).containsExactlyInAnyOrderElementsOf(allowed).doesNotHaveDuplicates();
                assertThat(created.path("selectionMode").asText()).isEqualTo("REPEAT");
                var stored = json.readTree(jdbc.queryForObject("SELECT catalog_filter::text FROM study_sessions WHERE id=?", String.class, created.path("id").asLong()));
                assertThat(stored.path("history").size()).isEqualTo(history.size());
            }
        }
        var empty = read(send(session, get("/api/questions/availability").param("source", "OGM_AYT").param("history", "CORRECT"), null).andExpect(status().isOk()));
        assertThat(empty.path("total").asInt()).isZero();
        send(session, post("/api/study-sessions"), json.writeValueAsString(Map.of("source", List.of("OGM_AYT"),
                "history", List.of("CORRECT"), "questionCount", 1, "clientRequestId", UUID.randomUUID()))).andExpect(status().isBadRequest());
        send(session, get("/api/questions/availability").param("history", "UNKNOWN"), null).andExpect(status().isBadRequest());
    }

    @Test void historyPoolsAndCreationAgreeWithoutCatalog() throws Exception { historyCombinations(false); }
    @Test void publishedHistoryPoolsRespectSourcePairsAndDeduplicateAnswers() throws Exception { historyCombinations(true); }
}
