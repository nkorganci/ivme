package com.hedefyks.progress;

import com.hedefyks.user.AppUserDetails;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/progress")
public class ProgressController {
    private final ProgressService service;

    public ProgressController(ProgressService service) {
        this.service = service;
    }

    @GetMapping("/first-attempts")
    public ProgressService.Summary firstAttempts(@AuthenticationPrincipal AppUserDetails me,
            @RequestParam(defaultValue = "DAY") ProgressService.Period period,
            @RequestParam String zone) {
        return service.summary(me.id(), period, zone);
    }

    @GetMapping("/timeline")
    public ProgressService.Timeline timeline(@AuthenticationPrincipal AppUserDetails me,
            @RequestParam(defaultValue = "DAY") ProgressService.Period period,
            @RequestParam String zone) {
        return service.timeline(me.id(), period, zone);
    }
}
