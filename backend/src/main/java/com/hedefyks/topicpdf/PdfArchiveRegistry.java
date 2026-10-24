package com.hedefyks.topicpdf;

import java.util.Set;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/** Main's retired PDF hashes. The shared original source remains untouched. */
@Component
public class PdfArchiveRegistry {
    private final JdbcTemplate jdbc;
    private volatile Set<String> cached = Set.of();
    private volatile long refreshedAt;

    public PdfArchiveRegistry(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public synchronized Set<String> hashes() {
        long now = System.currentTimeMillis();
        if (now - refreshedAt > 5000) {
            cached = Set.copyOf(jdbc.queryForList("SELECT source_sha256 FROM learning_catalog.pdf_archive", String.class));
            refreshedAt = now;
        }
        return cached;
    }

    public boolean contains(String sha256) { return hashes().contains(sha256); }
}
