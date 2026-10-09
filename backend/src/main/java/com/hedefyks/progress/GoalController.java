package com.hedefyks.progress;

import com.hedefyks.user.AppUserDetails;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/goals")
public class GoalController {
    private final GoalService goals;

    public GoalController(GoalService goals) { this.goals = goals; }

    @GetMapping
    public List<GoalService.Goal> list(@AuthenticationPrincipal AppUserDetails me) {
        return goals.list(me.id());
    }

    @PostMapping
    public ResponseEntity<GoalService.Goal> create(@AuthenticationPrincipal AppUserDetails me,
                                                     @RequestBody GoalService.Create input) {
        return ResponseEntity.status(HttpStatus.CREATED).body(goals.create(me.id(), input));
    }

    @PatchMapping("/{id}")
    public GoalService.Goal edit(@AuthenticationPrincipal AppUserDetails me, @PathVariable Long id,
                                 @RequestBody GoalService.Edit input) {
        return goals.edit(me.id(), id, input);
    }

    @PostMapping("/{id}/stop")
    public GoalService.Goal stop(@AuthenticationPrincipal AppUserDetails me, @PathVariable Long id) {
        return goals.stop(me.id(), id);
    }
}
