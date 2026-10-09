package com.hedefyks.question;

import com.hedefyks.common.ApiException;
import com.hedefyks.common.PageResponse;
import com.hedefyks.question.AttemptDtos.AttemptRequest;
import com.hedefyks.question.AttemptDtos.PracticeState;
import com.hedefyks.question.QuestionDtos.FilterRow;
import com.hedefyks.question.QuestionDtos.QuestionDetail;
import com.hedefyks.question.QuestionDtos.QuestionListItem;
import com.hedefyks.storage.ImageStorage;
import com.hedefyks.user.AppUserDetails;
import com.hedefyks.user.Role;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.time.Duration;
import java.util.List;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.MediaTypeFactory;
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
@RequestMapping("/api/questions")
public class QuestionController {

    private final QuestionService service;
    private final QuestionRepository questions;
    private final ImageStorage images;
    private final QrService qr;
    private final AttemptService attempts;
    private final BoardService boards;
    private final QuestionAvailabilityService availability;

    public QuestionController(QuestionService service, QuestionRepository questions, ImageStorage images, QrService qr,
                              AttemptService attempts, BoardService boards, QuestionAvailabilityService availability) {
        this.service = service;
        this.questions = questions;
        this.images = images;
        this.qr = qr;
        this.attempts = attempts;
        this.boards = boards;
        this.availability = availability;
    }

    @GetMapping("/filters")
    public List<FilterRow> filters(@RequestParam(required = false) QuestionBank bank) {
        return service.filters(bank);
    }

    @GetMapping("/availability")
    public QuestionAvailabilityService.Availability availability(QuestionFilter filter,
                                                                 @RequestParam(required = false) Integer topicPdfId,
                                                                 @AuthenticationPrincipal AppUserDetails me) {
        return availability.count(me.id(), filter, topicPdfId);
    }

    @GetMapping
    public PageResponse<QuestionListItem> list(QuestionFilter filter,
                                               @RequestParam(defaultValue = "0") int page,
                                               @RequestParam(defaultValue = "20") int size) {
        return service.list(filter, page, size);
    }

    @GetMapping("/{id}")
    public QuestionDetail byId(@PathVariable Long id, @AuthenticationPrincipal AppUserDetails me) {
        return service.detail(id, me.id());
    }

    @GetMapping("/code/{code}")
    public QuestionDetail byCode(@PathVariable String code, @AuthenticationPrincipal AppUserDetails me) {
        return service.detailByCode(code, me.id());
    }

    @GetMapping("/{id}/neighbor")
    public ResponseEntity<QuestionDetail> neighbor(@PathVariable Long id,
                                                   @RequestParam(defaultValue = "next") String direction,
                                                   QuestionFilter filter,
                                                   @AuthenticationPrincipal AppUserDetails me) {
        boolean next = switch (direction) {
            case "next" -> true;
            case "prev" -> false;
            default -> throw ApiException.badRequest("direction yalnız next veya prev olabilir.");
        };
        return service.neighbor(id, next, filter, me.id())
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @GetMapping("/{id}/practice")
    public PracticeState practice(@PathVariable Long id, @RequestParam(required = false) Long sessionId,
                                  @AuthenticationPrincipal AppUserDetails me) {
        return attempts.state(id, me.id(), sessionId);
    }

    @PostMapping("/{id}/practice")
    public PracticeState practiceEvent(@PathVariable Long id, @Valid @RequestBody AttemptRequest req,
                                       @AuthenticationPrincipal AppUserDetails me) {
        return attempts.submit(id, me.id(), req);
    }

    @GetMapping("/{id}/board")
    public BoardService.Board board(@PathVariable Long id, @AuthenticationPrincipal AppUserDetails me) {
        return boards.get(id, me.id());
    }

    @PutMapping("/{id}/board")
    public BoardService.Board saveBoard(@PathVariable Long id, @RequestBody BoardService.SaveBoard req,
                                        @AuthenticationPrincipal AppUserDetails me) {
        return boards.save(id, me.id(), req);
    }

    @GetMapping("/{id}/image")
    public ResponseEntity<Resource> image(@PathVariable Long id) {
        Question q = questions.findById(id).orElseThrow(() -> ApiException.notFound("Soru bulunamadı."));
        Resource resource = images.load(q.getImage());
        MediaType type = MediaTypeFactory.getMediaType(resource).orElse(MediaType.APPLICATION_OCTET_STREAM);
        return ResponseEntity.ok()
                .contentType(type)
                .cacheControl(CacheControl.maxAge(Duration.ofHours(1)).cachePrivate())
                .body(resource);
    }

    @GetMapping("/{id}/solution-image")
    public ResponseEntity<Resource> solutionImage(@PathVariable Long id,
                                                  @AuthenticationPrincipal AppUserDetails me) {
        Question q = questions.findById(id).orElseThrow(() -> ApiException.notFound("Soru bulunamadı."));
        if (q.getSolutionImage() == null || (me.role() != Role.OPERATOR && !attempts.canSeeSolution(id, me.id()))) {
            throw ApiException.notFound("Bu sorunun çözüm görseli yok.");
        }
        Resource resource = images.load(q.getSolutionImage());
        MediaType type = MediaTypeFactory.getMediaType(resource).orElse(MediaType.APPLICATION_OCTET_STREAM);
        return ResponseEntity.ok()
                .contentType(type)
                .cacheControl(CacheControl.maxAge(Duration.ofHours(1)).cachePrivate())
                .body(resource);
    }

    @GetMapping("/{id}/qr")
    public ResponseEntity<byte[]> qr(@PathVariable Long id, @RequestParam(defaultValue = "300") int size,
                                     HttpServletRequest request) {
        Question q = questions.findById(id).orElseThrow(() -> ApiException.notFound("Soru bulunamadı."));
        String url = qr.questionUrl(request, q.getCode());
        return ResponseEntity.ok()
                .contentType(MediaType.IMAGE_PNG)
                .header("X-Question-Url", url)                       // QR'ın taşıdığı adres (kontrol için)
                .cacheControl(CacheControl.maxAge(Duration.ofHours(1)).cachePrivate())
                .body(qr.png(url, size));
    }
}
