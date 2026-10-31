import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../auth.jsx';
import { getIndex } from './content/lessons.js';
import { bankSummary } from './bank.js';
import { fetchState, makeEvent, postBankAnswer, postEvents, saveProfile } from './api.js';
import { LearnOutbox } from './outbox.js';
import { normalizeSettings } from './engine/config.js';
import { derive } from './engine/derive.js';
import { addDays, dayKey, fromDayKey } from './engine/dates.js';
import { buildPlan, dueLoad, isDone } from './engine/plan.js';

const LearnContext = createContext(null);
const NO_PREFERENCES = { hidden: [], again: [], difficulty: {} };
// Keep quota-denied drafts alive across SPA navigation and account switches in this tab.
const pendingByUser = new Map();
window.addEventListener('beforeunload', (event) => {
  if ([...pendingByUser.values()].some((entries) => entries.size)) {
    event.preventDefault(); event.returnValue = '';
  }
});

const startOf = (key) => {
  const date = fromDayKey(key);
  date.setHours(0, 0, 0, 0);
  return date;
};

/** Konuyu Öğrenelim: sunucunun onayladığı olaylar → ilerleme ve günün planı. */
export function LearnProvider({ children }) {
  const { user } = useAuth();
  return user ? <UserLearnProvider key={user.id} userId={user.id}>{children}</UserLearnProvider> : null;
}

