package com.hedefyks.question;

import com.hedefyks.common.ApiException;
import com.hedefyks.common.PageResponse;
import com.hedefyks.question.QuestionDtos.CheckRequest;
import com.hedefyks.question.QuestionDtos.CheckResponse;
import com.hedefyks.question.QuestionDtos.FilterRow;
import com.hedefyks.question.QuestionDtos.QuestionDetail;
import com.hedefyks.question.QuestionDtos.QuestionListItem;
import com.hedefyks.storage.ImageStorage;
import com.hedefyks.user.AppUserDetails;
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

    public QuestionController(QuestionService service, QuestionRepository questions, ImageStorage images, QrService qr) {
        this.service = service;
        this.questions = questions;
        this.images = images;
        this.qr = qr;
    }

    @GetMapping("/filters")
    public List<FilterRow> filters() {
        return service.filters();
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

    @PostMapping("/{id}/check")
    public CheckResponse check(@PathVariable Long id, @Valid @RequestBody CheckRequest req) {
        return service.check(id, req.answer());
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

    @GetMapping("/{id}/qr")
    public ResponseEntity<byte[]> qr(@PathVariable Long id, @RequestParam(defaultValue = "300") int size) {
        Question q = questions.findById(id).orElseThrow(() -> ApiException.notFound("Soru bulunamadı."));
        return ResponseEntity.ok()
                .contentType(MediaType.IMAGE_PNG)
                .cacheControl(CacheControl.maxAge(Duration.ofHours(1)).cachePrivate())
                .body(qr.png(q.getCode(), size));
    }
}
