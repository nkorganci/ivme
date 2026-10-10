package com.hedefyks.progress;

import com.hedefyks.user.AppUserDetails;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/recommendations")
public class RecommendationController {
    private final RecommendationService recommendations;

    public RecommendationController(RecommendationService recommendations) {
        this.recommendations = recommendations;
    }

    @GetMapping
    public RecommendationService.Result forSubject(@AuthenticationPrincipal AppUserDetails me,
                                                   @RequestParam String subject) {
        return recommendations.forSubject(me.id(), subject);
    }
}
