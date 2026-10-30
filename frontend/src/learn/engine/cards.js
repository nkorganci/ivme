import { createEmptyCard, fsrs, generatorParameters, Rating } from 'ts-fsrs';
import { ENGINE } from './config.js';
import { dayKey } from './dates.js';

// Kartlar FSRS ile planlanır (spec §5.4): hedef hatırlama 0,9; gün düzeyinde aralık.
const scheduler = fsrs(generatorParameters({
  request_retention: ENGINE.fsrs.retention,
  maximum_interval: ENGINE.fsrs.maxIntervalDays,
  enable_fuzz: false,
  enable_short_term: false,
}));

export const RATING = { again: Rating.Again, hard: Rating.Hard, good: Rating.Good, easy: Rating.Easy };

export function newCard(at) {
  return createEmptyCard(new Date(at));
}

/** Yanlış → Again · doğru + emin değil → Hard · doğru + emin → Good · emin ve ortancanın yarısından hızlı → Easy. */
export function ratingFor(attempt, medianMs) {
  if (!attempt.correct) return Rating.Again;
  if ((attempt.confidence ?? 3) < 3) return Rating.Hard;
  if (attempt.timeMs > 0 && medianMs > 0 && attempt.timeMs < medianMs * ENGINE.fsrs.easyFastRatio) return Rating.Easy;
  return Rating.Good;
}

export function reviewCard(card, at, rating) {
  return scheduler.next(card, new Date(at), rating).card;
}

export const cardDueDay = (card) => dayKey(new Date(card.due));

export function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}
