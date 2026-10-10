package com.hedefyks;

import static org.assertj.core.api.Assertions.assertThat;

import com.hedefyks.admin.AdminContentService;
import com.hedefyks.question.Question;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

class AdminContentTest extends TestBase {
    @Autowired AdminContentService content;

    @Test
    void yalniz_etkin_sorular_koleksiyon_ve_sinav_turunde_birer_kez_sayilir() {
        question("COVER-1", "Türkçe", "A");
        Question ogm = question("COVER-2", "Matematik", "B");
        Question inactive = question("COVER-3", "Türkçe", "C");
        jdbc.update("UPDATE questions SET bank = 'OGM', exam_type = 'AYT' WHERE id = ?", ogm.getId());
        jdbc.update("UPDATE questions SET active = false WHERE id = ?", inactive.getId());
        var result = content.coverage();
        assertThat(result.total()).isEqualTo(2);
        assertThat(result.cikmis()).isEqualTo(1);
        assertThat(result.ogm()).isEqualTo(1);
        assertThat(result.tyt()).isEqualTo(1);
        assertThat(result.ayt()).isEqualTo(1);
    }
}
