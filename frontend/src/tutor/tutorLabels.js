// Öğretim döngüsü ekranlarının sabit etiketleri. Branş adları ortak müfredat sözlüğünden gelir.
import { CURRICULUM } from '../curriculum.js';

const NAMES = new Map(Object.values(CURRICULUM).flat().map((subject) => [subject.id, subject.name]));

export const BRANCH_ORDER = ['turkce', 'edebiyat', 'matematik', 'geometri', 'fizik', 'kimya', 'biyoloji', 'tarih', 'cografya',
  'felsefe', 'psikoloji', 'sosyoloji', 'mantik', 'din'];

export const subjectName = (id) => NAMES.get(id) ?? id;

export const DIFFICULTY = { KOLAY: 'Kolay', ORTA: 'Orta', ZOR: 'Zor', ILERI: 'İleri' };
export const HINT_KIND = { KAVRAM: 'Kavram ipucu', STRATEJI: 'Strateji ipucu', ADIM: 'İlk adım ipucu' };
export const LEVEL = { SEZGI: 'Sezgi', ADIM: 'Adım adım', KISAYOL: 'Sınav kısayolu' };
export const LEVEL_HELP = {
  SEZGI: 'Olayın mantığı ve zihinde canlandırma',
  ADIM: 'Her adım ve nedeni',
  KISAYOL: 'Sınavda zaman kazandıran güvenli yol',
};
export const OUTCOME = {
  INDEPENDENT: 'Yardımsız çözdün', ASSISTED: 'Yardımla çözdün', WORKED: 'Adımlarla birlikte çözdük', SOLUTION_VIEWED: 'Çözümü inceledin',
};
export const MASTERY = { YENI: 'Yeni', BASLANGIC: 'Başlangıç', GELISIYOR: 'Gelişiyor', USTA: 'Usta' };
export const STEP = {
  PREVIEW: 'Büyük fikir', STRATEGY: 'İlk hamle', ATTEMPT: 'Deneme', RETRY_MISCONCEPTION: 'Yanılgıyı düzelt', HINT: 'İpucu',
  WORKED: 'Adım adım', EXPLAIN: 'Neden?', VISUAL: 'Görsel', TWIN: 'İkiz soru', DONE: 'Özet',
};
export const TEMPLATE = {
  'number-line': 'Sayı doğrusu', timeline: 'Zaman çizelgesi', plot: 'Grafik', geometry: 'Dinamik geometri', diagram: 'Şema',
  venn: 'Venn şeması', tokens: 'Metin çözümleme', 'bar-model': 'Şerit model', particles: 'Parçacık modeli', motion: 'Hareket',
  grid: 'Izgara', circuit: 'Devre', 'sun-angle': 'Güneş açısı', 'truth-table': 'Doğruluk tablosu',
};
export const CONTENT_STATUS = {
  AUTO_VERIFIED: 'Otomatik doğrulandı', NEEDS_REVIEW: 'İnceleme gerekli', APPROVED: 'Öğretmen onaylı', REJECTED: 'Reddedildi',
  SUPERSEDED: 'Eski sürüm',
};
export const BAND = { HIGH: 'Yüksek', MEDIUM: 'Orta', LOW: 'Düşük' };
export const FREE_TEXT_LABEL = {
  CORRECT: 'Gerekçen doğru', PARTIAL: 'Kısmen doğru', OFF_TOPIC: 'Adımla ilgili değil', TEACHER: 'Öğretmene iletildi',
};
export const ROUTE = { ECONOMIC: 'ekonomik model', STRONG: 'güçlü model', TEACHER: 'öğretmen' };

export const freeTextLabel = (label) => (label?.startsWith('MISCONCEPTION:') ? 'Bilinen bir yanılgı' : FREE_TEXT_LABEL[label] ?? label);

export function masteryPercent(value) {
  return value == null ? null : Math.round(value * 100);
}

export function dueNow(nextReviewAt, now = Date.now()) {
  return !!nextReviewAt && new Date(nextReviewAt).getTime() <= now;
}

export function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' });
}

/** Katalog öğelerini müfredat branş sırasına göre gruplar. */
export function groupByBranch(items) {
  const groups = new Map();
  for (const item of items ?? []) {
    if (!groups.has(item.subjectId)) groups.set(item.subjectId, []);
    groups.get(item.subjectId).push(item);
  }
  const order = (id) => (BRANCH_ORDER.includes(id) ? BRANCH_ORDER.indexOf(id) : 99);
  return [...groups.entries()].sort(([a], [b]) => order(a) - order(b)).map(([subjectId, list]) => ({
    subjectId, name: subjectName(subjectId),
    items: list.sort((a, b) => a.exam.localeCompare(b.exam) || a.unitName.localeCompare(b.unitName, 'tr')),
  }));
}
