import { useEffect, useRef, useState } from 'react';
import * as pdfjs from 'pdfjs-dist/build/pdf.mjs';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import PageInk from './PageInk.jsx';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export default function AnnotatedPdf({ id, fileUrl, page, onPageChange }) {
  const surface = useRef(null);
  const canvas = useRef(null);
  const [pdf, setPdf] = useState(null);
  const [error, setError] = useState('');
  const [rendered, setRendered] = useState(false);
  const [pageInput, setPageInput] = useState(String(page));
  useEffect(() => { setPageInput(String(page)); }, [page]);
  useEffect(() => {
    let alive = true;
    const task = pdfjs.getDocument({ url: fileUrl, withCredentials: true });
    task.promise.then((document) => { if (alive) setPdf(document); else document.destroy(); })
      .catch((e) => { if (alive) setError(`PDF açılamadı: ${e.message}`); });
    return () => { alive = false; task.destroy(); };
  }, [fileUrl]);
  useEffect(() => {
    if (!pdf || !canvas.current || !surface.current) return undefined;
    let cancelled = false;
    let renderTask;
    let observer;
    const draw = async () => {
      if (renderTask) { renderTask.cancel(); try { await renderTask.promise; } catch { /* cancelled */ } }
      if (cancelled) return;
      setRendered(false);
      try {
        const pdfPage = await pdf.getPage(page);
        if (cancelled) return;
        const native = pdfPage.getViewport({ scale: 1 });
        const width = surface.current.clientWidth;
        if (!width) return;
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        const view = pdfPage.getViewport({ scale: width / native.width * ratio });
        const target = canvas.current;
        target.width = Math.round(view.width);
        target.height = Math.round(view.height);
        target.style.height = `${view.height / ratio}px`;
        renderTask = pdfPage.render({ canvasContext: target.getContext('2d'), viewport: view });
        await renderTask.promise;
        if (!cancelled) setRendered(true);
      } catch (e) { if (!cancelled && e.name !== 'RenderingCancelledException') setError(`Sayfa gösterilemedi: ${e.message}`); }
    };
    observer = new ResizeObserver(() => draw());
    observer.observe(surface.current);
    draw();
    return () => { cancelled = true; observer.disconnect(); renderTask?.cancel(); };
  }, [pdf, page]);
  const max = pdf?.numPages || 1;
  const change = (next) => {
    const value = Number(next);
    if (Number.isInteger(value) && value >= 1 && value <= max) onPageChange(value);
    else setPageInput(String(page));
  };
  return <>
    <div className="pdf-page-nav" aria-label="PDF sayfa gezintisi">
      <button type="button" className="btn btn-secondary" disabled={!pdf || page <= 1} onClick={() => onPageChange(page - 1)}>‹ Önceki sayfa</button>
      <label>Sayfa <input aria-label="PDF sayfa numarası" type="number" min="1" max={max} value={pageInput}
        onChange={(e) => setPageInput(e.target.value)} onBlur={() => change(pageInput)}
        onKeyDown={(e) => { if (e.key === 'Enter') change(pageInput); }} /> / {pdf?.numPages || '…'}</label>
      <button type="button" className="btn btn-secondary" disabled={!pdf || page >= max} onClick={() => onPageChange(page + 1)}>Sonraki sayfa ›</button>
    </div>
    {error && <p role="alert" className="text-danger">{error}</p>}
    {!pdf && !error && <p role="status">PDF yükleniyor…</p>}
    <div ref={surface} className="pdf-page-surface">
      <canvas ref={canvas} aria-label={`PDF ${page}. sayfa`} />
      {rendered && <PageInk key={`${id}:${page}`} type="PDF" id={id} page={page} />}
    </div>
  </>;
}
