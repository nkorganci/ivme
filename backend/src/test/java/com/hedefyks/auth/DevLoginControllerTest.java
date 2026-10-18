package com.hedefyks.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.hedefyks.common.ApiException;
import com.hedefyks.progress.LoginActivity;
import com.hedefyks.user.Role;
import com.hedefyks.user.User;
import com.hedefyks.user.UserRepository;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;

class DevLoginControllerTest {
    private final UserRepository users = mock(UserRepository.class);
    private final SecurityContextRepository contexts = mock(SecurityContextRepository.class);
    private final LoginActivity activity = mock(LoginActivity.class);
    private final DevLoginController controller = new DevLoginController(users, contexts, activity, "nazile");

    @Test
    void localStudentCanOpenSessionWithoutPassword() {
        User student = new User();
        student.setId(12L);
        student.setUsername("nazile");
        student.setEmail("nazile@example.com");
        student.setPasswordHash("unused");
        when(users.findByLogin("nazile")).thenReturn(Optional.of(student));
        MockHttpServletRequest request = localRequest();

        try {
            assertThat(controller.login(request, new MockHttpServletResponse()).id()).isEqualTo(12L);
            verify(contexts).saveContext(any(), any(), any());
            verify(activity).login(12L, request.getSession());
        } finally {
            SecurityContextHolder.clearContext();
        }
    }

    @Test
    void anotherAccountOrDisabledStudentCannotBeUsed() {
        User account = new User();
        account.setRole(Role.ADMIN);
        when(users.findByLogin("nazile")).thenReturn(Optional.of(account));
        assertThatThrownBy(() -> controller.login(localRequest(), new MockHttpServletResponse()))
                .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
        account.setRole(Role.USER);
        account.setEnabled(false);
        assertThatThrownBy(() -> controller.login(localRequest(), new MockHttpServletResponse()))
                .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void forwardedAndRemoteRequestsCannotAutoLogin() {
        MockHttpServletRequest tunnel = localRequest();
        tunnel.addHeader("CF-Connecting-IP", "203.0.113.10");
        assertThatThrownBy(() -> controller.login(tunnel, new MockHttpServletResponse()))
                .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.getStatus()).isEqualTo(HttpStatus.FORBIDDEN));

        MockHttpServletRequest forwarded = localRequest();
        forwarded.addHeader("X-Forwarded-Host", "net.ivme.dev");
        assertThatThrownBy(() -> controller.login(forwarded, new MockHttpServletResponse()))
                .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.getStatus()).isEqualTo(HttpStatus.FORBIDDEN));

        MockHttpServletRequest remote = localRequest();
        remote.setRemoteAddr("203.0.113.10");
        assertThatThrownBy(() -> controller.login(remote, new MockHttpServletResponse()))
                .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
    }

    private static MockHttpServletRequest localRequest() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setServerName("localhost");
        request.setRemoteAddr("127.0.0.1");
        return request;
    }

    @Test
    void teacherSwitchUsesExistingOperatorAndRejectsTunnel() {
        User teacher = new User();
        teacher.setId(20L); teacher.setUsername("ivmeoperator"); teacher.setEmail("teacher@example.com");
        teacher.setRole(Role.OPERATOR); teacher.setPasswordHash("unused");
        when(users.findByLogin("ivmeoperator")).thenReturn(Optional.of(teacher));
        try {
            assertThat(controller.physicsReviewer(localRequest(), new MockHttpServletResponse()).role()).isEqualTo(Role.OPERATOR);
        } finally { SecurityContextHolder.clearContext(); }
        MockHttpServletRequest tunnel = localRequest(); tunnel.addHeader("X-Forwarded-For", "203.0.113.9");
        assertThatThrownBy(() -> controller.physicsReviewer(tunnel, new MockHttpServletResponse()))
                .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
        teacher.setRole(Role.USER);
        assertThatThrownBy(() -> controller.physicsReviewer(localRequest(), new MockHttpServletResponse()))
                .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
    }

    @ParameterizedTest
    @EnumSource(value = Role.class, names = {"ADMIN", "USER", "TEACHER", "PARENT"})
    void switchesOnlyToTheNamedApprovedAccountWithItsActualRole(Role role) {
        String name = switch (role) { case ADMIN -> "admin"; case USER -> "nazile";
            case TEACHER -> "teacher"; case PARENT -> "parent"; default -> throw new AssertionError(); };
        User account = new User(); account.setId(30L); account.setUsername(name);
        account.setRole(role); account.setPasswordHash("unused");
        when(users.findByLogin(name)).thenReturn(Optional.of(account));
        var request = localRequest();
        var oldSession = (org.springframework.mock.web.MockHttpSession) request.getSession();
        oldSession.setAttribute("private-data", "previous-account");
        try {
            assertThat(controller.switchAccount(role, request, new MockHttpServletResponse()).role()).isEqualTo(role);
            assertThat(oldSession.isInvalid()).isTrue();
            assertThat(request.getSession().getAttribute("private-data")).isNull();
            account.setApproved(false);
            assertThatThrownBy(() -> controller.switchAccount(role, localRequest(), new MockHttpServletResponse()))
                    .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
            account.setApproved(true); account.setArchivedAt(java.time.Instant.now());
            assertThatThrownBy(() -> controller.switchAccount(role, localRequest(), new MockHttpServletResponse()))
                    .isInstanceOf(ApiException.class);
        } finally { SecurityContextHolder.clearContext(); }
    }

    @ParameterizedTest
    @ValueSource(strings = {"CF-Connecting-IP", "Forwarded", "X-Forwarded-For", "X-Forwarded-Host"})
    void everySwitchAndAccountDiscoveryRejectsProxyRequests(String header) {
        var request = localRequest(); request.addHeader(header, "203.0.113.10");
        assertThat(controller.accounts(request)).isEmpty();
        for (Role role : new Role[]{Role.ADMIN, Role.USER, Role.TEACHER, Role.PARENT})
            assertThatThrownBy(() -> controller.switchAccount(role, request, new MockHttpServletResponse()))
                    .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
    }
}
