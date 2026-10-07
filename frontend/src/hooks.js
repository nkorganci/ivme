import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from './api.js';
import { useAuth } from './auth.jsx';
import { APP_NAME } from './config.js';
import { displayName } from './format.js';

/**
 * İsteği çalıştırır; { data, loading, error, reload, retry } döner.
 * deps değişince veri sıfırlanır; reload() ekranı yanıp söndürmeden yeniler.
 */
export function useAsync(fn, deps) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const seq = useRef(0);

  const load = useCallback((silent) => {
    const id = ++seq.current;
    if (!silent) setState({ data: null, loading: true, error: null });
    fnRef.current().then(
      (data) => id === seq.current && setState({ data, loading: false, error: null }),
      (error) => id === seq.current && setState((s) => (silent ? s : { data: null, loading: false, error })),
    );
  }, []);

  useEffect(() => {
    load(false);
    return () => {
      seq.current++;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { ...state, reload: () => load(true), retry: () => load(false) };
}

/** Klavye kısayolları; form alanı odaktayken, pencere açıkken ya da Ctrl/Alt/Cmd ile basılınca devre dışı kalır. */
export function ignoreHotkey(e) {
  if (e.ctrlKey || e.metaKey || e.altKey) return true;
  const t = e.target;
  if (t instanceof HTMLElement && (t.closest('input, textarea, select') || t.isContentEditable)) return true;
  return !!document.querySelector('[aria-modal="true"]');
}

/** Açılır listeler için tek seferlik filtre verisi (aktif sorular). */
export function useFilterRows() {
  const { data } = useAsync(() => api.get('/api/questions/filters'), []);
  return data || [];
}

/** Sayfa numarasını adres çubuğunda (?page=) tutar. */
export function usePageParam() {
  const [params, setParams] = useSearchParams();
  const page = Math.max(0, parseInt(params.get('page') || '0', 10) || 0);
  const setPage = (p) => {
    const next = new URLSearchParams(params);
    if (p > 0) next.set('page', String(p));
    else next.delete('page');
    setParams(next);
    window.scrollTo({ top: 0 });
  };
  return [page, setPage];
}

/** Sunucudan gelen kalan saniyeye göre geri sayım (süresizse null). */
export function useCountdown(remainingSeconds) {
  const endAt = useRef(undefined);
  if (endAt.current === undefined) {
    endAt.current = remainingSeconds == null ? null : Date.now() + remainingSeconds * 1000;
  }
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);

  if (endAt.current == null) return null;
  return Math.max(0, Math.ceil((endAt.current - now) / 1000));
}

/** Sekme başlığı: "{Sayfa} · {ad} · Uygulama adı" (oturum yoksa ad atlanır). */
export function usePageTitle(page) {
  const { user } = useAuth();
  const name = user ? displayName(user) : '';
  useEffect(() => {
    document.title = [page, name, APP_NAME].filter(Boolean).join(' · ');
  }, [page, name]);
}
