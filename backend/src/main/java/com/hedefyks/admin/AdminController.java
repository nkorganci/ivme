package com.hedefyks.admin;

import com.hedefyks.admin.AdminDtos.AdminFeedback;
import com.hedefyks.admin.AdminDtos.AdminQuestion;
import com.hedefyks.admin.AdminDtos.QuestionUpdate;
import com.hedefyks.admin.AdminDtos.ReportedQuestion;
import com.hedefyks.admin.AdminDtos.ResolveRequest;
import com.hedefyks.admin.AdminDtos.Stats;
import com.hedefyks.common.ApiException;
import com.hedefyks.common.PageResponse;
import com.hedefyks.feedback.FeedbackCategory;
import com.hedefyks.importer.ImportMode;
import com.hedefyks.importer.ImportReport;
import com.hedefyks.importer.QuestionImportService;
import com.hedefyks.question.QuestionFilter;
import com.hedefyks.user.AppUserDetails;
import jakarta.validation.Valid;
import java.io.IOException;
import java.util.List;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/** Yalnız ADMIN (SecurityConfig: /api/admin/** → hasRole ADMIN). */
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminService service;
    private final QuestionImportService importer;

    public AdminController(AdminService service, QuestionImportService importer) {
        this.service = service;
        this.importer = importer;
    }

    @GetMapping("/stats")
    public Stats stats() {
        return service.stats();
    }

    @GetMapping("/questions")
    public PageResponse<AdminQuestion> questions(@RequestParam(required = false) String query, QuestionFilter filter,
                                                 @RequestParam(required = false) Boolean active,
                                                 @RequestParam(defaultValue = "0") int page,
                                                 @RequestParam(defaultValue = "20") int size) {
        return service.questions(query, filter, active, page, size);
    }

    @GetMapping("/questions/{id}")
    public AdminQuestion question(@PathVariable Long id) {
        return service.question(id);
    }

    @PutMapping("/questions/{id}")
    public AdminQuestion update(@PathVariable Long id, @Valid @RequestBody QuestionUpdate req) {
        return service.update(id, req);
    }

    @GetMapping("/feedback")
    public PageResponse<AdminFeedback> feedback(@RequestParam(required = false) FeedbackCategory category,
                                                @RequestParam(required = false) Boolean resolved,
                                                @RequestParam(defaultValue = "0") int page,
                                                @RequestParam(defaultValue = "20") int size) {
        return service.feedback(category, resolved, page, size);
    }

    @PatchMapping("/feedback/{id}")
    public AdminFeedback resolve(@PathVariable Long id, @Valid @RequestBody ResolveRequest req,
                                 @AuthenticationPrincipal AppUserDetails me) {
        return service.resolve(id, req.resolved(), me.id());
    }

    @GetMapping("/reported-questions")
    public List<ReportedQuestion> reported() {
        return service.reportedQuestions();
    }

    @PostMapping("/import")
    public ImportReport importQuestions(@RequestParam("file") MultipartFile file,
                                        @RequestParam(defaultValue = "INSERT_ONLY") ImportMode mode,
                                        @RequestParam(defaultValue = "true") boolean dryRun) throws IOException {
        if (file.isEmpty()) {
            throw ApiException.badRequest("Dosya boş.");
        }
        return importer.run(file.getBytes(), file.getOriginalFilename(), mode, dryRun);
    }
}
