package com.hedefyks.auth;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Basit, bellek içi kayan pencere sayacı (tek sunucu için yeterli). Anahtar başına son "window" süresindeki
 * olayları sayar; "max" ve üstü ise engellenmiş sayılır. Kaba kuvvet giriş denemelerini ve toplu kaydı yavaşlatır.
 */
final class SlidingWindowLimiter {

    private static final int CLEANUP_THRESHOLD = 5_000;

    private final int max;
    private final Duration window;
    private final ConcurrentHashMap<String, Deque<Instant>> events = new ConcurrentHashMap<>();

    SlidingWindowLimiter(int max, Duration window) {
        this.max = max;
        this.window = window;
    }

    boolean isBlocked(String key) {
        Deque<Instant> q = events.get(key);
        if (q == null) return false;
        synchronized (q) {
            prune(q);
            return q.size() >= max;
        }
    }

    void record(String key) {
        if (events.size() > CLEANUP_THRESHOLD) {
            events.entrySet().removeIf(e -> {
                synchronized (e.getValue()) {
                    prune(e.getValue());
                    return e.getValue().isEmpty();
                }
            });
        }
        Deque<Instant> q = events.computeIfAbsent(key, k -> new ArrayDeque<>());
        synchronized (q) {
            prune(q);
            q.addLast(Instant.now());
        }
    }

    void clear(String key) {
        events.remove(key);
    }

    private void prune(Deque<Instant> q) {
        Instant limit = Instant.now().minus(window);
        while (!q.isEmpty() && q.peekFirst().isBefore(limit)) {
            q.removeFirst();
        }
    }
}
