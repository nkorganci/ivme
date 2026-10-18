package com.hedefyks.tutor;

import com.hedefyks.user.AppUserDetails;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.Map;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Öğretmen (OPERATOR) incelemesi; güvenlik kuralı /api/operator/** için rol ister. */
@RestController
@RequestMapping("/api/operator/tutor")
public class TutorReviewController {
    public record ReviewBody(@NotBlank @Size(max = 24) String decision, @NotNull TutorReviewService.Rubric rubric,
                             @Size(max = 2000) String note) {}

    public record ResolveBody(@NotBlank @Size(max = 40) String label, @Size(max = 1000) String note) {}

    private final TutorReviewService reviews;

    public TutorReviewController(TutorReviewService reviews) {
        this.reviews = reviews;
    }

    @GetMapping("/contents")
    public List<Map<String, Object>> list(@RequestParam(defaultValue = "all") String subjectId) {
        return reviews.list(subjectId);
    }

    @GetMapping("/contents/{code}")
    public Map<String, Object> detail(@PathVariable String code) {
        return reviews.detail(code);
    }

    @PostMapping("/versions/{contentId}/review")
    public Map<String, Object> review(@AuthenticationPrincipal AppUserDetails me, @PathVariable long contentId,
                                      @Valid @RequestBody ReviewBody body) {
        return reviews.review(me.id(), contentId, body.decision(), body.rubric(), body.note());
    }

    @GetMapping("/calibration")
    public Map<String, Object> calibration() {
        return reviews.calibration();
    }

    @GetMapping("/queue")
    public Map<String, Object> queue() {
        return reviews.queue();
    }

    @PostMapping("/queue/{id}")
    public Map<String, Object> resolve(@AuthenticationPrincipal AppUserDetails me, @PathVariable long id,
                                       @Valid @RequestBody ResolveBody body) {
        return reviews.resolve(me.id(), id, body.label(), body.note());
    }

    @GetMapping("/usage")
    public Map<String, Object> usage() {
        return reviews.usage();
    }
}
