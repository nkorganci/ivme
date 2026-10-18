package com.hedefyks.tutor;

import static org.assertj.core.api.Assertions.assertThat;

import com.hedefyks.tutor.TutorPolicy.Capabilities;
import com.hedefyks.tutor.TutorPolicy.SessionState;
import com.hedefyks.tutor.TutorPolicy.StepType;
import org.junit.jupiter.api.Test;

class TutorPolicyTest {
    private static final Capabilities FULL = new Capabilities(true, true, false, true, 4);

    /** Varsayılan: hiç dokunulmamış oturum. */
    private static Builder state() {
        return new Builder();
    }

    @Test
    void yeni_ogrenci_once_buyuk_fikri_sonra_ilk_hamleyi_gorur() {
        assertThat(TutorPolicy.decide(state().build(), FULL, 0.2).type()).isEqualTo(StepType.PREVIEW);
        assertThat(TutorPolicy.decide(state().preview().build(), FULL, 0.2).type()).isEqualTo(StepType.STRATEGY);
        assertThat(TutorPolicy.decide(state().build(), FULL, 0.5).type()).isEqualTo(StepType.STRATEGY);
        assertThat(TutorPolicy.decide(state().build(), FULL, 0.9).type()).isEqualTo(StepType.ATTEMPT);
    }

    @Test
    void yanlis_cevap_yanilgiya_baglanirsa_once_yanilgi_duzeltilir() {
        var mapped = state().wrong(1, true).build();
        assertThat(TutorPolicy.decide(mapped, FULL, 0.5).type()).isEqualTo(StepType.RETRY_MISCONCEPTION);
        var unmapped = state().wrong(1, false).build();
        assertThat(TutorPolicy.decide(unmapped, FULL, 0.5).type()).isEqualTo(StepType.HINT);
    }

    @Test
    void iki_yanlistan_sonra_gerekceli_adimlara_gecilir() {
        assertThat(TutorPolicy.decide(state().wrong(2, false).build(), FULL, 0.5).type()).isEqualTo(StepType.WORKED);
        assertThat(TutorPolicy.decide(state().wrong(2, true).build(), FULL, 0.5).type()).isEqualTo(StepType.RETRY_MISCONCEPTION);
        assertThat(TutorPolicy.decide(state().wrong(3, true).build(), FULL, 0.5).type()).isEqualTo(StepType.WORKED);
    }

    @Test
    void art_arda_ipucu_alan_ogrenciden_deneme_istenir() {
        var hints = state().hints(2, 2).build();
        assertThat(TutorPolicy.decide(hints, FULL, 0.5).type()).isEqualTo(StepType.ATTEMPT);
    }

    @Test
    void dogru_cevaptan_sonra_gerekce_gorsel_ikiz_ve_ozet_sirasi() {
        var correct = state().correct().build();
        assertThat(TutorPolicy.decide(correct, FULL, 0.5).type()).isEqualTo(StepType.EXPLAIN);
        var explained = state().correct().explained().build();
        assertThat(TutorPolicy.decide(explained, FULL, 0.5).type()).isEqualTo(StepType.VISUAL);
        assertThat(TutorPolicy.decide(explained, FULL, 0.8).type()).isEqualTo(StepType.TWIN);
        var predicted = state().correct().explained().predicted().build();
        assertThat(TutorPolicy.decide(predicted, FULL, 0.5).type()).isEqualTo(StepType.TWIN);
        var twin = state().correct().explained().predicted().twin(true).build();
        assertThat(TutorPolicy.decide(twin, FULL, 0.5).type()).isEqualTo(StepType.DONE);
    }

    @Test
    void sonuc_turu_yardim_miktarina_gore_belirlenir() {
        assertThat(state().correct().build().outcome()).isEqualTo(SkillModel.Outcome.INDEPENDENT);
        assertThat(state().hints(1, 1).correctAfter(1, 0, 0).build().outcome()).isEqualTo(SkillModel.Outcome.ASSISTED);
        assertThat(state().correctAfter(0, 2, 0).build().outcome()).isEqualTo(SkillModel.Outcome.WORKED);
        assertThat(state().solution(true).build().outcome()).isEqualTo(SkillModel.Outcome.SOLUTION_VIEWED);
        assertThat(state().strategy(false).correct().build().outcome()).isEqualTo(SkillModel.Outcome.ASSISTED);
    }

    private static final class Builder {
        boolean preview, strategyDone, strategyCorrect, lastWrong, lastMapped, correct, solution, solutionBefore, predict, twinAnswered, done;
        int hints, hintsSince, attempts, wrong, steps, stepsBefore, hintsBefore, wrongBefore, explainCorrect, explainTotal;
        Boolean twinCorrect;

        Builder preview() { preview = true; return this; }
        Builder strategy(boolean right) { strategyDone = true; strategyCorrect = right; return this; }
        Builder hints(int count, int since) { hints = count; hintsSince = since; return this; }
        Builder wrong(int count, boolean mapped) { wrong = count; attempts = count; lastWrong = true; lastMapped = mapped; return this; }
        Builder correct() { correct = true; attempts++; return this; }
        Builder correctAfter(int hintsBefore, int stepsBefore, int wrongBefore) {
            this.hintsBefore = hintsBefore; this.stepsBefore = stepsBefore; this.wrongBefore = wrongBefore;
            steps = Math.max(steps, stepsBefore);
            return correct();
        }
        Builder explained() { explainCorrect = 1; explainTotal = 1; return this; }
        Builder predicted() { predict = true; return this; }
        Builder twin(boolean right) { twinAnswered = true; twinCorrect = right; return this; }
        Builder solution(boolean before) { solution = true; solutionBefore = before; steps = 4; return this; }

        SessionState build() {
            return new SessionState(preview, strategyDone, strategyCorrect, hints, hintsSince, attempts, wrong, lastWrong,
                    lastWrong && lastMapped, correct, steps, stepsBefore, hintsBefore, wrongBefore, solution, solutionBefore,
                    explainCorrect, explainTotal, predict, twinAnswered, twinCorrect, done);
        }
    }
}
