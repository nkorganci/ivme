package com.hedefyks.notification;

import com.hedefyks.common.ApiException;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RegistrationNotificationOutbox {
    public record Job(long id, UUID eventKey, String recipient, int attempts, UUID leaseToken) {}
    public record Entry(long id, long userId, String status, int attempts, Instant nextAttemptAt,
                        String errorCode, String providerMessageId, Instant createdAt, Instant acceptedAt) {}
    public record Overview(boolean configured, long waiting, long failed, long accepted, List<Entry> recent) {}
    private final JdbcTemplate jdbc;
    private final RegistrationMailSettings settings;
    public RegistrationNotificationOutbox(JdbcTemplate jdbc, RegistrationMailSettings settings) {
        this.jdbc = jdbc; this.settings = settings;
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void enqueue(long userId) {
        jdbc.update("INSERT INTO registration_notification_outbox(event_key,user_id) VALUES (?,?)",
                UUID.randomUUID(), userId);
    }

    @Transactional
    public Job claim() {
        // Commit the lease before any network call. Other processes skip the locked row.
        List<Job> jobs = jdbc.query("""
                WITH due AS (
                    SELECT id FROM registration_notification_outbox
                    WHERE (status IN ('PENDING','RETRY') AND next_attempt_at <= now())
                       OR (status='PROCESSING' AND lease_until <= now())
                    ORDER BY next_attempt_at,id LIMIT 1 FOR UPDATE SKIP LOCKED
                )
                UPDATE registration_notification_outbox o
                SET status='PROCESSING', attempts=attempts+1, lease_token=?, lease_until=now()+interval '2 minutes',
                    recipient=coalesce(recipient,?)
                FROM due WHERE o.id=due.id
                RETURNING o.id,o.event_key,o.recipient,o.attempts,o.lease_token
                """, (rs, n) -> new Job(rs.getLong("id"), rs.getObject("event_key", UUID.class),
                rs.getString("recipient"), rs.getInt("attempts"), rs.getObject("lease_token", UUID.class)),
                UUID.randomUUID(), settings.getRecipient());
        return jobs.isEmpty() ? null : jobs.getFirst();
    }

    @Transactional
    public void finish(Job job, BrevoRegistrationMail.Result result) {
        String status = result.accepted() ? "ACCEPTED" : result.retryable() && job.attempts() < 10 ? "RETRY" : "FAILED";
        long delay = Math.min(3600, 30L << Math.min(7, job.attempts() - 1));
        jdbc.update("""
                UPDATE registration_notification_outbox SET status=?, error_code=?, provider_message_id=?,
                    next_attempt_at=now()+(? * interval '1 second'),
                    accepted_at=CASE WHEN ? THEN now() ELSE NULL END,lease_token=NULL,lease_until=NULL
                WHERE id=? AND status='PROCESSING' AND lease_token=?
                """, status, result.code(), result.messageId(), delay, result.accepted(), job.id(), job.leaseToken());
    }

    @Transactional(readOnly = true)
    public Overview overview() {
        long waiting = count("status IN ('PENDING','RETRY','PROCESSING')");
        long failed = count("status='FAILED'");
        long accepted = count("status='ACCEPTED'");
        var recent = jdbc.query("""
                SELECT * FROM registration_notification_outbox ORDER BY created_at DESC,id DESC LIMIT 30
                """, (rs, n) -> new Entry(rs.getLong("id"), rs.getLong("user_id"), rs.getString("status"),
                rs.getInt("attempts"), rs.getTimestamp("next_attempt_at").toInstant(), rs.getString("error_code"),
                rs.getString("provider_message_id"), rs.getTimestamp("created_at").toInstant(),
                rs.getTimestamp("accepted_at") == null ? null : rs.getTimestamp("accepted_at").toInstant()));
        return new Overview(settings.ready(), waiting, failed, accepted, recent);
    }

    private long count(String condition) {
        return jdbc.queryForObject("SELECT count(*) FROM registration_notification_outbox WHERE " + condition, Long.class);
    }

    @Transactional
    public void retry(long id) {
        if (jdbc.update("""
                UPDATE registration_notification_outbox SET status='RETRY',attempts=0,next_attempt_at=now(),error_code=NULL
                WHERE id=? AND status='FAILED'
                """, id) == 0) throw ApiException.badRequest("Yalnız başarısız bildirim yeniden denenebilir.");
    }
}
