package com.hedefyks.config;

import com.hedefyks.user.AppUserDetails;
import com.hedefyks.user.UserRepository;
import com.hedefyks.auth.StudentImpersonation;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

/** Revoke existing sessions on the next API request after blocking or account deletion. */
final class AccountStatusFilter extends OncePerRequestFilter {
    private final UserRepository users;
    AccountStatusFilter(UserRepository users) { this.users = users; }

    @Override protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().startsWith("/api/");
    }

    @Override protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                               FilterChain chain) throws ServletException, IOException {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        Long managerId = StudentImpersonation.managerId(request.getSession(false));
        boolean managerRevoked = managerId != null
                && !StudentImpersonation.activeManager(users.findById(managerId).orElse(null));
        if (authentication != null && authentication.getPrincipal() instanceof AppUserDetails principal
                && (!users.accountActive(principal.id()) || managerRevoked)) {
            var session = request.getSession(false);
            if (session != null) session.invalidate();
            SecurityContextHolder.clearContext();
        }
        // An old tab must never save its form into a newly selected student's account.
        String expectedUser = request.getHeader("X-Ivme-User-Id");
        var current = SecurityContextHolder.getContext().getAuthentication();
        if (expectedUser != null && current != null && current.getPrincipal() instanceof AppUserDetails principal
                && !expectedUser.equals(principal.id().toString())) {
            response.setStatus(409);
            response.setHeader("X-Ivme-Account-Changed", "true");
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write("{\"hata\":\"Hesap değişti. Sayfayı yenileyip tekrar dene.\"}");
            return;
        }
        chain.doFilter(request, response);
    }
}
