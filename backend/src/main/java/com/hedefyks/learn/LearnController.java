package com.hedefyks.learn;

import com.fasterxml.jackson.databind.JsonNode;
import com.hedefyks.user.AppUserDetails;
import java.util.List;
import java.util.Map;
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

    public LearnController(LearnService service) {
        this.service = service;
    }

    @GetMapping
    public Map<String, Object> state(@AuthenticationPrincipal AppUserDetails me, @RequestParam(defaultValue = "matematik") String subject, @RequestParam(required = false) Long expectedUserId) {
        requireOwner(me, expectedUserId);
        return service.state(me.id(), subject);
    }

    @PutMapping("/profile")
    public Map<String, Object> profile(@AuthenticationPrincipal AppUserDetails me, @RequestBody ProfileBody body) {
        requireOwner(me, body.expectedUserId());
        return service.saveProfile(me.id(), subject(body.subject()), body.settings(), body.revision());
    }

    @PostMapping("/events")
    public Map<String, Object> events(@AuthenticationPrincipal AppUserDetails me, @RequestBody EventsBody body) {
        requireOwner(me, body.expectedUserId());
        return Map.of("events", service.append(me.id(), subject(body.subject()), body.events()));
    }

    @PostMapping("/bank-answer")
    public Map<String, Object> bankAnswer(@AuthenticationPrincipal AppUserDetails me, @RequestBody BankAnswerBody body) {
        requireOwner(me, body.expectedUserId());
        return service.bankAnswer(me.id(), subject(body.subject()), body.event());
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
