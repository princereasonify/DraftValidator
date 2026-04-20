import { useCallback, useEffect, useRef, useState } from 'react';
import PdfViewer from './components/PdfViewer';
import DraftPlanView from './components/DraftPlanView';
import LoginPage from './pages/LoginPage';
import SelectionPage from './pages/SelectionPage';
import FeedbackResolverPage from './pages/FeedbackResolverPage';
import { getTextbookPdfUrl, getAuthToken, getLearningPlanChapter, getDraftedLearningPlanChapter, apiLogout } from './api';
import HelpModal from './components/HelpModal';
import './App.css';

const MIN_PCT = 20;
const MAX_PCT = 80;

function isEducator(role) {
  if (!role) return false;
  const r = role.toLowerCase();
  return r.includes('educator');
}

function isFeedbackResolver(role) {
  if (!role) return false;
  const r = role.toLowerCase();
  return r.includes('resolver') || r.includes('feedback');
}

export default function App() {
  /* ── Auth / routing ────────────────────────────────── */
  const [view, setView] = useState('login'); // 'login' | 'selection' | 'main'
  const [user, setUser] = useState(null);
  const [planMeta, setPlanMeta] = useState(null);   // { subject, grade, chapter, board, medium }
  const [planData, setPlanData] = useState(null);
  const [planVersion, setPlanVersion] = useState(null);
  const [planApproved, setPlanApproved] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  /* Restore session on mount */
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('user') || 'null');
      if (saved?.accessToken) {
        setUser(saved);
        if (isFeedbackResolver(saved.role)) {
          setView('resolver');
        } else if (isEducator(saved.role)) {
          setView('selection');
        } else {
          // Other roles: skip straight to main with default data
          setView('main');
        }
      }
    } catch { /* ignore */ }
  }, []);

  const handleLogin = useCallback((userData) => {
    setUser(userData);
    if (isFeedbackResolver(userData.role)) {
      setView('resolver');
    } else if (isEducator(userData.role)) {
      setView('selection');
    } else {
      setView('main');
    }
  }, []);

  const [loadingPlan, setLoadingPlan] = useState(false);

  const handleOpen = useCallback(async ({ planData: pd, meta }) => {
    setPlanMeta(meta);

    if (pd) {
      setPlanData(pd);
      setPlanVersion(null);
      setView('main');
      return;
    }

    // Fetch drafted plan first, fallback to learning plan
    if (meta?.chapterId) {
      setLoadingPlan(true);
      try {
        const opts = meta.schoolId ? { schoolId: meta.schoolId } : {};

        // Try drafted plan first
        const drafted = await getDraftedLearningPlanChapter(meta.chapterId, opts);
        if (drafted?.plan?.draftedPlanJson) {
          const raw = drafted.plan.draftedPlanJson;
          const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
          setPlanData(parsed);
          setPlanVersion(drafted.plan.version ?? null);
          setPlanApproved(drafted.plan.isDraft === false);
          setView('main');
          return;
        }

        // Fallback to learning plan (master / version 0)
        const lp = await getLearningPlanChapter(meta.chapterId, opts);
        if (lp?.plan?.planJson) {
          const parsed = typeof lp.plan.planJson === 'string' ? JSON.parse(lp.plan.planJson) : lp.plan.planJson;
          setPlanData(parsed);
          setPlanVersion(lp.plan.version ?? null);
          setPlanApproved(false);
        } else {
          setPlanData(null);
          setPlanVersion(null);
          setPlanApproved(false);
        }
      } catch {
        setPlanData(null);
        setPlanVersion(null);
      } finally {
        setLoadingPlan(false);
      }
    } else {
      setPlanData(null);
      setPlanVersion(null);
    }

    setView('main');
  }, []);

  const handleLogout = useCallback(async () => {
    try { await apiLogout(); } catch { /* proceed with local logout regardless */ }
    localStorage.removeItem('user');
    setUser(null);
    setPlanData(null);
    setPlanVersion(null);
    setPlanApproved(false);
    setPlanMeta(null);
    setView('login');
  }, []);

  const handleSaved = useCallback((newVersion) => {
    if (typeof newVersion === 'number') setPlanVersion(newVersion);
  }, []);

  const handleBackToSelection = useCallback(() => {
    setView('selection');
  }, []);

  /* ── Mobile panel tab ──────────────────────────────── */
  const [activePanel, setActivePanel] = useState('plan');

  /* ── Split-pane resize ─────────────────────────────── */
  const [splitPct, setSplitPct] = useState(35);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef(null);
  const startXRef = useRef(null);
  const startPctRef = useRef(null);

  const startResize = useCallback((clientX) => {
    setIsResizing(true);
    startXRef.current = clientX;
    startPctRef.current = splitPct;
  }, [splitPct]);

  const onResizerDown = useCallback((e) => {
    e.preventDefault();
    startResize(e.clientX);
  }, [startResize]);

  const onResizerTouch = useCallback((e) => {
    e.preventDefault();
    startResize(e.touches[0].clientX);
  }, [startResize]);

  useEffect(() => {
    const onMove = (clientX) => {
      if (!isResizing || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const delta = ((clientX - startXRef.current) / rect.width) * 100;
      const next = Math.max(MIN_PCT, Math.min(MAX_PCT, startPctRef.current + delta));
      setSplitPct(next);
    };
    const onMouseMove = (e) => onMove(e.clientX);
    const onTouchMove = (e) => onMove(e.touches[0].clientX);
    const onUp = () => setIsResizing(false);

    if (isResizing) {
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onUp);
      document.addEventListener('touchmove', onTouchMove, { passive: false });
      document.addEventListener('touchend', onUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  /* ── Non-main views ────────────────────────────────── */
  if (view === 'login') return <LoginPage onLogin={handleLogin} />;
  if (view === 'resolver') return (
    <FeedbackResolverPage user={user} onLogout={handleLogout} />
  );
  if (view === 'selection') return (
    <SelectionPage user={user} onOpen={handleOpen} onLogout={handleLogout} />
  );

  /* ── Main validator view ────────────────────────────── */
  const subjectLabel = planMeta?.subject || 'Science';
  const gradeLabel   = planMeta?.grade   || '7';
  const chapterLabel = planMeta?.chapter || 'Chapter 1';

  return (
    <div className="app">
      {/* ── Header ───────────────── */}
      <header className="app-header">
        <button className="app-header__back-btn app-header__back-btn--left" onClick={handleBackToSelection} title="Back to selection">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          Back
        </button>
        <div className="app-header__brand">
          <span className="app-header__logo">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
          </span>
          <span className="app-header__title">Draft Validator</span>
          <span className="app-header__divider" />
          <span className="app-header__sub">{subjectLabel} · Grade {gradeLabel} · {chapterLabel}</span>
        </div>
        <div className="app-header__actions">
          <span className={`app-header__badge ${planApproved ? 'app-header__badge--approved' : 'app-header__badge--draft'}`}>
            {planApproved
              ? (planVersion != null ? `Approved v${planVersion}` : 'Approved')
              : (planVersion != null ? `Draft v${planVersion}` : 'Draft')}
          </span>
          <span className="app-header__badge app-header__badge--stage">Review Stage</span>
          <button className="app-header__back-btn" onClick={() => setShowHelp(true)} title="User manual">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            Help
          </button>
          <button className="app-header__back-btn app-header__back-btn--logout" onClick={handleLogout} title="Sign out">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        </div>
      </header>

      {/* ── Panel Labels / Mobile Tabs ─────────── */}
      <div className="app-panel-labels">
        <div
          className={`app-panel-label${activePanel === 'pdf' ? ' app-panel-label--active' : ''}`}
          style={{ width: `${splitPct}%` }}
          onClick={() => setActivePanel('pdf')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          Textbook PDF
        </div>
        <div
          className={`app-panel-label${activePanel === 'plan' ? ' app-panel-label--active' : ''}`}
          style={{ width: `${100 - splitPct}%` }}
          onClick={() => setActivePanel('plan')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          Drafted Learning Plan
        </div>
      </div>

      {/* ── Main Panels ──────────── */}
      <div
        ref={containerRef}
        className={`app-main${isResizing ? ' app-main--resizing' : ''}`}
      >
        {/* PDF Panel */}
        <div
          className={`app-panel app-panel--pdf${activePanel !== 'pdf' ? ' app-panel--mobile-hidden' : ''}`}
          style={{ width: `${splitPct}%` }}
        >
          <PdfViewer
            src={planMeta?.pdfUrl ? getTextbookPdfUrl(planMeta.pdfUrl) : '/textbook.pdf'}
            authToken={getAuthToken()}
          />
        </div>

        {/* Resizer */}
        <div
          className={`app-resizer${isResizing ? ' app-resizer--active' : ''}`}
          onMouseDown={onResizerDown}
          onTouchStart={onResizerTouch}
          title="Drag to resize"
        >
          <div className="app-resizer__dots">
            <span /><span /><span /><span /><span /><span />
          </div>
        </div>

        {/* Draft Plan Panel */}
        <div
          className={`app-panel app-panel--plan${activePanel !== 'plan' ? ' app-panel--mobile-hidden' : ''}`}
          style={{ width: `${100 - splitPct}%` }}
        >
          <DraftPlanView
            initialData={planData}
            chapterId={planMeta?.chapterId}
            schoolId={planMeta?.schoolId}
            canSave={isEducator(user?.role) && !planApproved}
            onSaved={handleSaved}
          />
        </div>
      </div>

      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </div>
  );
}
