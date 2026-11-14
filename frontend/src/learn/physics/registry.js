// Existing published curriculum identity; a bounded pilot, separate from math mastery.
export const PHYSICS_PILOT = {
  categoryId: 'excel.tyt.fizik.e8dba464c6b583c83c4c',
  path: '/konuyu-ogrenelim/fizik/hareket-kuvvet',
};
// Konu paketi v1 (16.04): yayımlanmış kategori kimliğinden yeni konu sayfasına. Eski pilot yolu korunur.
const KONU_PAKETLERI = { 'excel.tyt.fizik.e8dba464c6b583c83c4c': { categoryId: 'excel.tyt.fizik.e8dba464c6b583c83c4c', path: '/konuyu-ogrenelim/ogren/fizik-hareket' } };
export const pilotForTopic = topic => topic.ids.map(id => KONU_PAKETLERI[id]).find(Boolean)
  ?? (topic.ids.includes(PHYSICS_PILOT.categoryId) ? PHYSICS_PILOT : null);
