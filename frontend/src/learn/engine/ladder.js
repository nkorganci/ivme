import { ENGINE } from './config.js';
import { daysBetween } from './dates.js';

export function examDaysLeft(examDate, today) {
  return examDate ? daysBetween(today, examDate) : null;
}

/**
 * Tekrar aralığı (spec §5.1–5.2). Sınav tarihi yoksa sıkıştırma yoktur.
 * interval = min(ladder[adım], max(1, floor(kalanGün / 3))); kalan ≤ 21 gün ise en çok 7.
 */
export function interval(step, { examDate, today, ladder = ENGINE.review.ladderDays } = {}) {
  const base = ladder[Math.min(Math.max(step, 0), ladder.length - 1)];
  const left = examDaysLeft(examDate, today);
  if (left == null || left < 0) return base;
  let value = Math.min(base, Math.max(1, Math.floor(left / 3)));
  if (left <= ENGINE.exam.finalDays) value = Math.min(value, ENGINE.exam.finalMaxInterval);
  return value;
}

export function planMode(examDate, today) {
  const left = examDaysLeft(examDate, today);
  return left != null && left >= 0 && left <= ENGINE.exam.finalDays ? 'exam_final' : 'normal';
}

/** Tekrar sonucu: ≥ 80 bir basamak çık, 60–79 aynı basamak, < 60 risk. */
export function reviewOutcome(pct) {
  if (pct >= ENGINE.review.goodPct) return 'up';
  if (pct >= ENGINE.review.okPct) return 'same';
  return 'lapse';
}
