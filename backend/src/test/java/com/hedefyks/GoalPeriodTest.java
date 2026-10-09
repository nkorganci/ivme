package com.hedefyks;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.hedefyks.progress.GoalPeriod;
import com.hedefyks.progress.ProgressService.Period;
import java.time.Instant;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class GoalPeriodTest {
    @Test
    void gun_hafta_ay_yerel_sinira_ve_yaz_saatine_uyar() {
        Instant now = Instant.parse("2026-03-08T16:00:00Z");
        var day = GoalPeriod.containing(Period.DAY, "America/New_York", now);
        assertThat(day.startsOn()).isEqualTo(LocalDate.of(2026, 3, 8));
        assertThat(day.endsOn()).isEqualTo(day.startsOn());
        assertThat(day.startsAt()).isEqualTo(Instant.parse("2026-03-08T05:00:00Z"));
        assertThat(day.endsAt()).isEqualTo(Instant.parse("2026-03-09T04:00:00Z"));
        var week = GoalPeriod.containing(Period.WEEK, "America/New_York", now);
        assertThat(week.startsOn()).isEqualTo(LocalDate.of(2026, 3, 2));
        assertThat(week.endsOn()).isEqualTo(LocalDate.of(2026, 3, 8));
        var month = GoalPeriod.containing(Period.MONTH, "America/New_York", now);
        assertThat(month.startsOn()).isEqualTo(LocalDate.of(2026, 3, 1));
        assertThat(month.endsOn()).isEqualTo(LocalDate.of(2026, 3, 31));
        assertThatThrownBy(() -> GoalPeriod.containing(Period.DAY, "Unknown/Zone", now))
                .hasMessageContaining("saat dilimi");
    }
}
