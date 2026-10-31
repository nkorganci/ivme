import { api } from '../api.js';
import { uuid } from './engine/random.js';

const SUBJECT = 'matematik';

export const fetchState = (userId) => api.get(`/api/konu-ogrenme?subject=${SUBJECT}&expectedUserId=${userId}`);
export const saveProfile = (settings, revision, expectedUserId) => api.put('/api/konu-ogrenme/profile', { subject: SUBJECT, settings, revision, expectedUserId });
export const postEvents = (events, expectedUserId) => api.post('/api/konu-ogrenme/events', { subject: SUBJECT, events, expectedUserId });
export const postBankAnswer = (event, expectedUserId) => api.post('/api/konu-ogrenme/bank-answer', { subject: SUBJECT, event, expectedUserId });

/** Yeni olay: kimlik ve zaman istemcide üretilir (sunucu aynı kimliği ikinci kez kaydetmez). */
export function makeEvent(kind, fields = {}) {
  return { id: uuid(), at: new Date().toISOString(), kind, ...fields };
}
