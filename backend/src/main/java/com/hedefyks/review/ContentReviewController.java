package com.hedefyks.review;

import com.hedefyks.user.AppUserDetails;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.Map;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.*;
import org.springframework.core.io.Resource;

@RestController
@RequestMapping("/api/operator/content-review")
public class ContentReviewController {
    private final ContentReviewService service;
    public ContentReviewController(ContentReviewService service) { this.service = service; }

    public record Save(@NotBlank @Size(max=500) String key, @NotBlank String fingerprint,
                       @Min(0) int revision, @NotBlank String verdict,
                       @NotNull Map<String, String> checks,
                       @NotNull @Size(max=4000) String note,
                       @NotNull @Size(max=20) String proposedExam,
                       @NotNull @Size(max=150) String proposedSubject,
                       @NotNull @Size(max=300) String proposedTopic,
                       @NotNull @Size(max=300) String proposedSubtopic,
                       @NotNull @Size(max=1) String proposedAnswer,
                       @NotNull @Size(max=2000) String proposedUrl,
                       @NotNull @Size(max=50) java.util.List<@Valid Assignment> assignments,
                       @NotBlank String difficulty, @NotBlank String contentFormat,
                       @NotNull @Size(max=9) java.util.List<String> skills,
                       @NotNull @Size(max=4) java.util.List<Integer> grades) {}
    public record Assignment(@NotBlank @Size(max=500) String categoryId, @NotBlank String relation) {}
    public record TopicSave(@NotBlank @Size(max=500) String key, @NotBlank String fingerprint,
                            @Min(0) int revision,
                            @NotNull @Size(min=1,max=50) java.util.List<@Valid Assignment> assignments,
                            @NotNull @Size(max=4000) String note) {}

    @GetMapping
    public Map<String, Object> list(@RequestParam(defaultValue="TOPIC") String kind,
            @RequestParam(defaultValue="fizik") String subject,
            @RequestParam(defaultValue="") String exam, @RequestParam(defaultValue="") String topic,
            @RequestParam(defaultValue="") String status, @RequestParam(defaultValue="") String q,
            @RequestParam(defaultValue="") String bank,
            @RequestParam(defaultValue="") String difficulty,
            @RequestParam(defaultValue="") String contentFormat,
            @RequestParam(defaultValue="") String skill,
            @RequestParam(defaultValue="") String labelState,
            @RequestParam(defaultValue="0") int page) {
        return service.list(subject, kind, exam, topic, status, q, bank, difficulty, contentFormat, skill, labelState, page);
    }
    @GetMapping("/catalog")
    public Map<String, Object> catalog() { return service.catalog(); }
    @GetMapping("/item")
    public Map<String, Object> item(@RequestParam String key) { return service.detail(key); }
    @PutMapping
    public Map<String, Object> save(@AuthenticationPrincipal AppUserDetails user, @Valid @RequestBody Save save) {
        return service.save(user.id(), save);
    }
    @GetMapping("/export")
    public Map<String, Object> export() { return service.export(); }

    @PutMapping("/topics")
    public Map<String,Object> topics(@AuthenticationPrincipal AppUserDetails user, @Valid @RequestBody TopicSave save) {
        return service.saveTopics(user.id(),save);
    }

    @GetMapping("/pdf/{id}")
    public ResponseEntity<Resource> pdf(@PathVariable int id) {
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_PDF).cacheControl(CacheControl.noStore())
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.inline().filename(service.pdfFilename(id)).build().toString()).body(service.pdfFile(id));
    }
}
