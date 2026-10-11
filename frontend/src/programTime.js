export const DEFAULT_BOUNDARIES = Array.from({ length: 15 }, (_, index) =>
  `${String(index + 8).padStart(2, '0')}:00`);

const minutes = (value) => {
  if (!/^\d{2}:\d{2}$/.test(value)) return NaN;
  const [hour, minute] = value.split(':').map(Number);
  return hour < 24 && minute < 60 ? hour * 60 + minute : NaN;
};

const clock = (value) => `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;

export function normalize24Hour(value) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour < 24 && minute < 60
    ? `${String(hour).padStart(2, '0')}:${match[2]}` : null;
}

export function shiftTimeBoundary(boundaries, index, value) {
  const nextTime = minutes(value);
  const previousTime = minutes(boundaries[index]);
  if (!Number.isInteger(index) || index < 0 || index >= boundaries.length ||
      !Number.isFinite(nextTime) || !Number.isFinite(previousTime)) return null;
  const delta = nextTime - previousTime;
  const shifted = boundaries.map((time, position) => {
    const current = minutes(time);
    return Number.isFinite(current) ? current + (position >= index ? delta : 0) : NaN;
  });
  if (shifted.some((time) => !Number.isFinite(time) || time < 0 || time > 1439) ||
      shifted.some((time, position) => position && time - shifted[position - 1] < 5)) return null;
  return shifted.map(clock);
}
