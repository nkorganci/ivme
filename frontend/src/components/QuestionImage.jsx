import { useEffect, useMemo, useRef, useState } from 'react';
import { imageUrl, solutionImageUrl } from '../api.js';
import { useDisplayPreference } from '../useDisplayPreference.js';

/**
 * Soru görseli: alanında ortalanır, tıklayınca büyür; yüklenemezse bilgi kutusu gösterir.
 * "Sığdır" açıkken görsel, yanıt denetimlerine de yer bırakarak ekrana sığar.
 */
export default function QuestionImage({ id, version, alt = 'Soru görseli', solution = false, onReady }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [natural, setNatural] = useState(null);
  const [fit, setFit, preferenceError] = useDisplayPreference('question-image-fit', true);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const wrap = useRef(null);
  const imgRef = useRef(null);
  const src = solution ? solutionImageUrl(id) : imageUrl(id, version);

  useEffect(() => {
    setFailed(false);
    setLoaded(false);
    setZoom(false);
    setNatural(null);
  }, [src]);

  // Önbellekteki görselde onLoad, dinleyici bağlanmadan tetiklenmiş olabilir; boyutu burada da oku
  useEffect(() => {
    const i = imgRef.current;
    if (i && i.complete && i.naturalWidth) {
      setNatural({ w: i.naturalWidth, h: i.naturalHeight });
      setLoaded(true);
      onReady?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return undefined;
    const page = el.closest('.qpage');
    const dock = page?.querySelector('.qdock');
    const measure = () => {
      const constrained = el.closest('.qmain > .image-card, .exam-main > .image-card');
      const top = solution ? 100 : Math.max(0, el.getBoundingClientRect().top);
      const reserved = (dock?.getBoundingClientRect().height || 0) + 24;
      const next = { w: el.clientWidth, h: constrained ? el.clientHeight : Math.max(80, window.innerHeight - top - reserved) };
      setBox((current) => current.w === next.w && current.h === next.h ? current : next);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (dock) ro.observe(dock);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [solution]);

  const toggleFit = () => setFit(!fit);

  // Genişlik ve yükseklik sınırlarının ikisine de uy; uzun sorular için alt ölçek sınırı koyma.
  const fitWidth = useMemo(() => {
    if (!fit || !natural || !box.w) return undefined;
    return Math.max(1, Math.floor(Math.min(natural.w, box.w - 4, natural.w * (box.h - 4) / natural.h)));
  }, [fit, natural, box]);

  useEffect(() => {
    if (!zoom) return undefined;
    const previous = document.activeElement;
    const dialog = wrap.current?.querySelector('.lightbox');
    const close = dialog?.querySelector('button');
    close?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); setZoom(false); return; }
      if (e.key === 'Tab') { e.preventDefault(); close?.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); previous?.focus?.(); };
  }, [zoom]);

  if (failed) {
    return (
      <div className="image-fail" role="img" aria-label={solution ? 'Çözüm görseli yüklenemedi' : 'Görsel yüklenemedi'}>
        <span aria-hidden="true">🖼</span> {solution ? 'Çözüm görseli yüklenemedi' : 'Görsel yüklenemedi'}
      </div>
    );
  }

  return (
    <div className="image-wrap" ref={wrap}>
      <button type="button" className={`image-btn${loaded ? '' : ' image-loading'}`} onClick={() => setZoom(true)} aria-label="Görseli büyüt">
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          style={fitWidth ? { width: fitWidth } : undefined}
          onLoad={(e) => {
            setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight });
            setLoaded(true);
            onReady?.();
          }}
          onError={() => setFailed(true)}
        />
      </button>
      <button
        type="button"
        className="image-fit"
        onClick={toggleFit}
        aria-pressed={fit}
        title={fit ? 'Tam genişlikte göster (daha büyük)' : 'Ekrana sığdır (kaydırma gerekmez)'}
      >
        {fit ? '↔ Genişlet' : '⤢ Sığdır'}
      </button>
      {preferenceError && <p className="field-error" role="alert">{preferenceError}</p>}
      {zoom && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label="Büyütülmüş görsel" onClick={(e) => e.target === e.currentTarget && setZoom(false)}>
          <button type="button" className="icon-btn lightbox-close" aria-label="Kapat" autoFocus onClick={() => setZoom(false)}>
            ×
          </button>
          <img src={src} alt={alt} />
        </div>
      )}
    </div>
  );
}
