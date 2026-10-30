import { ENGINE } from './config.js';
import { addDays, weekday, weekStart } from './dates.js';

/** Aktif gün: en az 10 dakika çalışma ya da 5 soru/kart. */
export const isActiveDay = (day) => !!day && (day.ms >= ENGINE.streak.minMinutes * 60000 || day.questions + day.cards >= ENGINE.streak.minAttempts);

/**
 * Seri ve dondurma hakkı (spec §11): en az 4 aktif günü olan her takvim haftası 1 hak kazandırır (en çok 3).
 * Çalışılmayan bir gün varsa hak kullanılır, seri silinmez. Bugün henüz çalışılmadıysa seri dünden sürer.
 */
export function streakOf(days, today) {
  const activeDays = Object.keys(days).filter((key) => isActiveDay(days[key])).sort();
  if (!activeDays.length) return { count: 0, freezes: 0, activeToday: false, usedFreezes: [], best: 0, activeDays: 0 };
  let count = 0;
  let freezes = 0;
  let best = 0;
  const used = [];
  const perWeek = {};
  for (let day = activeDays[0]; day <= today; day = addDays(day, 1)) {
    const week = weekStart(day);
    if (isActiveDay(days[day])) {
      count += 1;
      perWeek[week] = (perWeek[week] ?? 0) + 1;
    } else if (day !== today) {
      if (count > 0 && freezes > 0) {
        freezes -= 1;
        used.push(day);
      } else count = 0;
    }
    best = Math.max(best, count);
    if (weekday(day) === 0 && (perWeek[week] ?? 0) >= ENGINE.streak.freezeWeekDays) freezes = Math.min(ENGINE.streak.maxFreezes, freezes + 1);
  }
  return { count, freezes, activeToday: isActiveDay(days[today]), usedFreezes: used, best, activeDays: activeDays.length };
}
