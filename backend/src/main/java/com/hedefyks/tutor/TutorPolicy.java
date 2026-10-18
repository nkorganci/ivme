package com.hedefyks.tutor;

/**
 * Bir sonraki öğretim adımını seçen açıklanabilir kural kümesi. Girdi: oturumun olaylardan
 * kurulan durumu, içeriğin sunabildikleri ve öğrencinin bu kalıptaki ustalık tahmini.
 * Her karar öğrenciye ve öğretmene gösterilen kısa bir gerekçeyle birlikte döner.
 */
public final class TutorPolicy {

    public enum StepType { PREVIEW, STRATEGY, ATTEMPT, RETRY_MISCONCEPTION, HINT, WORKED, EXPLAIN, VISUAL, TWIN, DONE }

    public record NextStep(StepType type, String title, String reason) {}

    /** İçeriğin bu oturumda sunabildikleri. */
    public record Capabilities(boolean hasSelfExplain, boolean hasVisual, boolean visualBeforeAnswer, boolean hasTwin,
                               int stepCount) {}

    /** Olay günlüğünden kurulan oturum durumu. */
    public record SessionState(boolean previewShown, boolean strategyDone, boolean strategyCorrect, int hintsShown,
                               int hintsSinceAttempt, int attempts, int wrongCount, boolean lastWasWrongAnswer,
                               boolean lastMisconceptionMapped, boolean answeredCorrectly, int stepsRevealed,
                               int stepsBeforeCorrect, int hintsBeforeCorrect, int wrongBeforeCorrect,
                               boolean solutionViewed, boolean solutionBeforeCorrect, int explainCorrect,
                               int explainTotal, boolean predictDone, boolean twinAnswered, Boolean twinCorrect,
                               boolean done) {

        public boolean solved(Capabilities capabilities) {
            return answeredCorrectly || solutionViewed || capabilities.stepCount() > 0 && stepsRevealed >= capabilities.stepCount();
        }

        /** Oturumun öğrenme kanıtı türü; çözülmeden bitmiş oturum için null. */
        public SkillModel.Outcome outcome() {
            if (solutionBeforeCorrect || solutionViewed && !answeredCorrectly) return SkillModel.Outcome.SOLUTION_VIEWED;
            if (!answeredCorrectly) return stepsRevealed > 0 ? SkillModel.Outcome.WORKED : null;
            if (stepsBeforeCorrect > 0) return SkillModel.Outcome.WORKED;
            if (hintsBeforeCorrect > 0 || wrongBeforeCorrect > 0 || strategyDone && !strategyCorrect) {
                return SkillModel.Outcome.ASSISTED;
            }
            return SkillModel.Outcome.INDEPENDENT;
        }
    }

    static final double NOVICE = 0.35;
    static final double SECURE = 0.85;

    private TutorPolicy() {}

    /** Görsel aşaması önerilir mi: yeni kalıp, yanlış deneme, ipucu ya da çözümü görerek tamamlama. */
    public static boolean needsPicture(SessionState s, double mastery) {
        return mastery < 0.6 || s.wrongCount() > 0 || !s.answeredCorrectly() || s.hintsShown() > 0;
    }

    /** Doğru cevaptan sonra beklenen gerekçe sorusu yanıtlandı mı (ya da hiç yok mu)? */
    public static boolean explainStageDone(SessionState s, Capabilities c) {
        return !(c.hasSelfExplain() && s.answeredCorrectly() && s.explainTotal() == 0);
    }

