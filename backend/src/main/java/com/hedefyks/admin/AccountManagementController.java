package com.hedefyks.admin;

import com.hedefyks.common.PageResponse;
import com.hedefyks.user.AppUserDetails;
import com.hedefyks.user.Role;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/accounts")
public class AccountManagementController {
    public record StatusRequest(@NotNull Boolean enabled, @NotNull @Size(max=500) String reason) {}
    public record DeleteRequest(@NotBlank String confirmation, @NotNull @Size(max=500) String reason) {}
    private final AccountManagementService service;
    public AccountManagementController(AccountManagementService service) { this.service=service; }

    @GetMapping
    public PageResponse<AccountManagementService.Account> list(@RequestParam(required=false) Role role,
            @RequestParam(required=false) Boolean approved,
            @RequestParam(defaultValue="") String query,@RequestParam(defaultValue="0") int page,
            @RequestParam(defaultValue="25") int size) {
        return service.list(role,approved,query,page,size);
    }
    @GetMapping("/summary") public AccountManagementService.Summary summary() { return service.summary(); }

    @PatchMapping("/{id}/approval")
    public AccountManagementService.Account approve(@PathVariable Long id, @AuthenticationPrincipal AppUserDetails me) {
        return service.approve(me.id(), id);
    }

    @PatchMapping("/{id}/status")
    public AccountManagementService.Account status(@PathVariable Long id,@AuthenticationPrincipal AppUserDetails me,
            @Valid @RequestBody StatusRequest request) {
        return service.status(me.id(),id,request.enabled(),request.reason());
    }
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id,@AuthenticationPrincipal AppUserDetails me,
            @Valid @RequestBody DeleteRequest request) {
        service.delete(me.id(),id,request.confirmation(),request.reason());
        return ResponseEntity.noContent().build();
    }
}
