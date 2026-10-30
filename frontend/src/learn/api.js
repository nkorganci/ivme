import { api } from '../api.js';
import { uuid } from './engine/random.js';

const SUBJECT = 'matematik';

export const fetchState = () => api.get(`/api/konu-ogrenme?subject=${SUBJECT}`);
export const saveProfile = (settings, revision) => api.put('/api/konu-ogrenme/profile', { subject: SUBJECT, settings, revision });
export const postEvents = (events) => api.post('/api/konu-ogrenme/events', { subject: SUBJECT, events });
export const postBankAnswer = (event) => api.post('/api/konu-ogrenme/bank-answer', { subject: SUBJECT, event });

/** Yeni olay: kimlik ve zaman istemcide üretilir (sunucu aynı kimliği ikinci kez kaydetmez). */
export function makeEvent(kind, fields = {}) {
  return { id: uuid(), at: new Date().toISOString(), kind, ...fields };
}

// Gönderilemeyen olaylar tarayıcıda bekler ve bağlantı dönünce aynı kimlikle yeniden gönderilir.
const outboxKey = (userId) => `ivme:konu-ogrenme:giden:${userId ?? 'anon'}:v1`;

export function readOutbox(userId) {
  try {
    const value = JSON.parse(localStorage.getItem(outboxKey(userId)) ?? '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function writeOutbox(userId, events) {
  try {
    if (events.length) localStorage.setItem(outboxKey(userId), JSON.stringify(events.slice(-500)));
    else localStorage.removeItem(outboxKey(userId));
  } catch { /* özel kipte kayıt olmayabilir */ }
}
