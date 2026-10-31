package com.hedefyks;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.hedefyks.learn.LearnService;
import com.hedefyks.user.Role;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

class LearnReliabilityTest extends TestBase {
    @Autowired LearnService learn;
    @Autowired PlatformTransactionManager transactions;

    private ObjectNode lesson() {
        return json.createObjectNode().put("id", UUID.randomUUID().toString()).put("at", Instant.now().toString())
                .put("kind", "lesson").put("conceptId", "uslu-ifadeler").put("action", "open");
    }

    private ObjectNode bank(long questionId) {
        return lesson().put("kind", "attempt").put("itemType", "bank").put("itemId", "M-1")
                .put("questionId", questionId).put("context", "practice").put("chosen", "A")
                .put("timeMs", 3000).put("confidence", 3);
    }

    @Test void reference_database_history_remains_visible_and_unchanged() {
        long user = user("ayse", Role.USER).getId();
        ObjectNode old = lesson().put("at", "2025-01-01T12:00:00Z");
        jdbc.update("""
                INSERT INTO learning_engine_events(user_id,client_event_id,subject,kind,concept_id,occurred_at,payload)
                VALUES (?,?,'matematik','lesson','uslu-ifadeler','2025-01-01T12:00:00Z',?::jsonb)
                """, user, UUID.fromString(old.path("id").asText()), old.toString());
        String before = jdbc.queryForObject("SELECT payload::text FROM learning_engine_events", String.class);
        assertThat((List<?>) learn.state(user, "matematik").get("events")).hasSize(1);
        learn.append(user, "matematik", List.of(lesson()));
        assertThat((List<?>) learn.state(user, "matematik").get("events")).hasSize(2);
        assertThat(jdbc.queryForObject("SELECT payload::text FROM learning_engine_events WHERE client_event_id=?", String.class,
                UUID.fromString(old.path("id").asText()))).isEqualTo(before);
        assertThat(jdbc.queryForObject("SELECT to_regclass('learning_engine_lifecycle')::text", String.class)).isNull();
    }

    @Test void atomic_batch_rejection_preserves_other_events_for_retry() {
        long user = user("ayse", Role.USER).getId();
        ObjectNode first = lesson(), invalid = lesson().put("kind", "invalid"), last = lesson();
        assertThatThrownBy(() -> learn.append(user, "matematik", List.of(first, invalid, last))).isInstanceOf(RuntimeException.class);
        assertThat((List<?>) learn.state(user, "matematik").get("events")).isEmpty();
        learn.append(user, "matematik", List.of(first, last));
        assertThat((List<?>) learn.state(user, "matematik").get("events")).hasSize(2);
    }

    @Test void same_id_with_different_payload_conflicts_without_changes() {
        long user = user("ayse", Role.USER).getId();
        ObjectNode event = lesson();
        var saved = learn.append(user, "matematik", List.of(event));
        assertThat(learn.append(user, "matematik", List.of(event))).isEqualTo(saved);
        assertThatThrownBy(() -> learn.append(user, "matematik", List.of(event.deepCopy().put("action", "complete"))))
                .hasMessageContaining("başka bir işlemde");
        var q = question("M-1", "Matematik", "C");
        var second = question("M-2", "Matematik", "C");
        ObjectNode answer = bank(q.getId());
        var original = learn.bankAnswer(user, "matematik", answer);
        assertThat(learn.bankAnswer(user, "matematik", answer)).isEqualTo(original);
        assertThatThrownBy(() -> learn.bankAnswer(user, "matematik", answer.deepCopy().put("chosen", "B")))
                .hasMessageContaining("başka bir işlemde");
        assertThatThrownBy(() -> learn.bankAnswer(user, "matematik", answer.deepCopy().put("questionId", second.getId())))
                .hasMessageContaining("başka bir işlemde");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM question_attempts", Integer.class)).isEqualTo(2);
    }

