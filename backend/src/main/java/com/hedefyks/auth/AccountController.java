package com.hedefyks.auth;

import com.hedefyks.auth.AuthDtos.ChangePasswordRequest;
import com.hedefyks.auth.AuthDtos.ContactDto;
import com.hedefyks.auth.AuthDtos.UpdateContactRequest;
import com.hedefyks.common.ApiException;
import com.hedefyks.user.AppUserDetails;
import com.hedefyks.user.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/account")
public class AccountController {

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final AccountDataService accountData;

    public AccountController(UserRepository users, PasswordEncoder encoder, AccountDataService accountData) {
        this.users = users;
        this.encoder = encoder;
        this.accountData = accountData;
    }

    public record ConfirmPassword(@NotBlank String currentPassword) {}
    public record ConfirmDeletion(@NotBlank String currentPassword, String confirmation) {}

    @PostMapping("/export")
    public ResponseEntity<Map<String, Object>> export(@AuthenticationPrincipal AppUserDetails me,
            @Valid @RequestBody ConfirmPassword req) {
        return ResponseEntity.ok()
                .header("Cache-Control", "no-store")
                .body(accountData.export(me.id(), req.currentPassword()));
    }

    @PostMapping("/delete")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal AppUserDetails me,
            @Valid @RequestBody ConfirmDeletion req, HttpServletRequest request) {
        if (!"HESABIMI SIL".equals(req.confirmation())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Onay metnini tam olarak yaz.",
                    Map.of("confirmation", "HESABIMI SIL yaz."));
        }
        accountData.erase(me.id(), req.currentPassword());
        var session = request.getSession(false);
        if (session != null) session.invalidate();
        SecurityContextHolder.clearContext();
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/contact")
    public ContactDto contact(@AuthenticationPrincipal AppUserDetails me) {
        var user = users.findById(me.id()).orElseThrow(() -> ApiException.notFound("Kullanıcı bulunamadı."));
        return new ContactDto(user.getEmail(), user.getPhone());
    }

    /** İletişim bilgisi değişikliği mevcut şifre ile yeniden doğrulanır. */
    @PutMapping("/contact")
    @Transactional
    public ContactDto updateContact(@AuthenticationPrincipal AppUserDetails me,
                                    @Valid @RequestBody UpdateContactRequest req) {
        var user = users.findById(me.id()).orElseThrow(() -> ApiException.notFound("Kullanıcı bulunamadı."));
        if (!encoder.matches(req.currentPassword(), user.getPasswordHash())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Mevcut şifre hatalı.",
                    Map.of("currentPassword", "Mevcut şifre hatalı."));
        }
        String email = req.email().trim();
        String phone = PhoneNumbers.normalize(req.phone());
        if (!email.equalsIgnoreCase(user.getEmail()) && users.existsByEmail(email)) {
            throw new ApiException(HttpStatus.CONFLICT, "Bu e-posta ile zaten bir hesap var.",
                    Map.of("email", "Bu e-posta ile zaten bir hesap var."));
        }
        user.setEmail(email);
        user.setPhone(phone);
        return new ContactDto(user.getEmail(), user.getPhone());
    }

    /** Oturum açmış kullanıcı (yönetici dahil) kendi şifresini değiştirir. */
    @PutMapping("/password")
    @Transactional
    public ResponseEntity<Void> changePassword(@AuthenticationPrincipal AppUserDetails me,
                                               @Valid @RequestBody ChangePasswordRequest req) {
        var user = users.findById(me.id()).orElseThrow(() -> ApiException.notFound("Kullanıcı bulunamadı."));
        if (!encoder.matches(req.currentPassword(), user.getPasswordHash())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Mevcut şifre hatalı.",
                    Map.of("currentPassword", "Mevcut şifre hatalı."));
        }
        PasswordRules.checkBytes(req.newPassword(), "newPassword");
        user.setPasswordHash(encoder.encode(req.newPassword()));
        user.setPasswordChangeRequired(false);
        return ResponseEntity.noContent().build();
    }
}
