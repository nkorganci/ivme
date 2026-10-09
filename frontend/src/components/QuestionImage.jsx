import { useEffect, useMemo, useRef, useState } from 'react';
import { imageUrl, solutionImageUrl } from '../api.js';

const FIT_KEY = 'yks.imgfit';
const FIT_OFFSET = 200;   // üst çubuk + şerit + alt kontrol çubuğu + boşluklar (px)
const MIN_SHARE = 0.62;   // sığdırma, görseli tam genişlik boyutunun %62'sinden daha fazla küçültmez (uzun görseller okunaklı kalsın)

/**
 * Soru görseli: ortalı, tıklayınca büyür; yüklenemezse bilgi kutusu gösterir.
 * "Sığdır" açıkken görsel, mümkünse kaydırmadan tamamı ekrana sığacak boyutta gösterilir; kapalıyken kapsayıcı genişliğini doldurur.
 */
export default function QuestionImage({ id, version, alt = 'Soru görseli', solution = false, onReady }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [natural, setNatural] = useState(null);
  const [fit, setFit] = useState(() => localStorage.getItem(FIT_KEY) !== '0');
  const [box, setBox] = useState({ w: 0, h: window.innerHeight });
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
    const measure = () => setBox({ w: el.clientWidth, h: window.innerHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  const toggleFit = () => {
    setFit((f) => {
      localStorage.setItem(FIT_KEY, f ? '0' : '1');
      return !f;
    });
  };

  // Sığdır: genişlik ve yükseklik sınırına göre ölçek; ama tam genişliğin %62'sinden küçük olmasın, doğal boyutu aşmasın
  const fitWidth = useMemo(() => {
    if (!fit || !natural || box.w < 600) return undefined;   // dar ekranda (telefon) genişlikle sınırlıdır; yüksekliğe göre küçültme okunabilirliği bozar
    const byWidth = Math.min(box.w / natural.w, 1);
    const offset = window.innerWidth >= 900 ? FIT_OFFSET - 50 : FIT_OFFSET;   // geniş ekranda üst çubuk yok (sol menü)
    const byHeight = Math.max(box.h - offset, 360) / natural.h;
    return Math.round(natural.w * Math.min(byWidth, Math.max(byHeight, MIN_SHARE * byWidth)));
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
      {zoom && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label="Büyütülmüş görsel" onClick={(e) => e.target === e.currentTarget && setZoom(false)}>
          <button type="button" className="icon-btn lightbox-close" aria-label="Kapat" autoFocus>
            ×
          </button>
          <img src={src} alt={alt} />
        </div>
      )}
    </div>
  );
}
