package com.hedefyks.review;

import java.util.*;
import org.springframework.core.io.Resource;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/learning-resources")
public class LearningResourceController {
    private final LearningResourceService resources;
    private final ContentReviewService reviews;
    public LearningResourceController(LearningResourceService resources,ContentReviewService reviews) {this.resources=resources;this.reviews=reviews;}
    @GetMapping("/metadata") public Map<String,Object> metadata(){return resources.metadata();}
    @GetMapping("/coverage") public Map<String,Object> coverage(@RequestParam String exam,@RequestParam String subject){return resources.coverage(exam,subject);}
    @GetMapping public Map<String,Object> list(@RequestParam(defaultValue="") String exam,
        @RequestParam(defaultValue="") String subject,@RequestParam(defaultValue="") String kind,
        @RequestParam(defaultValue="") List<String> categoryId,@RequestParam(defaultValue="ANY") String match,
        @RequestParam(defaultValue="") String q,@RequestParam(defaultValue="false") boolean approvedOnly,
        @RequestParam(defaultValue="") String contentFormat,@RequestParam(defaultValue="") String skill,
        @RequestParam(required=false) Integer grade,
        @RequestParam(defaultValue="false") boolean availableOnly,
        @RequestParam(defaultValue="false") boolean manualReviewOnly,
        @RequestParam(defaultValue="") String manualReviewType,
        @RequestParam(defaultValue="true") boolean includeCandidates,
        @RequestParam(defaultValue="false") boolean bankOnly,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="") String pdfKind,
        @RequestParam(defaultValue="") String questionTypeId,@RequestParam(defaultValue="") String teacherDifficulty,
        @RequestParam(defaultValue="") String labelStatus) {
        return resources.list(exam,subject,kind,categoryId,match,q,contentFormat,skill,grade,approvedOnly,availableOnly,manualReviewOnly,manualReviewType,includeCandidates,bankOnly,page,pdfKind,questionTypeId,teacherDifficulty,labelStatus);
    }
    @GetMapping("/item") public Map<String,Object> item(@RequestParam String key){return resources.item(key);}
    @GetMapping("/items") public Map<String,Map<String,Object>> items(@RequestParam List<String> key){return resources.items(key);}
    @GetMapping("/progress") public Map<String,Object> progress(
        @org.springframework.security.core.annotation.AuthenticationPrincipal com.hedefyks.user.AppUserDetails me,
        @RequestParam(defaultValue="CURRENT") String classification){return resources.progress(me.id(),classification);}
    @GetMapping("/pdf/{id}") public ResponseEntity<Resource> pdf(@PathVariable int id) {
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_PDF)
            .header(HttpHeaders.CONTENT_DISPOSITION,ContentDisposition.inline().filename(reviews.pdfFilename(id)).build().toString())
            .cacheControl(CacheControl.noStore()).body(reviews.pdfFile(id));
    }
}
