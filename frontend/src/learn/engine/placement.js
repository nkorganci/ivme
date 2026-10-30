import { ENGINE } from './config.js';

/**
 * Seviye testi sonucu (spec §9): ünitede iki soru da doğruysa ünitenin kavramları "geçme adayı" olur
 * (kısa ustalık testiyle geçilir). İlk yanlış ünite başlangıç noktasıdır. Puana göre varsayılan anlatım düzeyi:
 * < %40 → L1, %40–75 → L2, > %75 → L2 (L3 önerileriyle).
 */
export function placementResult(units, answers, index, track) {
  const testOut = [];
  let startUnit = null;
  let total = 0;
  let correct = 0;
  for (const unit of units) {
    const results = unit.questions.map((q) => answers[q.code]).filter((value) => value !== undefined);
    if (!results.length) continue;
    total += results.length;
    correct += results.filter(Boolean).length;
    const allRight = results.length >= Math.min(ENGINE.placement.perUnit, unit.questions.length) && results.every(Boolean);
    if (allRight) testOut.push(...index.units.find((u) => u.id === unit.unitId).concepts.filter((id) => index.byId[id].exams.includes(track)));
    else if (!startUnit) startUnit = unit.unitId;
  }
  const pct = total ? Math.round((100 * correct) / total) : 0;
  const level = pct < ENGINE.placement.l1Below ? 'L1' : 'L2';
  return { pct, total, correct, level, suggestL3: pct > ENGINE.placement.l3Above, testOut, startUnit };
}

/** Uyarlamalı akış: ünitenin ilk sorusu yanlışsa ikincisi sorulmaz (başlangıç noktası bulundu). */
export function nextPlacementQuestion(units, answers, startedAt, now) {
  if ((now - startedAt) / 60000 >= ENGINE.placement.maxMinutes) return null;
  for (const unit of units) {
    const asked = unit.questions.filter((q) => answers[q.code] !== undefined);
    if (asked.some((q) => answers[q.code] === false)) continue;
    const next = unit.questions.find((q) => answers[q.code] === undefined);
    if (next) return { unit, question: next };
  }
  return null;
}
