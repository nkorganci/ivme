package com.hedefyks.progress;

import com.hedefyks.common.ApiException;
import java.time.DateTimeException;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;

/** Hedefin yerel tarihleri dahil, olay zaman aralığı bitiş hariçtir. */
public record GoalPeriod(String period, String zoneId, LocalDate startsOn, LocalDate endsOn,
                         Instant startsAt, Instant endsAt) {
    public static GoalPeriod containing(ProgressService.Period period, String zoneName, Instant now) {
        if (period == null) throw ApiException.badRequest("Hedef dönemi gerekli.");
        if (zoneName == null || zoneName.isBlank() || zoneName.length() > 64) {
            throw ApiException.badRequest("Geçerli bir saat dilimi seç.");
        }
        ZoneId zone;
        try { zone = ZoneId.of(zoneName); }
        catch (DateTimeException e) { throw ApiException.badRequest("Geçerli bir saat dilimi seç."); }
        LocalDate today = now.atZone(zone).toLocalDate();
        LocalDate start = switch (period) {
            case DAY -> today;
            case WEEK -> today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
            case MONTH -> today.withDayOfMonth(1);
        };
        LocalDate end = switch (period) {
            case DAY -> start.plusDays(1);
            case WEEK -> start.plusWeeks(1);
            case MONTH -> start.plusMonths(1);
        };
        return new GoalPeriod(period.name(), zone.getId(), start, end.minusDays(1),
                start.atStartOfDay(zone).toInstant(), end.atStartOfDay(zone).toInstant());
    }
}
