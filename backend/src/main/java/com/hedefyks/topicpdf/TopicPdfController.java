package com.hedefyks.topicpdf;

import com.hedefyks.common.PageResponse;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/topic-pdfs")
public class TopicPdfController {

    private final TopicPdfService service;

    public TopicPdfController(TopicPdfService service) {
        this.service = service;
    }

    @GetMapping
    public PageResponse<TopicPdfService.Item> list(@RequestParam(required = false) String exam,
            @RequestParam(required = false) String subject, @RequestParam(required = false) String kind,
            @RequestParam(required = false, name = "q") String search,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        return service.list(exam, subject, kind, search, page, size);
    }

    @GetMapping("/filters")
    public TopicPdfService.Filters filters() {
        return service.filters();
    }

    @GetMapping("/{id}")
    public TopicPdfService.Item detail(@PathVariable int id) {
        return service.detail(id);
    }

    @GetMapping("/{id}/file")
    public ResponseEntity<Resource> file(@PathVariable int id) {
        Resource pdf = service.file(id);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=ogm-" + id + ".pdf")
                .cacheControl(CacheControl.noStore())
                .body(pdf);
    }
}
