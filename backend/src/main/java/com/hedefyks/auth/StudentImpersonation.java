package com.hedefyks.auth;

import com.hedefyks.common.ApiException;
import com.hedefyks.user.AppUserDetails;
import com.hedefyks.user.Role;
import com.hedefyks.user.User;
import com.hedefyks.user.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

/** The original manager identity stays server-side; student requests have only student authorities. */
@RestController
public class StudentImpersonation {
    private static final String MANAGER_KEY = StudentImpersonation.class.getName() + ".managerId";
    private final UserRepository users;
    private final JdbcTemplate jdbc;
    private final SecurityContextRepository contexts;

    public StudentImpersonation(UserRepository users, JdbcTemplate jdbc, SecurityContextRepository contexts) {
        this.users = users; this.jdbc = jdbc; this.contexts = contexts;
    }

    public static Long managerId(HttpSession session) {
        return session != null && session.getAttribute(MANAGER_KEY) instanceof Long id ? id : null;
    }

    public static void clearManager(HttpSession session) {
        if (session != null) session.removeAttribute(MANAGER_KEY);
    }

    public static boolean activeManager(User user) {
        return user != null && user.getRole() == Role.ADMIN && user.isSiteManager()
                && user.isEnabled() && user.isApproved() && user.getArchivedAt() == null;
    }

    @PostMapping("/api/admin/accounts/{id}/impersonate")
    public AuthDtos.UserDto start(@PathVariable Long id, @AuthenticationPrincipal AppUserDetails me,
                                 HttpServletRequest request, HttpServletResponse response) {
        User manager = users.findById(me.id()).orElse(null);
        if (!activeManager(manager) || managerId(request.getSession(false)) != null)
            throw new ApiException(HttpStatus.FORBIDDEN, "Öğrenci hesabına yalnız site yöneticisi geçebilir.");
        User student = users.findById(id).orElseThrow(() -> ApiException.notFound("Öğrenci bulunamadı."));
        if (student.getRole() != Role.USER || student.isSiteManager())
            throw ApiException.badRequest("Yalnız öğrenci hesabına geçilebilir.");
        if (!student.isEnabled() || !student.isApproved() || student.getArchivedAt() != null)
            throw new ApiException(HttpStatus.CONFLICT, "Öğrenci hesabı onaylı ve etkin olmalıdır.");
        jdbc.update("INSERT INTO account_audit(actor_id,target_id,action) VALUES (?,?,'IMPERSONATE_START')", me.id(), id);
        request.getSession().setAttribute(MANAGER_KEY, me.id());
        authenticate(student, request, response);
        return AuthDtos.UserDto.of(student, true);
    }

    @PostMapping("/api/auth/impersonation/stop")
    public AuthDtos.UserDto stop(@AuthenticationPrincipal AppUserDetails me,
                                HttpServletRequest request, HttpServletResponse response) {
        Long managerId = managerId(request.getSession(false));
        if (managerId == null) throw new ApiException(HttpStatus.FORBIDDEN, "Yöneticiye dönüş oturumu bulunamadı.");
        User manager = users.findById(managerId).orElse(null);
        if (!activeManager(manager)) throw new ApiException(HttpStatus.FORBIDDEN, "Yönetici yetkisi artık etkin değil.");
        jdbc.update("INSERT INTO account_audit(actor_id,target_id,action) VALUES (?,?,'IMPERSONATE_STOP')", managerId, me.id());
        request.getSession().removeAttribute(MANAGER_KEY);
        authenticate(manager, request, response);
        return AuthDtos.UserDto.of(manager);
    }

    private void authenticate(User user, HttpServletRequest request, HttpServletResponse response) {
        request.changeSessionId();
        var principal = AppUserDetails.of(user);
        var context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(UsernamePasswordAuthenticationToken.authenticated(principal, null, principal.getAuthorities()));
        SecurityContextHolder.setContext(context);
        contexts.saveContext(context, request, response);
    }
}
