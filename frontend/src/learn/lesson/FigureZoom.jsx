import { useRef } from 'react';

export default function FigureZoom({ children, label = 'Görseli büyüt' }) {
  const dialog = useRef(null);
  return <>
    <button type="button" className="lr-link lm-zoom-button" onClick={() => dialog.current?.showModal()}>{label} ↗</button>
    <dialog className="lm-zoom" ref={dialog} aria-label="Büyütülmüş ders görseli">
      <header><strong>Görseli yakından incele</strong><button type="button" className="btn btn-secondary" autoFocus onClick={() => dialog.current?.close()}>Kapat</button></header>
      <p className="small muted">Dar ekranda görseli yatay kaydırabilirsin. Escape tuşuyla da kapatabilirsin.</p>
      <div className="lm-zoom-scroll" tabIndex={0} role="region" aria-label="Kaydırılabilir büyük görsel">{children}</div>
    </dialog>
  </>;
}
