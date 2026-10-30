// Ders dosyaları paketle birlikte gelir (Konuyu Öğrenelim bölümü tembel yüklenir); ayrıştırma bir kez yapılır.
import { buildIndex, parseLesson } from './parser.js';
import { UNITS } from './units.js';

const SOURCES = import.meta.glob('./dersler/*.ders', { query: '?raw', import: 'default', eager: true });

const lessonCache = new Map();
let indexCache = null;
const loadErrors = [];

function fileIdOf(path) {
  return path.split('/').pop().replace(/\.ders$/, '');
}

export function getLesson(id) {
  if (lessonCache.has(id)) return lessonCache.get(id);
  const path = Object.keys(SOURCES).find((p) => fileIdOf(p) === id);
  if (!path) return null;
  const lesson = parseLesson(SOURCES[path], id);
  lessonCache.set(id, lesson);
  return lesson;
}

export function getIndex() {
  if (indexCache) return indexCache;
  const lessons = [];
  for (const path of Object.keys(SOURCES)) {
    try {
      lessons.push(getLesson(fileIdOf(path)));
    } catch (error) {
      loadErrors.push(`${fileIdOf(path)}: ${error.message}`);
    }
  }
  indexCache = buildIndex(lessons, UNITS);
  return indexCache;
}

export const lessonLoadErrors = () => loadErrors;
