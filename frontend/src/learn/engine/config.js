// Konuyu Öğrenelim motorunun varsayılanları (Learning Engine Spec). Bir değer değişirse
// docs/icerik/konuyu-ogrenelim.md içindeki kural tablosu aynı işte güncellenir.
export const ENGINE = Object.freeze({
  review: { ladderDays: [1, 3, 7, 14, 30, 60], setSize: 6, flashcardsMax: 5, goodPct: 80, okPct: 60 },
  mastery: { passPct: 80, minCorrectPerArchetype: 1, window: 10, halfLifeDays: 14, solvedAcc: 0.6 },
  // Yanlış soru kuyruğu: +1 gün, doğruysa +3, +7; art arda 2 doğru (öncelikli soruda 3) temizler.
  missed: { steps: [1, 3, 7], clearAfter: 2, priorityClearAfter: 3, guessCheckDays: 3, siblingDays: 1 },
  repeatGuardDays: 30,
  fsrs: { retention: 0.9, newPerDay: 20, maxIntervalDays: 180, easyFastRatio: 0.5, defaultCardMs: 8000 },
  exam: { finalDays: 21, finalMaxInterval: 7 },
  plan: {
    dailyMinutes: 180, newShare: 0.4, catchUpNewShare: 0.2, catchUpLoad: 0.6,
    missedMaxMinutes: 20, flashcardMaxMinutes: 15, flashcardSeconds: 15, reteachMinutes: 12,
    maxNewConceptsPerTrack: 2, mixedSetMin: 20, mixedSetMax: 30, masteryGapHours: 3,
    catchUpMinDays: 3, catchUpMaxDays: 5, defaultReviewMinutes: 12, defaultMasteryMinutes: 15,
  },
  // Soru başına saniye (yapılandırma); öğrencinin 30 cevabından sonra kendi ortancası kullanılır.
  pace: { TYT: 75, AYT: 105, ownAfterAttempts: 30, missedFactor: 1.5 },
  placement: { perUnit: 2, maxMinutes: 20, l1Below: 40, l3Above: 75, testOutPerArchetype: 1, testOutMax: 4 },
  lesson: { wrongChecksForL1: 2, defaultLevel: 'L2' },
  streak: { minMinutes: 10, minAttempts: 5, freezeWeekDays: 4, maxFreezes: 3 },
});

export const TRACKS = ['TYT', 'AYT'];

export const DEFAULT_SETTINGS = Object.freeze({
  examDate: '',
  dailyMinutes: ENGINE.plan.dailyMinutes,
  tracks: ['TYT', 'AYT'],
  trackOrder: ['TYT', 'AYT'],
  reminderTime: '19:00',
  mixedSetWeekday: 0,
  placementSkipped: [],
  notifications: false,
});

/** Ayar nesnesini doğrular ve eksik alanları varsayılanla tamamlar. */
export function normalizeSettings(input = {}) {
  const value = { ...DEFAULT_SETTINGS, ...(input || {}) };
  const minutes = Math.round(Number(value.dailyMinutes));
  value.dailyMinutes = Number.isFinite(minutes) ? Math.min(600, Math.max(20, minutes)) : DEFAULT_SETTINGS.dailyMinutes;
  value.tracks = TRACKS.filter((track) => (value.tracks || []).includes(track));
  if (!value.tracks.length) value.tracks = [...TRACKS];
  const order = (value.trackOrder || []).filter((track) => TRACKS.includes(track));
  value.trackOrder = [...new Set([...order, ...TRACKS])];
  value.examDate = /^\d{4}-\d{2}-\d{2}$/.test(value.examDate || '') ? value.examDate : '';
  value.reminderTime = /^\d{2}:\d{2}$/.test(value.reminderTime || '') ? value.reminderTime : DEFAULT_SETTINGS.reminderTime;
  const weekday = Number(value.mixedSetWeekday);
  value.mixedSetWeekday = Number.isInteger(weekday) && weekday >= 0 && weekday <= 6 ? weekday : 0;
  value.placementSkipped = TRACKS.filter((track) => (value.placementSkipped || []).includes(track));
  value.notifications = value.notifications === true;
  return value;
}
