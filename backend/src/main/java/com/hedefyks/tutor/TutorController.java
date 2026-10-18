package com.hedefyks.tutor;

import com.hedefyks.user.AppUserDetails;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.Map;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Öğrenci öğretim döngüsü. Yanıtlar yalnız öğrencinin hak ettiği içerik parçalarını taşır. */
@RestController
@RequestMapping("/api/tutor")
public class TutorController {
    public record Start(@NotBlank @Size(max = 60) String code) {}

    public record ActionBody(@NotBlank @Size(max = 20) String type, @Size(max = 1) String choice,
                             @Size(max = 24) String optionId, @Size(max = 4) String stepId,
                             @Size(max = 10) String level, @Size(max = 500) String text) {}

    private final TutorSessionService sessions;

    public TutorController(TutorSessionService sessions) {
        this.sessions = sessions;
    }

    @GetMapping("/catalog")
    public Map<String, Object> catalog(@AuthenticationPrincipal AppUserDetails me) {
        return sessions.catalog(me.id());
    }

    @GetMapping("/skills")
    public List<Map<String, Object>> skills(@AuthenticationPrincipal AppUserDetails me) {
        return sessions.skills(me.id());
    }

    @PostMapping("/sessions")
    public Map<String, Object> start(@AuthenticationPrincipal AppUserDetails me, @Valid @RequestBody Start body) {
        return sessions.start(me.id(), body.code().trim());
    }

    @GetMapping("/sessions/{id}")
    public Map<String, Object> view(@AuthenticationPrincipal AppUserDetails me, @PathVariable long id) {
        return sessions.view(me.id(), id);
    }

    @PostMapping("/sessions/{id}/actions")
    public Map<String, Object> act(@AuthenticationPrincipal AppUserDetails me, @PathVariable long id,
                                   @Valid @RequestBody ActionBody body) {
        return sessions.act(me.id(), id, new TutorSessionService.Action(body.type(), body.choice(), body.optionId(),
                body.stepId(), body.level(), body.text()));
    }
}
