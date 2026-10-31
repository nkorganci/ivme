// Kaynaklı öğretim kanıtı (TAS-08/09). Kayıt `kanit/index.js` içerik hattının çıktısıdır; burada yalnız sorgular var.
import { EVIDENCE } from './kanit/index.js';

const BY_QUESTION = Object.fromEntries(Object.values(EVIDENCE)
  .flatMap((evidence) => Object.keys(evidence.questions).map((code) => [code, evidence])));

export const evidenceFor = (conceptId) => EVIDENCE[conceptId] ?? null;

/** Sorunun kaynaklı çözüm kaydını taşıyan konu kanıtı; yoksa null. */
export const evidenceForQuestion = (code) => BY_QUESTION[code] ?? null;

export function examScope(exams) {
  return exams.length > 1 ? `${exams.join(' ve ')} için ortak temel.` : `Yalnız ${exams[0]} kapsamı.`;
}
