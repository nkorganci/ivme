// Boşluk doldurma puanlaması. Sunucu aynı kuralı AnswerKeys.java içinde uygular (TAS-04);
// ortak örnekler backend/src/test/resources/learn/fill-cases.json dosyasında iki tarafta da denenir.

export function parseAnswer(text) {
  const value = String(text).trim().replace(/\s+/g, '').replace(',', '.').replace('−', '-');
  const fraction = value.match(/^(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/);
  if (fraction) return Number(fraction[1]) / Number(fraction[2]);
  return value === '' ? NaN : Number(value);
}

export function fillCorrect(answers, tolerance, text) {
  const numeric = parseAnswer(text);
  return answers.some((answer) => {
    const expected = parseAnswer(answer);
    return Number.isFinite(expected) && Number.isFinite(numeric)
      ? Math.abs(expected - numeric) <= Math.max(tolerance, 1e-9)
      : answer.trim().toLocaleLowerCase('tr') === text.trim().toLocaleLowerCase('tr');
  });
}
