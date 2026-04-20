import { useCallback, useEffect, useRef, useState } from 'react';
import './PdfViewer.css';

import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

let pdfjsLib = null;
const loadPdfjs = async () => {
  if (pdfjsLib) return pdfjsLib;
  pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;
  return pdfjsLib;
};

export default function PdfViewer({ src, authToken }) {
  const [pdfDoc, setPdfDoc] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(0.9);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState('1');

  const scrollRef = useRef(null);
  const pageRefs = useRef([]);
  const renderingRef = useRef(new Set());

  // Load PDF document
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const lib = await loadPdfjs();
        const loadOpts = { url: src };
        if (authToken) {
          loadOpts.httpHeaders = { Authorization: `Bearer ${authToken}` };
        }
        const doc = await lib.getDocument(loadOpts).promise;
        if (cancelled) return;
        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setCurrentPage(1);
        setPageInput('1');
        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load PDF');
          setLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [src]);

  // Render a single page onto its canvas
  const renderPage = useCallback(async (pageNum) => {
    if (!pdfDoc || renderingRef.current.has(pageNum)) return;
    const canvas = pageRefs.current[pageNum - 1];
    if (!canvas) return;
    if (canvas.dataset.rendered === String(scale)) return;

    renderingRef.current.add(pageNum);
    try {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      const dpr = window.devicePixelRatio || 1;

      canvas.width = viewport.width * dpr;
      canvas.height = viewport.height * dpr;
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;

      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      await page.render({ canvasContext: ctx, viewport }).promise;
      canvas.dataset.rendered = String(scale);
    } catch (err) {
      if (err?.name !== 'RenderingCancelledException') {
        console.error('Render error page', pageNum, err);
      }
    } finally {
      renderingRef.current.delete(pageNum);
    }
  }, [pdfDoc, scale]);

  // Render visible pages on scroll using IntersectionObserver
  useEffect(() => {
    if (!pdfDoc || numPages === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const pageNum = Number(entry.target.dataset.page);
            if (pageNum) renderPage(pageNum);
          }
        });
      },
      { root: scrollRef.current, rootMargin: '200px 0px' }
    );

    pageRefs.current.forEach((canvas) => {
      if (canvas) observer.observe(canvas);
    });

    return () => observer.disconnect();
  }, [pdfDoc, numPages, renderPage]);

  // Re-render all visible pages when scale changes
  useEffect(() => {
    if (!pdfDoc) return;
    pageRefs.current.forEach((canvas) => {
      if (canvas) canvas.dataset.rendered = '';
    });
    for (let i = 1; i <= numPages; i++) {
      renderPage(i);
    }
  }, [scale, pdfDoc, numPages, renderPage]);

  // Track current page on scroll
  useEffect(() => {
    const container = scrollRef.current;
    if (!container || numPages === 0) return;

    const handleScroll = () => {
      const containerTop = container.scrollTop + 60;
      for (let i = pageRefs.current.length - 1; i >= 0; i--) {
        const canvas = pageRefs.current[i];
        if (canvas && canvas.offsetTop <= containerTop) {
          const p = i + 1;
          if (p !== currentPage) {
            setCurrentPage(p);
            setPageInput(String(p));
          }
          break;
        }
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [numPages, currentPage]);

  const goTo = useCallback((n) => {
    const p = Math.max(1, Math.min(numPages, n));
    setCurrentPage(p);
    setPageInput(String(p));
    const canvas = pageRefs.current[p - 1];
    if (canvas) canvas.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [numPages]);

  const handlePageInput = (e) => setPageInput(e.target.value);
  const handlePageInputBlur = () => {
    const n = parseInt(pageInput, 10);
    if (!isNaN(n)) goTo(n);
    else setPageInput(String(currentPage));
  };
  const handlePageInputKey = (e) => {
    if (e.key === 'Enter') e.target.blur();
    if (e.key === 'Escape') setPageInput(String(currentPage));
  };

  const zoomIn = () => setScale(s => Math.min(3, +(s + 0.2).toFixed(1)));
  const zoomOut = () => setScale(s => Math.max(0.5, +(s - 0.2).toFixed(1)));
  const zoomReset = () => setScale(1.2);

  return (
    <div className="pdf-viewer">
      {/* Toolbar */}
      <div className="pdf-toolbar">
        <div className="pdf-toolbar__group">
          <button className="pdf-toolbar__btn" onClick={() => goTo(1)} disabled={currentPage <= 1} title="First page">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/>
            </svg>
          </button>
          <button className="pdf-toolbar__btn" onClick={() => goTo(currentPage - 1)} disabled={currentPage <= 1} title="Previous page">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <div className="pdf-toolbar__page">
            <input
              type="text"
              className="pdf-toolbar__page-input"
              value={pageInput}
              onChange={handlePageInput}
              onBlur={handlePageInputBlur}
              onKeyDown={handlePageInputKey}
              aria-label="Current page"
            />
            <span className="pdf-toolbar__page-sep">/</span>
            <span className="pdf-toolbar__page-total">{numPages || '–'}</span>
          </div>
          <button className="pdf-toolbar__btn" onClick={() => goTo(currentPage + 1)} disabled={!numPages || currentPage >= numPages} title="Next page">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
          <button className="pdf-toolbar__btn" onClick={() => goTo(numPages)} disabled={!numPages || currentPage >= numPages} title="Last page">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/>
            </svg>
          </button>
        </div>

        <div className="pdf-toolbar__sep" />

        <div className="pdf-toolbar__group">
          <button className="pdf-toolbar__btn" onClick={zoomOut} disabled={scale <= 0.5} title="Zoom out">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/>
            </svg>
          </button>
          <button className="pdf-toolbar__zoom-label" onClick={zoomReset} title="Reset zoom">
            {Math.round(scale * 100)}%
          </button>
          <button className="pdf-toolbar__btn" onClick={zoomIn} disabled={scale >= 3} title="Zoom in">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Scrollable canvas area with all pages */}
      <div ref={scrollRef} className="pdf-canvas-area">
        {loading && (
          <div className="pdf-state pdf-state--loading">
            <div className="pdf-spinner" />
            <p>Loading PDF…</p>
          </div>
        )}
        {error && (
          <div className="pdf-state pdf-state--error">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <p>Failed to load PDF</p>
            <span>{error}</span>
          </div>
        )}
        {!loading && !error && Array.from({ length: numPages }, (_, i) => (
          <div className="pdf-canvas-wrapper" key={i}>
            <canvas
              ref={el => { pageRefs.current[i] = el; }}
              data-page={i + 1}
              className="pdf-canvas"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
