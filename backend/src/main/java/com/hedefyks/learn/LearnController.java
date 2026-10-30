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
    public record ProfileBody(String subject, JsonNode settings, Long revision) {}
    public record EventsBody(String subject, List<JsonNode> events) {}
    public record BankAnswerBody(String subject, JsonNode event) {}

    private final LearnService service;

    public LearnController(LearnService service) {
        this.service = service;
    }

    @GetMapping
    public Map<String, Object> state(@AuthenticationPrincipal AppUserDetails me, @RequestParam(defaultValue = "matematik") String subject) {
        return service.state(me.id(), subject);
    }

    @PutMapping("/profile")
    public Map<String, Object> profile(@AuthenticationPrincipal AppUserDetails me, @RequestBody ProfileBody body) {
        return service.saveProfile(me.id(), subject(body.subject()), body.settings(), body.revision());
    }

    @PostMapping("/events")
    public Map<String, Object> events(@AuthenticationPrincipal AppUserDetails me, @RequestBody EventsBody body) {
        return Map.of("events", service.append(me.id(), subject(body.subject()), body.events()));
    }

    @PostMapping("/bank-answer")
    public Map<String, Object> bankAnswer(@AuthenticationPrincipal AppUserDetails me, @RequestBody BankAnswerBody body) {
        return service.bankAnswer(me.id(), subject(body.subject()), body.event());
    }

    private static String subject(String value) {
        return value == null || value.isBlank() ? "matematik" : value;
    }
}
