package com.hedefyks;

import com.hedefyks.notification.BrevoRegistrationMail;
import com.hedefyks.notification.RegistrationMailSettings;
import com.hedefyks.notification.RegistrationNotificationOutbox;
import com.hedefyks.notification.RegistrationNotificationWorker;
import com.hedefyks.user.AppUserDetails;
import com.hedefyks.user.Role;
import java.util.Map;
import java.util.concurrent.Executors;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class RegistrationNotificationTest extends TestBase {
    @Autowired RegistrationNotificationOutbox outbox;
    @Autowired RegistrationMailSettings settings;
    @Autowired PlatformTransactionManager transactions;
    @MockitoBean BrevoRegistrationMail mail;

    @BeforeEach void configureMail() {
        settings.setEnabled(true);
        settings.setApiKey("fake-key-never-sent");
        settings.setSender("sender@example.com");
        settings.setRecipient("manager@example.com");
        settings.setManagementUrl("https://example.com/yonetim");
    }

    private void register(String name) throws Exception {
        mvc.perform(post("/api/auth/register").with(csrf()).with(request -> {
            request.setRemoteAddr("192.0.2." + (Math.abs(name.hashCode() % 250) + 1)); return request;
        }).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of(
                "username", name, "email", name+"@example.com", "phone", "05551112233",
                "password", "Password2026", "category", "STUDENT"))))
                .andExpect(status().isCreated());
    }

    private RegistrationNotificationWorker worker() { return new RegistrationNotificationWorker(outbox, settings, mail); }

    @Test void onlyFuturePublicRegistrationsCreateOneJobAndDuplicateRegistrationDoesNot() throws Exception {
        user("old_account", Role.USER);
        assertThat(outbox.overview().recent()).isEmpty();
        register("fresh");
        assertThat(outbox.overview().waiting()).isEqualTo(1);
        assertThat(outbox.overview().recent()).hasSize(1);
        mvc.perform(post("/api/auth/register").with(csrf()).contentType(MediaType.APPLICATION_JSON).content(
                "{\"username\":\"fresh\",\"email\":\"fresh@example.com\",\"phone\":\"05551112233\",\"password\":\"Password2026\",\"category\":\"STUDENT\"}"))
                .andExpect(status().isConflict());
        assertThat(outbox.overview().recent()).hasSize(1);
        verifyNoInteractions(mail);
    }

    @Test void accountAndJobRollbackTogetherAndWorkerCannotSeeUncommittedJob() {
        new TransactionTemplate(transactions).executeWithoutResult(tx -> {
            try { register("rolled_back"); } catch (Exception error) { throw new RuntimeException(error); }
            assertThat(outbox.overview().waiting()).isEqualTo(1);
            try (var executor = Executors.newSingleThreadExecutor()) {
                assertThat(executor.submit(outbox::claim).get()).isNull();
            } catch (Exception error) { throw new RuntimeException(error); }
            tx.setRollbackOnly();
        });
        assertThat(users.existsByUsername("rolled_back")).isFalse();
        assertThat(outbox.overview().recent()).isEmpty();
        verifyNoInteractions(mail);
    }

    @Test void enqueueFailureRollsBackTheActualRegistration() throws Exception {
        jdbc.execute("ALTER TABLE registration_notification_outbox ADD CONSTRAINT test_outbox_failure CHECK (false) NOT VALID");
        try {
            mvc.perform(post("/api/auth/register").with(csrf()).contentType(MediaType.APPLICATION_JSON).content(
                    "{\"username\":\"enqueue_failed\",\"email\":\"enqueue_failed@example.com\",\"phone\":\"05551112233\",\"password\":\"Password2026\",\"category\":\"STUDENT\"}"))
                    .andExpect(status().isConflict()); // Existing integrity-error API contract.
            assertThat(users.existsByUsername("enqueue_failed")).isFalse();
            assertThat(outbox.overview().recent()).isEmpty();
        } finally { jdbc.execute("ALTER TABLE registration_notification_outbox DROP CONSTRAINT test_outbox_failure"); }
    }

    @Test void missingConfigurationKeepsTheJobWithoutConsumingAttempts() throws Exception {
        settings.setApiKey("");
        register("not_configured");
        worker().runOnce();
        assertThat(outbox.overview().configured()).isFalse();
        assertThat(outbox.overview().recent().getFirst().attempts()).isZero();
        verifyNoInteractions(mail);
    }

    @Test void outageRetriesAfterDueTimeAndANewWorkerContinuesWithSameEventKey() throws Exception {
        register("retry_user");
        when(mail.send(any())).thenReturn(new BrevoRegistrationMail.Result(false, true, "HTTP_503", null));
        worker().runOnce();
        var first = outbox.overview().recent().getFirst();
        assertThat(first.status()).isEqualTo("RETRY");
        assertThat(first.errorCode()).isEqualTo("HTTP_503");
        assertThat(first.nextAttemptAt()).isAfter(first.createdAt());
        assertThat(users.findByLogin("retry_user").orElseThrow().isApproved()).isFalse();
        worker().runOnce();
        verify(mail, times(1)).send(any());
        var jobs = org.mockito.ArgumentCaptor.forClass(RegistrationNotificationOutbox.Job.class);
        when(mail.send(any())).thenReturn(new BrevoRegistrationMail.Result(true, false, null, "provider-123"));
        settings.setRecipient("changed@example.com");
        jdbc.update("UPDATE registration_notification_outbox SET next_attempt_at=now()-interval '1 second'");
        worker().runOnce();
        verify(mail, times(2)).send(jobs.capture());
        assertThat(jobs.getAllValues().get(0).eventKey()).isEqualTo(jobs.getAllValues().get(1).eventKey());
        assertThat(jobs.getValue().recipient()).isEqualTo("manager@example.com");
        assertThat(outbox.overview().recent().getFirst().providerMessageId()).isEqualTo("provider-123");
        assertThat(outbox.overview().accepted()).isEqualTo(1);
    }

    @Test void concurrentClaimsCrashRecoveryAndStaleCompletionAreSafe() throws Exception {
        register("concurrent_user");
        RegistrationNotificationOutbox.Job a, b;
        try (var executor = Executors.newFixedThreadPool(2)) {
            var fa = executor.submit(outbox::claim);
            var fb = executor.submit(outbox::claim);
            a = fa.get(); b = fb.get();
        }
        assertThat((a == null) ^ (b == null)).isTrue();
        var original = a == null ? b : a;
        jdbc.update("UPDATE registration_notification_outbox SET lease_until=now()-interval '1 second'");
        var recovered = outbox.claim();
        assertThat(recovered.eventKey()).isEqualTo(original.eventKey());
        assertThat(recovered.leaseToken()).isNotEqualTo(original.leaseToken());
        outbox.finish(original, new BrevoRegistrationMail.Result(true, false, null, "stale"));
        assertThat(outbox.overview().recent().getFirst().status()).isEqualTo("PROCESSING");
        outbox.finish(recovered, new BrevoRegistrationMail.Result(true, false, null, "recovered"));
        assertThat(outbox.overview().recent().getFirst().providerMessageId()).isEqualTo("recovered");
        assertThat(outbox.claim()).isNull();
    }

    @Test void permanentFailureAndRetryLimitAreVisibleAndOnlyFailedJobsCanBeRetried() throws Exception {
        register("failed_user");
        var first = outbox.claim();
        outbox.finish(first, new BrevoRegistrationMail.Result(false, false, "HTTP_401", null));
        assertThat(outbox.overview().failed()).isEqualTo(1);
        outbox.retry(first.id());
        assertThatThrownBy(() -> outbox.retry(first.id())).hasMessageContaining("Yalnız başarısız");
        jdbc.update("UPDATE registration_notification_outbox SET attempts=9");
        outbox.finish(outbox.claim(), new BrevoRegistrationMail.Result(false, true, "HTTP_503", null));
        assertThat(outbox.overview().recent().getFirst().status()).isEqualTo("FAILED");
        assertThat(outbox.overview().recent().getFirst().attempts()).isEqualTo(10);
    }

    @Test void notificationApiRequiresManagerAndRetryRequiresCsrf() throws Exception {
        register("api_user");
        var job = outbox.claim();
        outbox.finish(job, new BrevoRegistrationMail.Result(false, false, "HTTP_400", null));
        String path = "/api/admin/accounts/registration-notifications";
        mvc.perform(get(path)).andExpect(status().isUnauthorized());
        for (Role role : Role.values()) {
            var ordinary = user("ordinary_mail_"+role, role);
            mvc.perform(get(path).with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(AppUserDetails.of(ordinary))))
                    .andExpect(status().isForbidden());
        }
        var manager = user("mail_manager", Role.ADMIN);
        manager.setSiteManager(true); users.save(manager);
        var principal = org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(AppUserDetails.of(manager));
        mvc.perform(get(path).with(principal)).andExpect(status().isOk())
                .andExpect(jsonPath("$.failed").value(1)).andExpect(jsonPath("$.configured").value(true));
        mvc.perform(post(path+"/"+job.id()+"/retry").with(principal)).andExpect(status().isForbidden());
        mvc.perform(post(path+"/"+job.id()+"/retry").with(principal).with(csrf())).andExpect(status().isNoContent());
        assertThat(outbox.overview().waiting()).isEqualTo(1);
    }
}
