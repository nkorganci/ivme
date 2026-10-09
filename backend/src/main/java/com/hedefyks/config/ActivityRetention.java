package com.hedefyks.config;

import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Ham oturum/etkinlik olayları en çok 90 gün tutulur. */
@Component
public class ActivityRetention {

    private final JdbcTemplate jdbc;

    public ActivityRetention(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @EventListener(ApplicationReadyEvent.class)
    @Scheduled(cron = "0 0 3 * * *", zone = "UTC")
    public void removeExpiredEvents() {
        jdbc.update("DELETE FROM activity_events WHERE created_at < now() - interval '90 days'");
    }
}
