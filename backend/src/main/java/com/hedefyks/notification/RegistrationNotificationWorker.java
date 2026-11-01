package com.hedefyks.notification;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "app.registration-mail.worker-enabled", havingValue = "true", matchIfMissing = true)
public class RegistrationNotificationWorker {
    private final RegistrationNotificationOutbox outbox;
    private final RegistrationMailSettings settings;
    private final BrevoRegistrationMail mail;
    public RegistrationNotificationWorker(RegistrationNotificationOutbox outbox, RegistrationMailSettings settings,
                                          BrevoRegistrationMail mail) {
        this.outbox = outbox; this.settings = settings; this.mail = mail;
    }

    @Scheduled(fixedDelayString = "${app.registration-mail.poll-ms:30000}", initialDelayString = "${app.registration-mail.poll-ms:30000}")
    public void runOnce() {
        if (!settings.ready()) return; // Still enqueue registrations while configuration is incomplete.
        for (int i = 0; i < 10 && !Thread.currentThread().isInterrupted(); i++) {
            var job = outbox.claim();
            if (job == null) return;
            outbox.finish(job, mail.send(job));
        }
    }
}
