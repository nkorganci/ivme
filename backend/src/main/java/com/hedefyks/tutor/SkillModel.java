package com.hedefyks.tutor;

import java.time.Duration;
import java.time.Instant;

/**
 * Öğrenci beceri kaydının güncelleme kuralları (Bayesçi bilgi izleme, BKT benzeri).
 * Bağımsız doğru güçlü kanıttır; ipuçlu doğru zayıf kanıttır; çözüm görülerek tamamlanan
 * soru "henüz çözemedi" sayılır ama öğrenme fırsatı olarak geçiş olasılığını uygular.
 * Aktarım (ikiz soru) yardımsız çözüldüğü için en güçlü kanıttır.
 */
public final class SkillModel {
    public static final double INITIAL = 0.20;
    static final double TRANSIT = 0.15;
    static final double SLIP = 0.10;
    static final double GUESS = 0.20;
    private static final int[] REVIEW_DAYS = {1, 3, 7, 21, 45};

    public enum Outcome { INDEPENDENT, ASSISTED, WORKED, SOLUTION_VIEWED }

    /** Bir oturumdan çıkan kanıt. twinCorrect null ise ikiz soru yanıtlanmadı. */
    public record Evidence(Outcome outcome, int hintsUsed, int wrongAnswers, int explainCorrect, int explainTotal,
                           Boolean twinCorrect) {}

    public record State(double mastery, int independentCorrect, int assistedCorrect, int wrong, int hintsUsed,
                        int explainCorrect, int explainTotal, int transferCorrect, int streak,
                        String lastOutcome, Instant lastPracticedAt, Instant nextReviewAt) {
        public static State fresh() {
            return new State(INITIAL, 0, 0, 0, 0, 0, 0, 0, 0, null, null, null);
        }
    }

    private SkillModel() {}

    static double observe(double prior, boolean correct) {
        double numerator = correct ? prior * (1 - SLIP) : prior * SLIP;
        double denominator = correct ? numerator + (1 - prior) * GUESS : numerator + (1 - prior) * (1 - GUESS);
        return denominator == 0 ? prior : numerator / denominator;
    }

    static double transit(double value) {
        return value + (1 - value) * TRANSIT;
    }

    /** Kanıtı uygular; saat dışarıdan verilir ki test edilebilir olsun. */
    public static State apply(State state, Evidence evidence, Instant now) {
        double p = state.mastery();
        switch (evidence.outcome()) {
            case INDEPENDENT -> p = observe(p, true);
            case ASSISTED -> {
                double weight = Math.max(0.2, 1 - 0.25 * evidence.hintsUsed() - 0.3 * evidence.wrongAnswers());
                p = p + weight * (observe(p, true) - p);
            }
            case WORKED, SOLUTION_VIEWED -> p = observe(p, false);
        }
        p = transit(p);
        for (int i = 0; i < evidence.explainTotal(); i++) {
            p = i < evidence.explainCorrect() ? p + 0.03 * (1 - p) : p - 0.03 * p;
        }
        if (evidence.twinCorrect() != null) p = transit(observe(p, evidence.twinCorrect()));
        p = Math.max(0.01, Math.min(0.99, p));

        boolean secure = evidence.outcome() == Outcome.INDEPENDENT && !Boolean.FALSE.equals(evidence.twinCorrect())
                || Boolean.TRUE.equals(evidence.twinCorrect()) && evidence.outcome() != Outcome.SOLUTION_VIEWED;
        int streak = secure ? state.streak() + 1 : 0;
        int days = secure ? REVIEW_DAYS[Math.min(streak - 1, REVIEW_DAYS.length - 1)] : 1;
        boolean correct = evidence.outcome() == Outcome.INDEPENDENT || evidence.outcome() == Outcome.ASSISTED;
        return new State(round(p),
                state.independentCorrect() + (evidence.outcome() == Outcome.INDEPENDENT ? 1 : 0),
                state.assistedCorrect() + (evidence.outcome() == Outcome.ASSISTED ? 1 : 0),
                state.wrong() + evidence.wrongAnswers() + (correct ? 0 : 1),
                state.hintsUsed() + evidence.hintsUsed(),
                state.explainCorrect() + evidence.explainCorrect(),
                state.explainTotal() + evidence.explainTotal(),
                state.transferCorrect() + (Boolean.TRUE.equals(evidence.twinCorrect()) ? 1 : 0),
                streak, evidence.outcome().name(), now, now.plus(Duration.ofDays(days)));
    }

    private static double round(double value) {
        return Math.round(value * 10_000d) / 10_000d;
    }

    /** Öğrenciye gösterilen ustalık düzeyi. */
    public static String level(double mastery) {
        if (mastery >= 0.85) return "USTA";
        if (mastery >= 0.6) return "GELISIYOR";
        if (mastery >= 0.35) return "BASLANGIC";
        return "YENI";
    }
}
