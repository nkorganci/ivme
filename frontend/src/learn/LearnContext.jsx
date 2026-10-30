import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../auth.jsx';
import { getIndex } from './content/lessons.js';
import { bankSummary } from './bank.js';
import { fetchState, makeEvent, postBankAnswer, postEvents, readOutbox, saveProfile, writeOutbox } from './api.js';
import { normalizeSettings } from './engine/config.js';
import { derive } from './engine/derive.js';
import { addDays, dayKey, fromDayKey } from './engine/dates.js';
import { buildPlan, dueLoad, isDone } from './engine/plan.js';

const LearnContext = createContext(null);

const startOf = (key) => {
  const date = fromDayKey(key);
  date.setHours(0, 0, 0, 0);
  return date;
};

/** Konuyu Öğrenelim durumu: olay günlüğü (sunucu + gönderilmeyi bekleyenler) → türetilmiş durum ve günün planı. */
export function LearnProvider({ children }) {
  const { user } = useAuth();
  const index = useMemo(() => getIndex(), []);
  const [server, setServer] = useState({ loading: true, error: null, events: [], profile: null });
  const [outbox, setOutbox] = useState(() => readOutbox(user?.id));
  const [syncError, setSyncError] = useState('');
  const [clock, setClock] = useState(() => new Date());
  const sending = useRef(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchState();
      setServer({ loading: false, error: null, events: data.events ?? [], profile: data.profile ?? null });
    } catch (error) {
      setServer((current) => ({ ...current, loading: false, error }));
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => { writeOutbox(user?.id, outbox); }, [outbox, user?.id]);

  const flush = useCallback(async () => {
    if (sending.current) return;
    const queue = readOutbox(user?.id);
    if (!queue.length) return;
    sending.current = true;
    try {
      for (let i = 0; i < queue.length; i += 50) {
        const chunk = queue.slice(i, i + 50);
        const result = await postEvents(chunk);
        const saved = result.events ?? [];
        const ids = new Set(chunk.map((e) => e.id));
        setServer((current) => ({ ...current, events: [...current.events.filter((e) => !ids.has(e.id)), ...saved] }));
        setOutbox((current) => current.filter((e) => !ids.has(e.id)));
      }
      setSyncError('');
    } catch (error) {
      setSyncError(error.status === 400
        ? `Bazı kayıtlar sunucuda reddedildi: ${error.message}`
        : 'Bağlantı yok: çalışman bu tarayıcıda saklanıyor, bağlantı gelince otomatik kaydedilecek.');
      if (error.status === 400) setOutbox([]);
    } finally {
      sending.current = false;
    }
  }, [user?.id]);

  useEffect(() => {
    if (!server.loading && outbox.length) {
      const timer = setTimeout(flush, 400);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [server.loading, outbox.length, flush]);
  useEffect(() => {
    const retry = () => flush();
    window.addEventListener('online', retry);
    const timer = setInterval(retry, 30000);
    return () => { window.removeEventListener('online', retry); clearInterval(timer); };
  }, [flush]);

  const settings = useMemo(() => normalizeSettings(server.profile?.settings), [server.profile]);
  const events = useMemo(() => {
    const known = new Set(server.events.map((e) => e.id));
    return [...server.events, ...outbox.filter((e) => !known.has(e.id))];
  }, [server.events, outbox]);

  const today = dayKey(clock);
  const state = useMemo(() => derive({ events, index, settings, now: clock }), [events, index, settings, clock]);

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
    if (!list.length) return [];
    setOutbox((current) => [...current, ...list]);
    return list;
  }, []);

  const recordNew = useCallback((kind, fields) => record(makeEvent(kind, fields))[0], [record]);

  const answerBank = useCallback(async (event) => {
    const result = await postBankAnswer(event);
    setServer((current) => ({ ...current, events: [...current.events.filter((e) => e.id !== result.event.id), result.event] }));
    return result;
  }, []);

  const updateSettings = useCallback(async (next) => {
    const profile = await saveProfile(normalizeSettings(next), server.profile?.revision ?? null);
    setServer((current) => ({ ...current, profile }));
    return profile;
  }, [server.profile]);

  const value = useMemo(() => ({
    loading: server.loading, error: server.error, reload: load, syncError, pending: outbox.length, flush,
    index, summary: bankSummary, settings, profile: server.profile, events, state, today, now: clock,
    plan: { ...plan, items: planItems }, nextUp, record, recordNew, answerBank, updateSettings,
  }), [server.loading, server.error, load, syncError, outbox.length, flush, index, settings, server.profile, events, state, today, clock, plan, planItems, nextUp, record, recordNew, answerBank, updateSettings]);

  return <LearnContext.Provider value={value}>{children}</LearnContext.Provider>;
}

export function useLearn() {
  const value = useContext(LearnContext);
  if (!value) throw new Error('useLearn yalnız LearnProvider içinde kullanılır.');
  return value;
}
