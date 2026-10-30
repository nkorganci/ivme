// Hatırlatma (spec §11): Bugün ekranı, tarayıcı bildirimi (uygulama açıkken, günde en çok bir kez) ve
// takvim dosyası (.ics, her gün hatırlatma saatinde tekrarlayan etkinlik). Ayrı bir anlık bildirim sunucusu yoktur.
import { dayKey } from './engine/dates.js';

const pad = (value) => String(value).padStart(2, '0');

export function reminderIcs(settings, origin = globalThis.location?.origin ?? '') {
  const [hour, minute] = settings.reminderTime.split(':');
  const now = new Date();
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}00Z`;
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Ivme//Konuyu Ogrenelim//TR', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
    `UID:ivme-konuyu-ogrenelim-${date}@ivme`, `DTSTAMP:${stamp}`, `DTSTART:${date}T${hour}${minute}00`, 'DURATION:PT30M', 'RRULE:FREQ=DAILY',
    'SUMMARY:Konuyu Öğrenelim — bugünün planı', `DESCRIPTION:Tekrarlar, yanlış sorular ve yeni konu seni bekliyor. ${origin}/konuyu-ogrenelim`,
    `URL:${origin}/konuyu-ogrenelim`, 'BEGIN:VALARM', 'TRIGGER:PT0M', 'ACTION:DISPLAY', 'DESCRIPTION:Bugünün planı hazır', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR', '',
  ].join('\r\n');
}

export function downloadReminder(settings) {
  const blob = new Blob([reminderIcs(settings)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'konuyu-ogrenelim-hatirlatma.ics';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const notifiedKey = (userId) => `ivme:konu-ogrenme:bildirim:${userId ?? 'anon'}`;

/** Hatırlatma saati geçtiyse, plan bitmediyse ve bugün bildirim gösterilmediyse tek bir bildirim. */
export function maybeNotify({ settings, plan, userId, now = new Date() }) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted' || !settings.notifications) return false;
  const [hour, minute] = settings.reminderTime.split(':').map(Number);
  if (now.getHours() * 60 + now.getMinutes() < hour * 60 + minute) return false;
  const today = dayKey(now);
  if (localStorage.getItem(notifiedKey(userId)) === today) return false;
  const left = plan.items.filter((item) => !item.done);
  if (!left.length) return false;
  localStorage.setItem(notifiedKey(userId), today);
  const minutes = left.reduce((sum, item) => sum + item.minutes, 0);
  new Notification('Konuyu Öğrenelim', { body: `Bugün ${left.length} iş kaldı (≈${minutes} dk). Kısa bir tekrarla başlayalım mı?`, tag: 'konuyu-ogrenelim' });
  return true;
}
