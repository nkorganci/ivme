package com.hedefyks;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.hedefyks.user.AppUserDetails;
import com.hedefyks.user.Role;
import com.hedefyks.user.User;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

class RegistrationApprovalTest extends TestBase {
    private org.springframework.test.web.servlet.request.RequestPostProcessor user(AppUserDetails principal) {
        return org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(principal);
    }
    private User manager() {
        User manager = user("manager", Role.ADMIN);
        manager.setSiteManager(true);
        return users.save(manager);
    }

    @Test void everyPublicCategoryWaitsForApprovalAndCanThenLogin() throws Exception {
        User manager = manager();
        for (String category : new String[]{"STUDENT", "PARENT", "TEACHER"}) {
            String name = "new_" + category;
            var registered = mvc.perform(post("/api/auth/register").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                    .content(json.writeValueAsString(java.util.Map.of("username", name, "email", name+"@example.com",
                            "phone", "05551112233", "password", "Password2026", "category", category))))
                    .andExpect(status().isCreated()).andExpect(jsonPath("$.approved").value(false))
                    .andExpect(jsonPath("$.siteManager").value(false));
            long id = read(registered).path("id").asLong();
            String credentials = json.writeValueAsString(java.util.Map.of("login", name, "password", "Password2026"));
            mvc.perform(post("/api/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON).content(credentials))
                    .andExpect(status().isForbidden()).andExpect(jsonPath("$.hata").value(
                            "Kaydınız alındı. Yönetici onayı verildikten sonra sisteme giriş yapabilirsiniz."));
            mvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());
            mvc.perform(get("/api/admin/accounts").param("approved", "false").param("query", name)
                    .with(user(AppUserDetails.of(manager)))).andExpect(status().isOk())
                    .andExpect(jsonPath("$.totalElements").value(1)).andExpect(jsonPath("$.content[0].approved").value(false));
            mvc.perform(get("/api/admin/accounts/summary").with(user(AppUserDetails.of(manager))))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.pending").value(1));
            for (int attempt = 0; attempt < 2; attempt++)
                mvc.perform(patch("/api/admin/accounts/"+id+"/approval").with(csrf()).with(user(AppUserDetails.of(manager))))
                        .andExpect(status().isOk()).andExpect(jsonPath("$.approved").value(true));
            assertThat(jdbc.queryForObject("SELECT count(*) FROM account_audit WHERE target_id=? AND action='APPROVE'",
                    Long.class, id)).isEqualTo(1L);
            var session = login(name, "Password2026");
            mvc.perform(get("/api/auth/me").session(session)).andExpect(status().isOk())
                    .andExpect(jsonPath("$.username").value(name)).andExpect(jsonPath("$.approved").value(true));
        }
    }

    @Test void approvalRequiresManagerAndCsrfAndDoesNotUnblockAccount() throws Exception {
        User manager = manager();
        User pending = user("pending", Role.USER);
        pending.setApproved(false); pending.setEnabled(false); users.save(pending);
        String path = "/api/admin/accounts/"+pending.getId()+"/approval";
        mvc.perform(patch(path).with(csrf())).andExpect(status().isUnauthorized());
        mvc.perform(patch(path).with(user(AppUserDetails.of(manager)))).andExpect(status().isForbidden());
        for (Role role : Role.values()) {
            User ordinary = user("ordinary_"+role, role);
            mvc.perform(patch(path).with(csrf()).with(user(AppUserDetails.of(ordinary))))
                    .andExpect(status().isForbidden());
        }
        assertThat(users.findById(pending.getId()).orElseThrow().isApproved()).isFalse();
        mvc.perform(patch(path).with(csrf()).with(user(AppUserDetails.of(manager)))).andExpect(status().isOk())
                .andExpect(jsonPath("$.approved").value(true)).andExpect(jsonPath("$.enabled").value(false));
        mvc.perform(post("/api/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"login\":\"pending\",\"password\":\"Sifre1234\"}")).andExpect(status().isUnauthorized());
    }

    @Test void unblockingDoesNotApproveAndArchivedAccountsCannotBeApproved() throws Exception {
        User manager = manager();
        User pending = user("pending", Role.TEACHER);
        pending.setApproved(false); pending.setEnabled(false); users.save(pending);
        mvc.perform(patch("/api/admin/accounts/"+pending.getId()+"/status").with(csrf())
                .with(user(AppUserDetails.of(manager))).contentType(MediaType.APPLICATION_JSON)
                .content("{\"enabled\":true,\"reason\":\"\"}")).andExpect(status().isOk())
                .andExpect(jsonPath("$.approved").value(false));
        mvc.perform(post("/api/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"login\":\"pending\",\"password\":\"wrong\"}")).andExpect(status().isUnauthorized());
        pending = users.findById(pending.getId()).orElseThrow();
        pending.setArchivedAt(java.time.Instant.now()); pending.setEnabled(false); users.save(pending);
        mvc.perform(patch("/api/admin/accounts/"+pending.getId()+"/approval").with(csrf())
                .with(user(AppUserDetails.of(manager)))).andExpect(status().isNotFound());
    }

    @Test void removingApprovalRevokesAnExistingSession() throws Exception {
        User student = user("student", Role.USER);
        var session = login("student", "Sifre1234");
        jdbc.update("UPDATE users SET approved=false WHERE id=?", student.getId());
        mvc.perform(get("/api/auth/me").session(session)).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/exams/summary")).andExpect(status().isUnauthorized());
    }

    @Test void devSwitchIsUnavailableOutsideDevAndStillRequiresCsrf() throws Exception {
        mvc.perform(get("/api/auth/dev-accounts")).andExpect(status().isNotFound());
        mvc.perform(post("/api/auth/dev-switch/ADMIN")).andExpect(status().isForbidden());
        mvc.perform(post("/api/auth/dev-switch/ADMIN").with(csrf())).andExpect(status().isNotFound());
    }
}
