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
}
