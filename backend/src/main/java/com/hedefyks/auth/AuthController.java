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

    public AuthController(UserRepository users, PasswordEncoder encoder, AuthenticationManager authManager,
                          SecurityContextRepository contextRepository) {
        this.users = users;
        this.encoder = encoder;
        this.authManager = authManager;
        this.contextRepository = contextRepository;
    }

    @PostMapping("/register")
    public ResponseEntity<UserDto> register(@Valid @RequestBody RegisterRequest req) {
        String username = req.username().trim();
        String email = req.email().trim();
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
        u.setPasswordHash(encoder.encode(req.password()));
        users.save(u);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new UserDto(u.getId(), u.getUsername(), u.getEmail(), u.getRole()));
    }

    @PostMapping("/login")
    public UserDto login(@Valid @RequestBody LoginRequest req, HttpServletRequest request, HttpServletResponse response) {
        Authentication auth;
        try {
            auth = authManager.authenticate(UsernamePasswordAuthenticationToken.unauthenticated(
                    req.login().trim(), req.password()));
        } catch (AuthenticationException e) {
            // Hangi alanın yanlış olduğunu söylemeyiz (kullanıcı adı sızdırmamak için)
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Kullanıcı adı veya şifre hatalı");
        }
        if (request.getSession(false) != null) {
            request.changeSessionId();                       // oturum sabitlemeye karşı
        }
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(auth);
        SecurityContextHolder.setContext(context);
        contextRepository.saveContext(context, request, response);
        return UserDto.of((AppUserDetails) auth.getPrincipal());
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
        return UserDto.of(me);
    }
}
