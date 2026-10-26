// Güneş ışınları hesapları (saf işlevler). Sınav değerleri: eksen eğikliği 23°27′ = 23,45°.
export const TILT = 23.45;
export const KEY_DAYS = { 80: 0, 172: TILT, 266: 0, 355: -TILT }; // 21 Mart, 21 Haziran, 23 Eylül, 21 Aralık
const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const LENGTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** Gün numarası (1–365) → "21 Haziran". */
export function dateText(day) {
  let rest = day;
  for (let m = 0; m < 12; m += 1) { if (rest <= LENGTHS[m]) return `${rest} ${MONTHS[m]}`; rest -= LENGTHS[m]; }
  return `${day}`;
}

/** Güneş ışınlarının dik geldiği enlem (deklinasyon), derece. Ekinoks ve gündönümlerinde tam değer. */
export function declination(day) {
  if (KEY_DAYS[day] !== undefined) return KEY_DAYS[day];
  // Dört anahtar günden geçen parçalı sinüs: 21 Mart 0, 21 Haziran +23,45, 23 Eylül 0, 21 Aralık −23,45.
  const q = Math.PI / 2;
  if (day >= 80 && day <= 172) return TILT * Math.sin((q * (day - 80)) / 92);
  if (day > 172 && day <= 266) return TILT * Math.cos((q * (day - 172)) / 94);
  if (day > 266 && day <= 355) return -TILT * Math.sin((q * (day - 266)) / 89);
  const d = day < 80 ? day + 365 : day;
  return -TILT * Math.cos((q * (d - 355)) / 90);
}

/** Öğle güneş yükseklik açısı (derece): 90 − |φ − δ|; negatifse Güneş doğmaz. */
export const noonAltitude = (lat, dec) => 90 - Math.abs(lat - dec);

/** Gündüz süresi (saat): cos ω = −tan φ · tan δ. */
export function dayLength(lat, dec) {
  const value = -Math.tan((lat * Math.PI) / 180) * Math.tan((dec * Math.PI) / 180);
  if (value <= -1) return 24;
  if (value >= 1) return 0;
  return (2 * ((Math.acos(value) * 180) / Math.PI)) / 15;
}

/** 1 m'lik çubuğun öğle gölgesi: uzunluk ve yön. */
export function shadow(lat, dec) {
  const h = noonAltitude(lat, dec);
  if (h <= 0) return { length: Infinity, direction: 'Güneş doğmuyor' };
  if (Math.abs(lat - dec) < 1e-9) return { length: 0, direction: 'gölge oluşmaz (ışınlar dik)' };
  return { length: 1 / Math.tan((h * Math.PI) / 180), direction: lat > dec ? 'kuzeye düşer' : 'güneye düşer' };
}

/** Derece → 23°27′ biçimi. */
export function dms(value) {
  const sign = value < 0 ? '−' : '';
  const abs = Math.abs(value);
  let d = Math.floor(abs); let m = Math.round((abs - d) * 60);
  if (m === 60) { d += 1; m = 0; }
  return `${sign}${d}°${m ? `${String(m).padStart(2, '0')}′` : ''}`;
}
export const latText = (lat) => (Math.abs(lat) < 1e-9 ? '0° (Ekvator)' : `${dms(Math.abs(lat))} ${lat > 0 ? 'K' : 'G'}`);
