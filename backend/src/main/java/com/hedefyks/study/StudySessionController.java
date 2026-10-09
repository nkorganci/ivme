package com.hedefyks.study;

import com.hedefyks.study.StudySessionDtos.CreateRequest;
import com.hedefyks.study.StudySessionDtos.Session;
import com.hedefyks.user.AppUserDetails;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/study-sessions")
public class StudySessionController {
    private final StudySessionService service;

    public StudySessionController(StudySessionService service) {
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<Session> create(@AuthenticationPrincipal AppUserDetails me,
                                          @Valid @RequestBody CreateRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(me.id(), req));
    }

    @GetMapping("/active")
    public ResponseEntity<Session> active(@AuthenticationPrincipal AppUserDetails me) {
        return service.latestActive(me.id()).map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @GetMapping("/{id}")
    public Session get(@AuthenticationPrincipal AppUserDetails me, @PathVariable Long id) {
        return service.get(me.id(), id);
    }

    @PostMapping("/{id}/finish")
    public Session finish(@AuthenticationPrincipal AppUserDetails me, @PathVariable Long id) {
        return service.finish(me.id(), id);
    }
}