    public static NextStep decide(SessionState s, Capabilities c, double mastery) {
        if (s.done()) return new NextStep(StepType.DONE, "Özet",
                "Oturum tamamlandı; beceri kaydın güncellendi ve tekrar zamanı planlandı.");
        if (!s.solved(c)) return beforeAnswer(s, c, mastery);
        if (!explainStageDone(s, c)) {
            return new NextStep(StepType.EXPLAIN, "Neden doğru?",
                    "Doğru cevap tek başına anlamayı göstermez; kilit adımın gerekçesini seçmek, bilgiyi şanstan ayırır.");
        }
        if (c.hasVisual() && !s.predictDone() && needsPicture(s, mastery)) {
            return new NextStep(StepType.VISUAL, "Mantığını gör",
                    "Görsel, adımların arkasındaki fikri gösterir. Önce tahmin et, sonra izle; tahmin, izlemeyi öğrenmeye çevirir.");
        }
        if (c.hasTwin() && !s.twinAnswered()) {
            boolean independent = s.outcome() == SkillModel.Outcome.INDEPENDENT;
            return new NextStep(StepType.TWIN, "İkiz soruyla dene", independent
                    ? "Aynı derin yapıda, farklı yüzeyde bir soru: kalıbı başka bir durumda da kullanabildiğini gösterir."
                    : "Bu soruyu yardımla tamamladın. Şimdi yardımsız benzer bir soru, kalıbın gerçekten yerleştiğini gösterir.");
        }
        return new NextStep(StepType.DONE, "Özeti gör",
                "Bu soruda yapılacaklar tamam; oturumu bitirince ustalık tahminin ve tekrar zamanın güncellenir.");
    }

    private static NextStep beforeAnswer(SessionState s, Capabilities c, double mastery) {
        boolean untouched = s.attempts() == 0 && s.hintsShown() == 0 && s.stepsRevealed() == 0;
        if (untouched) {
            if (mastery < NOVICE && !s.previewShown()) {
                return new NextStep(StepType.PREVIEW, "Önce büyük fikir",
                        "Bu kalıpta henüz kanıtın az. Çözmeden önce kalıbın mantığını ve ne zaman kullanıldığını görmek ilk denemeni güçlendirir.");
            }
            if (!s.strategyDone() && mastery < SECURE) {
                return new NextStep(StepType.STRATEGY, "İlk hamleni seç",
                        "Hesaba girmeden doğru yaklaşımı seçmek, 'hangi durumda ne yapılır' becerisini çalıştırır.");
            }
            return new NextStep(StepType.ATTEMPT, "Kendin dene",
                    "Bu kalıpta güçlüsün; önce yardımsız dene. İpucu gerekirse bir dokunuş uzakta.");
        }
        if (s.lastWasWrongAnswer()) {
            if (s.lastMisconceptionMapped() && s.wrongCount() < 3) {
                return new NextStep(StepType.RETRY_MISCONCEPTION, "Yanılgıyı düzelt, yeniden dene",
                        "Seçtiğin şık bilinen bir yanılgıyla eşleşiyor. Önce o düşünceyi düzelt, sonra tekrar dene.");
            }
            if (s.wrongCount() >= 2 || s.hintsShown() >= 3) return worked(s);
            return new NextStep(StepType.HINT, "Bir ipucu al",
                    "İlk deneme doğru çıkmadı. Bir sonraki ipucu yaklaşımı daraltır ama cevabı söylemez.");
        }
        if (s.wrongCount() >= 2) return worked(s);
        if (s.hintsSinceAttempt() >= 2) {
            return new NextStep(StepType.ATTEMPT, "Şimdi bir dene",
                    "Art arda iki ipucu aldın. Şimdi bir şık seçip düşünceni sınamak, ipucunu öğrenmeye çevirir.");
        }
        if (s.stepsRevealed() > 0) return worked(s);
        return new NextStep(StepType.ATTEMPT, "Kendin dene",
                "Yaklaşımı belirledin; şimdi hesabı kendin yap. Takılırsan bir ipucu iste.");
    }

    private static NextStep worked(SessionState s) {
        return new NextStep(StepType.WORKED, s.stepsRevealed() == 0 ? "Adım adım birlikte çözelim" : "Sıradaki adım",
                s.wrongCount() >= 2
                        ? "İki deneme doğru sonuç vermedi; bu noktada gerekçeli çözüm adımları deneme-yanılmadan daha çok öğretir."
                        : "Adım adım ilerliyoruz. Her adımı açmadan önce sıradakini tahmin etmeye çalış.");
    }
}
