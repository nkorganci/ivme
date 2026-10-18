package com.hedefyks.tutor;

import static org.assertj.core.api.Assertions.assertThat;

import com.hedefyks.tutor.SkillModel.Evidence;
import com.hedefyks.tutor.SkillModel.Outcome;
import com.hedefyks.tutor.SkillModel.State;
import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class SkillModelTest {
    private static final Instant NOW = Instant.parse("2026-10-18T10:00:00Z");

    @Test
    void bagimsiz_dogru_ipuclu_dogrudan_guclu_kanittir() {
        State independent = SkillModel.apply(State.fresh(), new Evidence(Outcome.INDEPENDENT, 0, 0, 0, 0, null), NOW);
        State assisted = SkillModel.apply(State.fresh(), new Evidence(Outcome.ASSISTED, 2, 1, 0, 0, null), NOW);
        assertThat(independent.mastery()).isGreaterThan(assisted.mastery());
        assertThat(assisted.mastery()).isGreaterThan(SkillModel.INITIAL);
        assertThat(independent.independentCorrect()).isEqualTo(1);
        assertThat(assisted.assistedCorrect()).isEqualTo(1);
        assertThat(assisted.hintsUsed()).isEqualTo(2);
    }

    @Test
    void cozum_gorulerek_biten_soru_ustaligi_dusurur_ama_ogrenme_firsati_sayilir() {
        State viewed = SkillModel.apply(State.fresh(), new Evidence(Outcome.SOLUTION_VIEWED, 0, 0, 0, 0, null), NOW);
        assertThat(viewed.mastery()).isLessThan(SkillModel.INITIAL).isGreaterThan(SkillModel.observe(SkillModel.INITIAL, false));
        assertThat(viewed.streak()).isZero();
        assertThat(viewed.nextReviewAt()).isEqualTo(NOW.plus(Duration.ofDays(1)));
    }

    @Test
    void yardimsiz_ikiz_soru_aktarimi_en_guclu_kanittir_ve_tekrar_araligi_buyur() {
        State state = State.fresh();
        long[] expectedDays = {1, 3, 7, 21, 45, 45};
        for (long days : expectedDays) {
            state = SkillModel.apply(state, new Evidence(Outcome.INDEPENDENT, 0, 0, 1, 1, true), NOW);
            assertThat(state.nextReviewAt()).isEqualTo(NOW.plus(Duration.ofDays(days)));
        }
        assertThat(state.mastery()).isGreaterThanOrEqualTo(0.85);
        assertThat(SkillModel.level(state.mastery())).isEqualTo("USTA");
        assertThat(state.transferCorrect()).isEqualTo(6);
    }

    @Test
    void yanlis_ikiz_soru_seriyi_sifirlar_ve_ertesi_gun_tekrar_ister() {
        State strong = SkillModel.apply(State.fresh(), new Evidence(Outcome.INDEPENDENT, 0, 0, 0, 0, true), NOW);
        State slipped = SkillModel.apply(strong, new Evidence(Outcome.INDEPENDENT, 0, 0, 0, 0, false), NOW);
        assertThat(slipped.streak()).isZero();
        assertThat(slipped.mastery()).isLessThan(SkillModel.apply(strong,
                new Evidence(Outcome.INDEPENDENT, 0, 0, 0, 0, true), NOW).mastery());
        assertThat(slipped.nextReviewAt()).isEqualTo(NOW.plus(Duration.ofDays(1)));
    }

    @Test
    void gerekce_secimleri_ustaligi_kucuk_olcude_etkiler() {
        State right = SkillModel.apply(State.fresh(), new Evidence(Outcome.ASSISTED, 1, 0, 2, 2, null), NOW);
        State wrong = SkillModel.apply(State.fresh(), new Evidence(Outcome.ASSISTED, 1, 0, 0, 2, null), NOW);
        assertThat(right.mastery()).isGreaterThan(wrong.mastery());
        assertThat(right.mastery() - wrong.mastery()).isLessThan(0.1);
    }
}