    @Test void concurrent_retries_commit_one_answer_and_return_the_same_event() throws Exception {
        long user = user("ayse", Role.USER).getId();
        ObjectNode answer = bank(question("M-1", "Matematik", "C").getId());
        CountDownLatch start = new CountDownLatch(1);
        try (var pool = Executors.newFixedThreadPool(4)) {
            var futures = new java.util.ArrayList<java.util.concurrent.Future<JsonNode>>();
            for (int i = 0; i < 4; i++) futures.add(pool.submit(() -> {
                start.await(); return (JsonNode) learn.bankAnswer(user, "matematik", answer).get("event");
            }));
            start.countDown();
            JsonNode first = futures.getFirst().get(20, TimeUnit.SECONDS);
            for (var future : futures) assertThat(future.get(20, TimeUnit.SECONDS)).isEqualTo(first);
        }
        assertThat(jdbc.queryForObject("SELECT count(*) FROM learning_engine_events", Integer.class)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM question_attempts WHERE event_type='ANSWER'", Integer.class)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM question_attempts WHERE event_type='REVEAL'", Integer.class)).isEqualTo(1);
        ObjectNode event = lesson();
        try (var pool = Executors.newFixedThreadPool(2)) {
            var a = pool.submit(() -> learn.append(user, "matematik", List.of(event)));
            var b = pool.submit(() -> learn.append(user, "matematik", List.of(event)));
            assertThat(a.get(20, TimeUnit.SECONDS)).isEqualTo(b.get(20, TimeUnit.SECONDS));
        }
    }

    @Test void event_write_failure_rolls_back_practice_and_retry_recovers() {
        long user = user("ayse", Role.USER).getId();
        ObjectNode answer = bank(question("M-1", "Matematik", "C").getId());
        jdbc.execute("CREATE FUNCTION reject_learning_test() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected write failure'; END $$");
        jdbc.execute("CREATE TRIGGER reject_learning_test BEFORE INSERT ON learning_engine_events FOR EACH ROW EXECUTE FUNCTION reject_learning_test()");
        try {
            assertThatThrownBy(() -> learn.bankAnswer(user, "matematik", answer)).isInstanceOf(RuntimeException.class);
            assertThat(jdbc.queryForObject("SELECT count(*) FROM question_attempts", Integer.class)).isZero();
            assertThat(jdbc.queryForObject("SELECT count(*) FROM learning_engine_events", Integer.class)).isZero();
        } finally {
            jdbc.execute("DROP TRIGGER reject_learning_test ON learning_engine_events");
            jdbc.execute("DROP FUNCTION reject_learning_test()");
        }
        learn.bankAnswer(user, "matematik", answer);
        assertThat((List<?>) learn.state(user, "matematik").get("events")).hasSize(1);
    }

    @Test void database_connection_loss_before_commit_is_recoverable_without_duplicate() {
        long user = user("ayse", Role.USER).getId();
        ObjectNode answer = bank(question("M-1", "Matematik", "C").getId());
        assertThatThrownBy(() -> new TransactionTemplate(transactions).execute(status -> {
            learn.bankAnswer(user, "matematik", answer);
            jdbc.execute("SELECT pg_terminate_backend(pg_backend_pid())");
            return null;
        })).isInstanceOf(RuntimeException.class);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM question_attempts", Integer.class)).isZero();
        var saved = learn.bankAnswer(user, "matematik", answer);
        assertThat(learn.bankAnswer(user, "matematik", answer)).isEqualTo(saved);
        assertThat((List<?>) learn.state(user, "matematik").get("events")).hasSize(1);
    }

    @Test void stale_account_requests_are_rejected_and_history_is_isolated() throws Exception {
        long ayse = user("ayse", Role.USER).getId();
        long mehmet = user("mehmet", Role.USER).getId();
        var session = login("mehmet", "Sifre1234");
        var event = lesson();
        var body = json.createObjectNode().put("expectedUserId", ayse);
        body.putArray("events").add(event);
        send(session, post("/api/konu-ogrenme/events"), body.toString()).andExpect(status().isConflict());
        send(session, get("/api/konu-ogrenme?expectedUserId=" + ayse), null).andExpect(status().isConflict());
        body.set("event", bank(question("M-1", "Matematik", "C").getId()));
        send(session, post("/api/konu-ogrenme/bank-answer"), body.toString()).andExpect(status().isConflict());
        body.putObject("settings");
        send(session, put("/api/konu-ogrenme/profile"), body.toString()).andExpect(status().isConflict());
        learn.append(ayse, "matematik", List.of(event));
        assertThat((List<?>) learn.state(mehmet, "matematik").get("events")).isEmpty();
        learn.append(mehmet, "matematik", List.of(event));
        assertThat((List<?>) learn.state(mehmet, "matematik").get("events")).hasSize(1);
    }

    @Test void another_open_practice_round_is_never_skipped_by_learning() throws Exception {
        long user = user("ayse", Role.USER).getId();
        var session = login("ayse", "Sifre1234");
        var q = question("M-1", "Matematik", "C");
        send(session, post("/api/questions/" + q.getId() + "/practice"),
                "{\"clientEventId\":\"" + UUID.randomUUID() + "\",\"eventType\":\"ANSWER\",\"answer\":\"A\"}").andExpect(status().isOk());
        assertThatThrownBy(() -> learn.bankAnswer(user, "matematik", bank(q.getId())))
                .hasMessageContaining("açık bir pratik turu");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM question_attempts", Integer.class)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM learning_engine_events", Integer.class)).isZero();
    }
}
