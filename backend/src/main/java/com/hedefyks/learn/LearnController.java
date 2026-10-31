package com.hedefyks.learn;

import com.fasterxml.jackson.databind.JsonNode;
import com.hedefyks.user.AppUserDetails;
import com.hedefyks.common.RecordWriteMetrics;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Konuyu Öğrenelim: öğrencinin olay günlüğü, ayarları ve banka sorusu puanlaması. */
@RestController
@RequestMapping("/api/konu-ogrenme")
public class LearnController {
    public record ProfileBody(String subject, JsonNode settings, Long revision, Long expectedUserId) {}
    public record EventsBody(String subject, List<JsonNode> events, Long expectedUserId) {}
    public record BankAnswerBody(String subject, JsonNode event, Long expectedUserId) {}

    private final LearnService service;
    private final LearnPracticeSets practiceSets;
    private final RecordWriteMetrics writeMetrics;

    public LearnController(LearnService service, LearnPracticeSets practiceSets, RecordWriteMetrics writeMetrics) {
        this.service = service;
        this.practiceSets = practiceSets;
        this.writeMetrics = writeMetrics;
    }

    @GetMapping
    public Map<String, Object> state(@AuthenticationPrincipal AppUserDetails me, @RequestParam(defaultValue = "matematik") String subject, @RequestParam(required = false) Long expectedUserId) {
        requireOwner(me, expectedUserId);
        return service.state(me.id(), subject);
    }

    @PutMapping("/profile")
    public Map<String, Object> profile(@AuthenticationPrincipal AppUserDetails me, @RequestBody ProfileBody body) {
        requireOwner(me, body.expectedUserId());
        return writeMetrics.measure("learn_profile", () -> service.saveProfile(me.id(), subject(body.subject()), body.settings(), body.revision()));
    }

    @PostMapping("/events")
    public Map<String, Object> events(@AuthenticationPrincipal AppUserDetails me, @RequestBody EventsBody body) {
        requireOwner(me, body.expectedUserId());
        return writeMetrics.measure("learn_events", () -> Map.of("events", service.append(me.id(), subject(body.subject()), body.events())));
    }

    @PostMapping("/bank-answer")
    public Map<String, Object> bankAnswer(@AuthenticationPrincipal AppUserDetails me, @RequestBody BankAnswerBody body) {
        requireOwner(me, body.expectedUserId());
        return writeMetrics.measure("learn_bank_answer", () -> service.bankAnswer(me.id(), subject(body.subject()), body.event()));
    }

    /** TAS-05: konu testi / çıkmış sorular / tip alıştırması için ortak PRATIK oturumu kurar (aynı istek kimliği aynı seti döndürür). */
    @PostMapping("/practice-sets")
    public ResponseEntity<Map<String, Object>> practiceSet(@AuthenticationPrincipal AppUserDetails me, @RequestBody LearnPracticeSets.CreateBody body) {
        requireOwner(me, body == null ? null : body.expectedUserId());
        var created = writeMetrics.measure("learn_practice_set", () -> practiceSets.create(me.id(), body));
        return ResponseEntity.status(created.repeated() || created.resumed() ? HttpStatus.OK : HttpStatus.CREATED)
                .body(Map.of("session", created.session(), "resumed", created.resumed()));
    }

    private static void requireOwner(AppUserDetails me, Long expectedUserId) {
        // Optional for older clients; current clients bind every request to its queue owner.
        if (expectedUserId != null && expectedUserId.longValue() != me.id())
            throw com.hedefyks.common.ApiException.conflict("Hesap değişti. Bu kayıt özgün hesabında bekliyor; sayfayı yenile.");
    }

    private static String subject(String value) {
        return value == null || value.isBlank() ? "matematik" : value;
    }
}
