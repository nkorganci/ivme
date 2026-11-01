package com.hedefyks;

import com.hedefyks.user.Role;
import com.hedefyks.user.User;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import java.time.Instant;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class StudentImpersonationTest extends TestBase {
    private User manager() {
        User manager = user("manager", Role.ADMIN);
        manager.setSiteManager(true);
        return users.saveAndFlush(manager);
    }

    private String start(User student) { return "/api/admin/accounts/" + student.getId() + "/impersonate"; }

    @Test void managerUsesRealStudentDataAndReturnsWithoutPassword() throws Exception {
        User manager = manager(), student = user("student", Role.USER), other = user("other", Role.USER);
        MockHttpSession ownSession = login(student.getUsername(), "Sifre1234");
        MockHttpSession session = login(manager.getUsername(), "Sifre1234");
        String previousId = session.getId();
        send(session, post(start(student)), null).andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(student.getId())).andExpect(jsonPath("$.role").value("USER"))
                .andExpect(jsonPath("$.siteManager").value(false)).andExpect(jsonPath("$.impersonating").value(true));
        assertThat(session.getId()).isNotEqualTo(previousId);
        mvc.perform(get("/api/auth/me").session(session)).andExpect(jsonPath("$.impersonating").value(true));
        mvc.perform(get("/api/admin/accounts").session(session)).andExpect(status().isForbidden());
        send(session, post(start(other)), null).andExpect(status().isForbidden());
        String week = "/api/student-program/weeks/2026-11-02";
        send(session, put(week), "{\"revision\":0,\"rows\":[{\"minutes\":60,\"cells\":[\"Matematik\",\"\",\"\",\"\",\"\",\"\",\"\"]}]}")
                .andExpect(status().isOk());
        mvc.perform(get(week).session(ownSession)).andExpect(jsonPath("$.rows[0].cells[0]").value("Matematik"));
        assertThat(jdbc.queryForList("SELECT user_id FROM student_program_weeks", Long.class)).containsExactly(student.getId());
        send(session, post("/api/auth/activity"), "{\"activeSeconds\":30}").andExpect(status().isNoContent());
        assertThat(users.findById(student.getId()).orElseThrow().getActiveSeconds()).isZero();
        previousId = session.getId();
        send(session, post("/api/auth/impersonation/stop"), null).andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(manager.getId())).andExpect(jsonPath("$.impersonating").value(false));
        assertThat(session.getId()).isNotEqualTo(previousId);
        mvc.perform(get("/api/admin/accounts").session(session)).andExpect(status().isOk());
        mvc.perform(get("/api/auth/me").session(ownSession)).andExpect(jsonPath("$.impersonating").value(false));
        assertThat(jdbc.queryForList("SELECT action FROM account_audit ORDER BY id", String.class))
                .containsExactly("IMPERSONATE_START", "IMPERSONATE_STOP");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM account_audit WHERE actor_id=? AND target_id=?", Long.class,
                manager.getId(), student.getId())).isEqualTo(2);
    }

    @ParameterizedTest @EnumSource(Role.class)
    void noRoleCanStartWithoutActiveSiteManagerPermission(Role role) throws Exception {
        User actor = user("actor", role), student = user("student", Role.USER);
        MockHttpSession session = login(actor.getUsername(), "Sifre1234");
        send(session, post(start(student)), null).andExpect(status().isForbidden());
        send(session, post("/api/auth/impersonation/stop"), null).andExpect(status().isForbidden());
    }

    @Test void requiresAuthenticationAndCsrfForBothTransitions() throws Exception {
        User manager = manager(), student = user("student", Role.USER);
        mvc.perform(post(start(student)).with(csrf())).andExpect(status().isUnauthorized());
        MockHttpSession session = login(manager.getUsername(), "Sifre1234");
        mvc.perform(post(start(student)).session(session)).andExpect(status().isForbidden());
        send(session, post(start(student)), null).andExpect(status().isOk());
        mvc.perform(post("/api/auth/impersonation/stop").session(session)).andExpect(status().isForbidden());
    }

    @Test void rejectsNonStudentAndInactiveTargetsWithoutChangingSession() throws Exception {
        User manager = manager(), student = user("student", Role.USER), teacher = user("teacher", Role.TEACHER);
        MockHttpSession session = login(manager.getUsername(), "Sifre1234");
        send(session, post(start(teacher)), null).andExpect(status().isBadRequest());
        send(session, post("/api/admin/accounts/999999/impersonate"), null).andExpect(status().isNotFound());
        student.setApproved(false); users.saveAndFlush(student);
        send(session, post(start(student)), null).andExpect(status().isConflict());
        student.setApproved(true); student.setEnabled(false); users.saveAndFlush(student);
        send(session, post(start(student)), null).andExpect(status().isConflict());
        student.setEnabled(true); student.setArchivedAt(Instant.now()); users.saveAndFlush(student);
        send(session, post(start(student)), null).andExpect(status().isConflict());
        mvc.perform(get("/api/auth/me").session(session)).andExpect(jsonPath("$.id").value(manager.getId()));
        assertThat(jdbc.queryForObject("SELECT count(*) FROM account_audit", Long.class)).isZero();
    }

    @Test void revokingOriginalManagerAlsoRevokesStudentSession() throws Exception {
        User manager = manager(), student = user("student", Role.USER);
        MockHttpSession session = login(manager.getUsername(), "Sifre1234");
        send(session, post(start(student)), null).andExpect(status().isOk());
        jdbc.update("UPDATE users SET site_manager=false WHERE id=?", manager.getId());
        mvc.perform(get("/api/auth/me").session(session)).andExpect(status().isUnauthorized());
        assertThat(session.isInvalid()).isTrue();
    }

    @Test void staleTabCannotReadOrWriteIntoDifferentAccount() throws Exception {
        User manager = manager(), student = user("student", Role.USER);
        MockHttpSession session = login(manager.getUsername(), "Sifre1234");
        send(session, post(start(student)), null).andExpect(status().isOk());
        mvc.perform(put("/api/preferences/sidebar-rail").session(session).with(csrf())
                .header("X-Ivme-User-Id", manager.getId()).contentType(MediaType.APPLICATION_JSON).content("{\"value\":true}"))
                .andExpect(status().isConflict()).andExpect(header().string("X-Ivme-Account-Changed", "true"));
        assertThat(jdbc.queryForObject("SELECT count(*) FROM user_display_preferences", Long.class)).isZero();
        mvc.perform(get("/api/account/contact").session(session).header("X-Ivme-User-Id", manager.getId()))
                .andExpect(status().isConflict());
        mvc.perform(get("/api/account/contact").session(session).header("X-Ivme-User-Id", student.getId()))
                .andExpect(status().isOk());
    }

    @Test void normalLoginClearsReturnIdentityAndLogoutEndsWholeSession() throws Exception {
        User manager = manager(), student = user("student", Role.USER);
        MockHttpSession session = login(manager.getUsername(), "Sifre1234");
        send(session, post(start(student)), null).andExpect(status().isOk());
        send(session, post("/api/auth/login"), "{\"login\":\"student\",\"password\":\"Sifre1234\"}")
                .andExpect(status().isOk()).andExpect(jsonPath("$.impersonating").value(false));
        send(session, post("/api/auth/impersonation/stop"), null).andExpect(status().isForbidden());
        session = login(manager.getUsername(), "Sifre1234");
        send(session, post(start(student)), null).andExpect(status().isOk());
        send(session, post("/api/auth/logout"), null).andExpect(status().isNoContent());
        assertThat(session.isInvalid()).isTrue();
        mvc.perform(post("/api/auth/impersonation/stop").with(csrf())).andExpect(status().isUnauthorized());
    }
}
