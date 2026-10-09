package com.hedefyks.auth;

import com.hedefyks.auth.AuthDtos.LoginRequest;
import com.hedefyks.auth.AuthDtos.RegisterRequest;
import com.hedefyks.auth.AuthDtos.UserDto;
import com.hedefyks.common.ApiException;
import com.hedefyks.user.AppUserDetails;
import com.hedefyks.user.User;
import com.hedefyks.user.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.time.Duration;
import java.util.Locale;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final AuthenticationManager authManager;
    private final SecurityContextRepository contextRepository;

    // Kaba kuvvet koruması: aynı IP + kullanıcı için 10 dk'da 8, aynı IP için toplam 40 hatalı giriş; IP başına saatte 10 kayıt
    private final SlidingWindowLimiter loginPerUser = new SlidingWindowLimiter(8, Duration.ofMinutes(10));
    private final SlidingWindowLimiter loginPerIp = new SlidingWindowLimiter(40, Duration.ofMinutes(10));
    private final SlidingWindowLimiter registerPerIp = new SlidingWindowLimiter(10, Duration.ofHours(1));

    public AuthController(UserRepository users, PasswordEncoder encoder, AuthenticationManager authManager,
                          SecurityContextRepository contextRepository) {
        this.users = users;
        this.encoder = encoder;
        this.authManager = authManager;
        this.contextRepository = contextRepository;
    }

    @PostMapping("/register")
    public ResponseEntity<UserDto> register(@Valid @RequestBody RegisterRequest req, HttpServletRequest request) {
        String ip = clientIp(request);
        if (registerPerIp.isBlocked(ip)) {
            throw tooManyRequests("Çok fazla kayıt denemesi yapıldı. Lütfen daha sonra tekrar dene.");
        }
        registerPerIp.record(ip);
        String username = req.username().trim();
        String email = req.email().trim();
        String phone = PhoneNumbers.normalize(req.phone());
        PasswordRules.checkBytes(req.password(), "password");
        if (users.existsByUsername(username)) {
            throw new ApiException(HttpStatus.CONFLICT, "Bu kullanıcı adı alınmış.",
                    Map.of("username", "Bu kullanıcı adı alınmış."));
        }
        if (users.existsByEmail(email)) {
            throw new ApiException(HttpStatus.CONFLICT, "Bu e-posta ile zaten bir hesap var.",
                    Map.of("email", "Bu e-posta ile zaten bir hesap var."));
        }
        User u = new User();
        u.setUsername(username);
        u.setEmail(email);
        u.setPhone(phone);
        u.setPasswordHash(encoder.encode(req.password()));
        users.save(u);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(UserDto.of(u));
    }

    @PostMapping("/login")
    public UserDto login(@Valid @RequestBody LoginRequest req, HttpServletRequest request, HttpServletResponse response) {
        String ip = clientIp(request);
        String userKey = ip + "|" + req.login().trim().toLowerCase(Locale.ROOT);
        if (loginPerUser.isBlocked(userKey) || loginPerIp.isBlocked(ip)) {
            throw tooManyRequests("Çok fazla hatalı giriş denemesi. Lütfen birkaç dakika sonra tekrar dene.");
        }
        Authentication auth;
        try {
            auth = authManager.authenticate(UsernamePasswordAuthenticationToken.unauthenticated(
                    req.login().trim(), req.password()));
        } catch (AuthenticationException e) {
            loginPerUser.record(userKey);
            loginPerIp.record(ip);
            // Hangi alanın yanlış olduğunu söylemeyiz (kullanıcı adı sızdırmamak için)
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Kullanıcı adı veya şifre hatalı");
        }
        loginPerUser.clear(userKey);
        if (request.getSession(false) != null) {
            request.changeSessionId();                       // oturum sabitlemeye karşı
        }
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(auth);
        SecurityContextHolder.setContext(context);
        contextRepository.saveContext(context, request, response);
        AppUserDetails principal = (AppUserDetails) auth.getPrincipal();
        return UserDto.of(users.findById(principal.id())
                .orElseThrow(() -> ApiException.notFound("Kullanıcı bulunamadı.")));
    }

    private static ApiException tooManyRequests(String message) {
        return new ApiException(HttpStatus.TOO_MANY_REQUESTS, message);
    }

    /** Yalnız yerel cloudflared vekilinden gelen istemci başlığına güvenir. */
    private static String clientIp(HttpServletRequest request) {
        String remote = request.getRemoteAddr();
        if (!"127.0.0.1".equals(remote) && !"::1".equals(remote)
                && !"0:0:0:0:0:0:0:1".equals(remote)) {
            return remote;
        }
        String ip = request.getHeader("CF-Connecting-IP");
        if (ip != null && ip.length() <= 45 && ip.matches("[0-9A-Fa-f:.]+")) {
            return ip;
        }
        return remote;
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest request) {
        var session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }
        SecurityContextHolder.clearContext();
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    public UserDto me(@AuthenticationPrincipal AppUserDetails me) {
        return UserDto.of(users.findById(me.id())
                .orElseThrow(() -> ApiException.notFound("Kullanıcı bulunamadı.")));
    }
}
