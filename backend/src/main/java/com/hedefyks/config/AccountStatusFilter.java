package com.hedefyks.config;

import com.hedefyks.user.AppUserDetails;
import com.hedefyks.user.UserRepository;
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
        if (authentication != null && authentication.getPrincipal() instanceof AppUserDetails principal
                && !users.accountActive(principal.id())) {
            var session = request.getSession(false);
            if (session != null) session.invalidate();
            SecurityContextHolder.clearContext();
        }
        chain.doFilter(request, response);
    }
}
