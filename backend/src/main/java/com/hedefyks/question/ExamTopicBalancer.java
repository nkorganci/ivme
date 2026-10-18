package com.hedefyks.question;

import java.util.*;

/** Round-robin coverage within an exam, then learner coverage across exams. */
public final class ExamTopicBalancer {
    private ExamTopicBalancer() {}

    public record Candidate(Long id, String subject, String topic, long previousCount, long lastExam) {}

    public static List<Long> select(List<Candidate> candidates, int count, Set<Long> excluded) {
        var buckets = new LinkedHashMap<String, List<Candidate>>();
        var memberships = new HashMap<Long, Set<String>>();
        for (var c : candidates) {
            buckets.computeIfAbsent(c.topic(), key -> new ArrayList<>()).add(c);
            memberships.computeIfAbsent(c.id(), key -> new HashSet<>()).add(c.topic());
        }
        var topics = new ArrayList<>(buckets.keySet());
        Collections.shuffle(topics);
        var selected = new HashSet<>(excluded);
        var counts = new HashMap<String, Integer>();
        var result = new ArrayList<Long>();
        for (int i = 0; i < count; i++) {
            // Remove exhausted/shared questions before comparing topic coverage.
            topics.removeIf(topic -> {
                buckets.get(topic).removeIf(c -> selected.contains(c.id()));
                return buckets.get(topic).isEmpty();
            });
            String topic = topics.stream().min(Comparator
                    .<String>comparingInt(t -> t.startsWith("@unresolved:") ? 1 : 0)
                    .thenComparingInt(t -> counts.getOrDefault(t, 0))
                    .thenComparingLong(t -> buckets.get(t).getFirst().previousCount())
                    .thenComparingLong(t -> buckets.get(t).getFirst().lastExam())).orElse(null);
            if (topic == null) break;
            Long id = buckets.get(topic).getFirst().id();
            selected.add(id);
            result.add(id);
            // A multi-labelled question covers its units once, without duplicating the question.
            memberships.get(id).forEach(t -> counts.merge(t, 1, Integer::sum));
        }
        return result;
    }
}
