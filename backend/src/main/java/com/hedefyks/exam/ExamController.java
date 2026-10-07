package com.hedefyks.exam;

import com.hedefyks.common.PageResponse;
import com.hedefyks.exam.ExamDtos.AnswerRequest;
import com.hedefyks.exam.ExamDtos.CreateExamRequest;
import com.hedefyks.exam.ExamDtos.ExamResult;
import com.hedefyks.exam.ExamDtos.ExamSession;
import com.hedefyks.exam.ExamDtos.HistoryItem;
import com.hedefyks.exam.ExamDtos.SubmitRequest;
import com.hedefyks.exam.ExamDtos.Summary;
import com.hedefyks.user.AppUserDetails;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/exams")
public class ExamController {

    private final ExamService service;

    public ExamController(ExamService service) {
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<ExamSession> create(@AuthenticationPrincipal AppUserDetails me,
                                              @Valid @RequestBody CreateExamRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(me.id(), req));
    }

    @GetMapping("/summary")
    public Summary summary(@AuthenticationPrincipal AppUserDetails me) {
        return service.summary(me.id());
    }

    @GetMapping
    public PageResponse<HistoryItem> history(@AuthenticationPrincipal AppUserDetails me,
                                             @RequestParam(defaultValue = "0") int page,
                                             @RequestParam(defaultValue = "10") int size) {
        return service.history(me.id(), page, size);
    }

    @GetMapping("/{id}")
    public ExamSession get(@AuthenticationPrincipal AppUserDetails me, @PathVariable Long id) {
        return service.session(me.id(), id);
    }

    @PutMapping("/{id}/answers")
    public ResponseEntity<Void> answer(@AuthenticationPrincipal AppUserDetails me, @PathVariable Long id,
                                       @Valid @RequestBody AnswerRequest req) {
        service.saveAnswer(me.id(), id, req.questionId(), req.answer());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/submit")
    public ExamResult submit(@AuthenticationPrincipal AppUserDetails me, @PathVariable Long id,
                             @RequestBody(required = false) SubmitRequest req) {
        return service.submit(me.id(), id, req == null ? null : req.answers());
    }

    @GetMapping("/{id}/result")
    public ExamResult result(@AuthenticationPrincipal AppUserDetails me, @PathVariable Long id) {
        return service.result(me.id(), id);
    }
}