function UserLearnProvider({ children, userId }) {
  const index = useMemo(() => getIndex(), []);
  const [server, setServer] = useState({ loading: true, error: null, events: [], profile: null, practiceSets: [], questionPreferences: NO_PREFERENCES });
  const [queueVersion, setQueueVersion] = useState(0);
  const [clock, setClock] = useState(() => new Date());
  const active = useRef(true);
  const savedEvents = useRef(new Map());
  const [queue] = useState(() => new LearnOutbox({
    userId,
    entries: pendingByUser.get(userId) ?? (() => {
      const entries = new Map(); pendingByUser.set(userId, entries); return entries;
    })(),
    storage: {
      getItem: (key) => localStorage.getItem(key), setItem: (key, value) => localStorage.setItem(key, value),
      removeItem: (key) => localStorage.removeItem(key), key: (i) => localStorage.key(i),
      get length() { return localStorage.length; },
    },
    postEvents, postBankAnswer,
    onChange: () => setQueueVersion((v) => v + 1),
    onSaved: (events) => {
      events.forEach((event) => savedEvents.current.set(event.id, event));
      const ids = new Set(events.map((event) => event.id));
      setServer((current) => ({ ...current, events: [...current.events.filter((event) => !ids.has(event.id)), ...events] }));
    },
  }));
  const syncError = queue.error;
  const pending = queue.pending;
  const load = useCallback(async () => {
    try {
      const data = await fetchState(userId);
      if (!active.current) return;
      const merged = new Map((data.events ?? []).map((event) => [event.id, event]));
      savedEvents.current.forEach((event, id) => merged.set(id, event));
      merged.forEach((event, id) => savedEvents.current.set(id, event));
      setServer({ loading: false, error: null, events: [...merged.values()], profile: data.profile ?? null, practiceSets: data.practiceSets ?? [], questionPreferences: data.questionPreferences ?? NO_PREFERENCES });
    } catch (error) {
      if (active.current) setServer((current) => ({ ...current, loading: false, error }));
    }
  }, [userId]);
  const flush = useCallback(() => queue.flush(true), [queue]);
  useEffect(() => {
    active.current = true; queue.active = true;
    load();
    const retry = () => queue.flush();
    const storage = (event) => {
      if (event.key === null || event.key.startsWith(queue.prefix)) { queue.restore(); queue.changed(); retry(); load(); }
    };
    // Başka sekmede (ortak PRATIK seti) verilen cevaplar bu sekmeye dönünce okunur.
    const refocus = () => { if (document.visibilityState === 'visible') load(); };
    window.addEventListener('online', retry);
    window.addEventListener('storage', storage);
    document.addEventListener('visibilitychange', refocus);
    const timer = setInterval(() => { setClock(new Date()); retry(); }, 30000);
    return () => {
      active.current = false; queue.active = false;
      window.removeEventListener('online', retry); window.removeEventListener('storage', storage); document.removeEventListener('visibilitychange', refocus); clearInterval(timer);
    };
  }, [load, queue]);
  useEffect(() => {
    if (!server.loading && pending) {
      const timer = setTimeout(() => queue.flush(), 400);
      return () => clearTimeout(timer);
    }
  }, [server.loading, pending, queue]);

  const settings = useMemo(() => normalizeSettings(server.profile?.settings), [server.profile]);
  // Only DB-confirmed events contribute to durable progress and mastery.
  const events = server.events;

  const today = dayKey(clock);
  // TAS-06: kişisel tercihler (gizlenen / bekleyen tekrar istenen sorular) seçim mantığının okuduğu duruma eklenir.
  const preferences = server.questionPreferences;
  const state = useMemo(() => Object.assign(derive({ events, index, settings, now: clock }),
    { hidden: new Set(preferences.hidden), again: new Set(preferences.again) }), [events, index, settings, clock, preferences]);

  // Plan günün başındaki duruma göre kurulur (gün içinde sabit kalır); tamamlanma bugünkü durumdan okunur.
  const beforeRef = useRef({ key: '', list: [] });
  const beforeToday = useMemo(() => {
    const list = events.filter((e) => new Date(e.at) < startOf(today));
    const key = `${today}:${list.length}:${list[list.length - 1]?.id ?? ''}`;
    if (beforeRef.current.key !== key) beforeRef.current = { key, list };
    return beforeRef.current.list;
  }, [events, today]);
  const plan = useMemo(() => {
    const start = startOf(today);
    const startState = derive({ events: beforeToday, index, settings, now: start });
    const yesterday = derive({ events: beforeToday.filter((e) => new Date(e.at) < startOf(addDays(today, -1))), index, settings, now: startOf(addDays(today, -1)) });
    const built = buildPlan({ state: startState, index, summary: bankSummary, yesterdayLoad: dueLoad(yesterday, index, bankSummary) });
    return { ...built, startState };
  }, [beforeToday, index, settings, today]);
  const planItems = useMemo(() => plan.items.map((item) => ({ ...item, done: isDone(item, state, plan.date, index) })), [plan, state, index]);
  const nextUp = useMemo(() => {
    const live = buildPlan({ state, index, summary: bankSummary, yesterdayLoad: 0 });
    const planned = new Set(plan.items.map((item) => item.key));
    return live.items.filter((item) => !planned.has(item.key) && !isDone(item, state, today, index)).slice(0, 4);
  }, [state, index, plan, today]);

  const record = useCallback((input) => {
    const list = (Array.isArray(input) ? input : [input]).filter(Boolean);
    queue.add(list);
    return list;
  }, [queue]);
  const recordNew = useCallback((kind, fields) => record(makeEvent(kind, fields))[0], [record]);
  const confirm = useCallback(async (input) => {
    const list = record(input);
    await queue.flush();
    // A flush already in flight may have started before these events were added.
    if (list.some((event) => queue.entries.has(event.id))) await queue.flush();
    return active.current && list.every((event) => savedEvents.current.has(event.id));
  }, [record, queue]);
  const pendingBank = useCallback((itemId, context, setId) => [...queue.entries.values()]
    .find(({ event }) => event.itemType === 'bank' && event.itemId === itemId && event.context === context && event.setId === setId)?.event, [queue]);
  const answerBank = useCallback(async (input) => {
    const prior = [...queue.entries.values()].find(({ event }) => event.itemType === 'bank'
      && event.itemId === input.itemId && event.context === input.context && event.setId === input.setId);
    const event = prior?.event ?? input;
    record(event);
    await queue.flush(true);
    if (!savedEvents.current.has(event.id)) await queue.flush(true);
    const saved = savedEvents.current.get(event.id);
    if (!active.current || !saved) throw new Error(queue.error || 'Cevap henüz sunucuya kaydedilmedi. Tekrar dene.');
    return { event: saved, correct: saved.correct, correctAnswer: saved.correctAnswer, hasSolution: queue.bankResults.get(event.id)?.hasSolution ?? saved.hasSolution ?? false };
  }, [queue, record]);

  const updateSettings = useCallback(async (next) => {
    const profile = await saveProfile(normalizeSettings(next), server.profile?.revision ?? null, userId);
    if (active.current) setServer((current) => ({ ...current, profile }));
    return profile;
  }, [server.profile, userId]);

  const value = useMemo(() => ({
    loading: server.loading, error: server.error, reload: load, syncError, pending, flush, userId, confirm,
    index, summary: bankSummary, settings, profile: server.profile, events, state, today, now: clock, practiceSets: server.practiceSets, questionPreferences: preferences,
    plan: { ...plan, items: planItems }, nextUp, record, recordNew, answerBank, pendingBank, updateSettings,
  }), [server.loading, server.error, server.practiceSets, preferences, load, syncError, pending, flush, userId, confirm, queueVersion, index, settings, server.profile, events, state, today, clock, plan, planItems, nextUp, record, recordNew, answerBank, pendingBank, updateSettings]);

  return <LearnContext.Provider value={value}>{children}</LearnContext.Provider>;
}

export function useLearn() {
  const value = useContext(LearnContext);
  if (!value) throw new Error('useLearn yalnız LearnProvider içinde kullanılır.');
  return value;
}
