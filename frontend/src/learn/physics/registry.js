// Existing published curriculum identity; a bounded pilot, separate from math mastery.
export const PHYSICS_PILOT = {
  categoryId: 'excel.tyt.fizik.e8dba464c6b583c83c4c',
  path: '/konuyu-ogrenelim/fizik/hareket-kuvvet',
};
export const pilotForTopic = topic => topic.ids.includes(PHYSICS_PILOT.categoryId) ? PHYSICS_PILOT : null;
