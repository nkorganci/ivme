package com.hedefyks.progress;

import com.hedefyks.user.AppUserDetails;
import java.time.LocalDate;
import java.util.List;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/study-program")
public class StudyProgramController {
    private final StudyProgramService program;

    public StudyProgramController(StudyProgramService program) { this.program = program; }

    @GetMapping
    public List<StudyProgramService.Week> list(@AuthenticationPrincipal AppUserDetails me,
            @RequestParam LocalDate start, @RequestParam LocalDate end) {
        return program.list(me.id(), start, end);
    }

    @GetMapping("/index")
    public List<LocalDate> index(@AuthenticationPrincipal AppUserDetails me) {
        return program.index(me.id());
    }

    @PutMapping
    public List<StudyProgramService.Week> save(@AuthenticationPrincipal AppUserDetails me,
            @RequestBody StudyProgramService.Save input) {
        return program.save(me.id(), input);
    }
}
