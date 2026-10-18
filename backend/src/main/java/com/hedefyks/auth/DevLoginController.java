package com.hedefyks.auth;

import com.hedefyks.auth.AuthDtos.UserDto;
import com.hedefyks.common.ApiException;
import com.hedefyks.progress.LoginActivity;
import com.hedefyks.user.AppUserDetails;
import com.hedefyks.user.Role;
import com.hedefyks.user.User;
import com.hedefyks.user.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Geliştirme sırasında yalnız bu bilgisayardan, var olan öğrenci hesabıyla oturum açar. */
@RestController
@Profile("dev")
@RequestMapping("/api/auth")
public class DevLoginController {
    private final UserRepository users;
    private final SecurityContextRepository contexts;
    private final LoginActivity activity;
    private final String studentLogin;

    @GetMapping("/dev-review-available")
    public boolean reviewAvailable(HttpServletRequest request) { return localRequest(request); }

    public DevLoginController(UserRepository users, SecurityContextRepository contexts, LoginActivity activity,
                              @Value("${app.dev-auto-user:nazile}") String studentLogin) {
        this.users = users;
        this.contexts = contexts;
        this.activity = activity;
        this.studentLogin = studentLogin;
    }

    @PostMapping("/dev-login")
    public UserDto login(HttpServletRequest request, HttpServletResponse response) {
        return localLogin(request, response, studentLogin, Role.USER);
    }

    /** Explicit local teacher-mode switch; never available through a tunnel or production profile. */
    @PostMapping({"/dev-physics-review-login", "/dev-teacher-review-login"})
    public UserDto physicsReviewer(HttpServletRequest request, HttpServletResponse response) {
        return localLogin(request, response, "ivmeoperator", Role.OPERATOR);
    }

    private UserDto localLogin(HttpServletRequest request, HttpServletResponse response, String login, Role role) {
        if (!localRequest(request)) throw new ApiException(HttpStatus.FORBIDDEN, "Yalnız yerel geliştirmede kullanılabilir.");
        User student = users.findByLogin(login)
                .filter(user -> (user.getRole() == role || (role==Role.USER && user.isSiteManager())) && user.isEnabled())
                .orElseThrow(() -> ApiException.notFound("Yerel otomatik giriş için öğrenci hesabı bulunamadı."));
        AppUserDetails principal = AppUserDetails.of(student);
        Authentication auth = UsernamePasswordAuthenticationToken.authenticated(
                principal, null, principal.getAuthorities());
        if (request.getSession(false) != null) request.changeSessionId();
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(auth);
        SecurityContextHolder.setContext(context);
        contexts.saveContext(context, request, response);
        activity.login(principal.id(), request.getSession());
        return UserDto.of(student);
    }

    private static boolean localRequest(HttpServletRequest request) {
        if (request.getHeader("CF-Connecting-IP") != null || request.getHeader("Forwarded") != null
                || request.getHeader("X-Forwarded-For") != null) return false;
        String remote = request.getRemoteAddr();
        if (!"127.0.0.1".equals(remote) && !"::1".equals(remote)
                && !"0:0:0:0:0:0:0:1".equals(remote)) return false;
        return localHost(request.getServerName()) &&
                (request.getHeader("X-Forwarded-Host") == null
                        || localHost(request.getHeader("X-Forwarded-Host")));
    }

    private static boolean localHost(String host) {
        return host != null && host.matches("(?i)^(localhost|127\\.0\\.0\\.1|\\[::1\\]|::1)(:\\d{1,5})?$");
    }
}
