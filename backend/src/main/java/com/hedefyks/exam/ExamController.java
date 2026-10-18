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
import com.hedefyks.question.HintService;
import com.hedefyks.question.ExamType;
import com.hedefyks.question.QuestionBank;
import com.hedefyks.question.QuestionSelectionMode;
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
    private final HintService hints;
    private final ExamPlanService plans;

    public ExamController(ExamService service, HintService hints, ExamPlanService plans) {
        this.service = service;
        this.hints = hints;
        this.plans = plans;
    }

    @PostMapping
    public ResponseEntity<ExamSession> create(@AuthenticationPrincipal AppUserDetails me,
                                              @Valid @RequestBody CreateExamRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(me.id(), req));
    }

    @GetMapping("/plan")
    public ExamPlanService.Plan plan(@AuthenticationPrincipal AppUserDetails me,
                                     @RequestParam(required = false) QuestionBank bank,
                                     @RequestParam ExamType examType,
                                     @RequestParam(required = false) ExamTrack track,
                                     @RequestParam(defaultValue = "MIXED") QuestionSelectionMode selectionMode,
                                     @RequestParam(defaultValue = "true") boolean includeSolved,
                                     @RequestParam(required = false) Integer questionCount) {
        return questionCount == null ? plans.fullPlan(me.id(), bank, examType, track, includeSolved)
                : plans.plan(me.id(), bank, examType, track, selectionMode, questionCount);
    }

    @PostMapping("/full")
    public ResponseEntity<ExamSession> createFull(@AuthenticationPrincipal AppUserDetails me,
                                                  @Valid @RequestBody ExamDtos.FullExamRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createFull(me.id(), req));
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

    @PostMapping("/{id}/cancel")
    public ResponseEntity<Void> cancel(@AuthenticationPrincipal AppUserDetails me, @PathVariable Long id) {
        service.cancel(me.id(), id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/result")
    public ExamResult result(@AuthenticationPrincipal AppUserDetails me, @PathVariable Long id) {
        return service.result(me.id(), id);
    }

    @GetMapping("/{id}/questions/{questionId}/explanation")
    public ResponseEntity<HintService.Explanation> explanation(@AuthenticationPrincipal AppUserDetails me,
            @PathVariable Long id, @PathVariable Long questionId) {
        return hints.examExplanation(id, questionId, me.id()).map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }
}
