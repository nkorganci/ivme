// Kavram başına banka dosyaları scripts/konu-ogrenme-banka.py ile veritabanından üretilir (cevap anahtarı içermez).
import { collapseTwins, expandBank } from './engine/selection.js';

const FILES = import.meta.glob('./bank/*.json', { import: 'default' });
const SUMMARY = import.meta.glob('./bank/_ozet.json', { import: 'default', eager: true });
const cache = new Map();

export const bankSummary = Object.values(SUMMARY)[0] ?? { concepts: {} };

// Aynı görseli taşıyan kodlar (EA/Sayısal kitapçık kopyaları) bankada tek soru sayılır; harita scripts/ortak-set-tani.mjs ile üretilir.
let twinGroups = null;
const groups = () => (twinGroups ??= (FILES['./bank/_gorsel.json']?.() ?? Promise.resolve({})).then((data) => data.groups ?? {}));

export async function loadBank(conceptId) {
  if (cache.has(conceptId)) return cache.get(conceptId);
  const loader = FILES[`./bank/${conceptId}.json`];
  const raw = loader ? await loader() : { questions: [] };
  const bank = collapseTwins(expandBank(conceptId, raw.questions ?? []), await groups());
  cache.set(conceptId, bank);
  return bank;
}

export async function loadBanks(conceptIds) {
  const entries = await Promise.all(conceptIds.map(async (id) => [id, await loadBank(id)]));
  return Object.fromEntries(entries);
}

export const bankCount = (conceptId) => bankSummary.concepts?.[conceptId]?.total ?? 0;
export const pastCount = (conceptId, track) => {
  const counts = bankSummary.concepts?.[conceptId]?.cikmis ?? {};
  return track ? counts[track] ?? 0 : (counts.TYT ?? 0) + (counts.AYT ?? 0);
};
