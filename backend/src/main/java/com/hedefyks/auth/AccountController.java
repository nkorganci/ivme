package com.hedefyks.auth;

import com.hedefyks.auth.AuthDtos.ChangePasswordRequest;
import com.hedefyks.common.ApiException;
import com.hedefyks.user.AppUserDetails;
import com.hedefyks.user.UserRepository;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/account")
public class AccountController {

    private final UserRepository users;
    private final PasswordEncoder encoder;

    public AccountController(UserRepository users, PasswordEncoder encoder) {
        this.users = users;
        this.encoder = encoder;
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
        user.setPasswordHash(encoder.encode(req.newPassword()));
        return ResponseEntity.noContent().build();
    }
}
