package com.hedefyks.question;

import com.hedefyks.user.AppUserDetails;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** TAS-06: kişisel zorluk etiketi ve tekrar tercihi. Kullanıcı oturumdan belirlenir; başka öğrencinin işareti okunamaz. */
@RestController
@RequestMapping("/api/question-preferences")
public class QuestionPreferenceController {
    public record ResetBody(String scope) {}

    private final QuestionPreferenceService service;

    public QuestionPreferenceController(QuestionPreferenceService service) {
        this.service = service;
    }

    @GetMapping("/summary")
    public QuestionPreferenceService.Summary summary(@AuthenticationPrincipal AppUserDetails me) {
        return service.summary(me.id());
    }

    @GetMapping("/questions/{id}")
    public QuestionPreferenceService.State state(@AuthenticationPrincipal AppUserDetails me, @PathVariable Long id) {
        return service.state(me.id(), id);
    }

    /** Gövde: {"difficulty":"ZOR|ORTA|KOLAY|NONE","repeat":"AGAIN|HIDE|DEFAULT"}; olmayan alan değişmez. */
    @PutMapping("/questions/{id}")
    public QuestionPreferenceService.State change(@AuthenticationPrincipal AppUserDetails me, @PathVariable Long id,
                                                  @RequestBody QuestionPreferenceService.Change body) {
        return service.change(me.id(), id, body);
    }

    @PostMapping("/reset")
    public QuestionPreferenceService.Summary reset(@AuthenticationPrincipal AppUserDetails me, @RequestBody ResetBody body) {
        return service.reset(me.id(), body == null ? null : body.scope());
    }
}
