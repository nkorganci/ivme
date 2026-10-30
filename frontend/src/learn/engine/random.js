// Belirlenimci seçim: aynı gün, aynı konu ve aynı durum her açılışta aynı soruları verir.
export function hashString(text) {
  let hash = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** mulberry32 */
export function rng(seed) {
  let state = typeof seed === 'number' ? seed >>> 0 : hashString(String(seed));
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle(list, random) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** entries: [{ key, weight }] → ağırlığa göre bir anahtar. */
export function weightedPick(entries, random) {
  const usable = entries.filter((entry) => entry.weight > 0);
  if (!usable.length) return null;
  const total = usable.reduce((sum, entry) => sum + entry.weight, 0);
  let point = random() * total;
  for (const entry of usable) {
    point -= entry.weight;
    if (point <= 0) return entry.key;
  }
  return usable[usable.length - 1].key;
}

/** RFC 4122 sürüm 4 kimlik (olay kimliği). */
export function uuid() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
