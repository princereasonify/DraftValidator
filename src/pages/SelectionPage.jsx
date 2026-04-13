import { useEffect, useState, useCallback } from 'react';
import { getSchoolProfiles, getSchoolClasses, getSchoolClassSubjectMap, getChapters } from '../api';
import './SelectionPage.css';

function unique(arr) {
  return [...new Set(arr)].filter(Boolean).sort();
}

export default function SelectionPage({ user, onOpen, onLogout }) {
  /* ── School / Classes ─── */
  const [schools, setSchools] = useState([]);
  const [schoolId, setSchoolId] = useState('');
  const [classes, setClasses] = useState([]);

  /* ── Derived dropdowns ── */
  const [board, setBoard] = useState('');
  const [medium, setMedium] = useState('');
  const [standard, setStandard] = useState('');

  /* ── Subject ─────────── */
  const [subjects, setSubjects] = useState([]);
  const [subject, setSubject] = useState('');

  /* ── Chapter ─────────── */
  const [chapters, setChapters] = useState([]);
  const [chapterId, setChapterId] = useState('');

  /* ── UI state ─────────── */
  const [loadingSchools, setLoadingSchools] = useState(true);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState('');

  /* ── Step 1: load schools ─────────────────────────── */
  useEffect(() => {
    setLoadingSchools(true);
    getSchoolProfiles()
      .then(list => {
        setSchools(list);
        if (list.length === 1) setSchoolId(String(list[0].schoolId));
      })
      .catch(err => setError(err.message))
      .finally(() => setLoadingSchools(false));
  }, []);

  /* ── Step 2: load classes when school selected ────── */
  useEffect(() => {
    if (!schoolId) { setClasses([]); setBoard(''); return; }
    getSchoolClasses(schoolId)
      .then(setClasses)
      .catch(err => setError(err.message));
  }, [schoolId]);

  /* ── Reset cascade on upstream change ────────────── */
  useEffect(() => { setMedium(''); }, [board]);
  useEffect(() => { setStandard(''); }, [medium]);
  useEffect(() => { setSubjects([]); setSubject(''); }, [standard]);
  useEffect(() => { setChapters([]); setChapterId(''); }, [subject]);

  /* ── Derived options ─────────────────────────────── */
  const boards = unique(classes.map(c => c.boardName));
  const mediums = unique(classes.filter(c => c.boardName === board).map(c => c.languageName));
  const standards = unique(
    classes.filter(c => c.boardName === board && c.languageName === medium).map(c => c.gradeName)
  );

  /* ── Step 3: load subjects when standard selected ── */
  useEffect(() => {
    if (!board || !medium || !standard) return;
    const matchedClass = classes.find(
      c => c.boardName === board && c.languageName === medium && c.gradeName === standard
    );
    if (!matchedClass) return;
    let cancelled = false;
    setLoadingSubjects(true);
    setSubjects([]);
    getSchoolClassSubjectMap(matchedClass.schoolClassId, schoolId)
      .then(maps => { if (!cancelled) setSubjects(Array.isArray(maps) ? maps : []); })
      .catch(err => { if (!cancelled) setError(err.message || 'Failed to load subjects'); })
      .finally(() => { if (!cancelled) setLoadingSubjects(false); });
    return () => { cancelled = true; };
  }, [board, medium, standard, classes, schoolId]);

  /* ── Step 4: load chapters when subject selected ─── */
  useEffect(() => {
    if (!subject) return;
    const subjectObj = subjects.find(s => s.subjectName === subject);
    const classObj = classes.find(
      c => c.boardName === board && c.languageName === medium && c.gradeName === standard
    );
    if (!subjectObj || !classObj) return;
    let cancelled = false;
    setLoadingChapters(true);
    setChapters([]);
    getChapters(subjectObj.subjectId, classObj.gradeId)
      .then(data => { if (!cancelled) setChapters(Array.isArray(data) ? data : []); })
      .catch(err => { if (!cancelled) setError(err.message || 'Failed to load chapters'); })
      .finally(() => { if (!cancelled) setLoadingChapters(false); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject]);

  /* ── Open ─────────────────────────────────────────── */
  const handleOpen = useCallback(() => {
    const chapter = chapters.find(c => String(c.id) === String(chapterId));
    if (!chapter) return;
    setOpening(true);
    onOpen({
      planData: chapter.planJson ?? null,
      meta: {
        subject,
        grade: standard,
        chapter: chapter.name,
        board,
        medium,
      },
    });
  }, [chapters, chapterId, subject, standard, board, medium, onOpen]);

  const initials = user?.firstName
    ? (user.firstName[0] + (user.lastName?.[0] || '')).toUpperCase()
    : (user?.email?.[0] || 'U').toUpperCase();

  return (
    <div className="sel-page">
      {/* Header */}
      <header className="sel-header">
        <div className="sel-header__brand">
          <span className="sel-header__icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
          </span>
          <span className="sel-header__title">Draft Validator</span>
        </div>
        <div className="sel-header__user">
          <div className="sel-avatar">{initials}</div>
          <div className="sel-user-info">
            <span className="sel-user-name">{user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user?.email}</span>
            <span className="sel-user-role">{user?.role}</span>
          </div>
          <button className="sel-logout" onClick={onLogout} title="Sign out">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="sel-body">
        <div className="sel-card">
          <div className="sel-card__heading">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
            <div>
              <h2 className="sel-card__title">Select Content to Review</h2>
              <p className="sel-card__desc">Choose the board, medium, standard, subject and chapter you want to validate.</p>
            </div>
          </div>

          {error && (
            <div className="sel-error">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {error}
            </div>
          )}

          <div className="sel-fields">
            {/* School — only shown if multiple */}
            {schools.length > 1 && (
              <div className="sel-field">
                <label className="sel-label">School</label>
                <div className="sel-select-wrap">
                  <select
                    className="sel-select"
                    value={schoolId}
                    onChange={e => { setSchoolId(e.target.value); setBoard(''); }}
                    disabled={loadingSchools}
                  >
                    <option value="">— Select school —</option>
                    {schools.map(s => (
                      <option key={s.schoolId} value={s.schoolId}>{s.schoolName}</option>
                    ))}
                  </select>
                  <DropIcon />
                </div>
              </div>
            )}

            {/* Board */}
            <div className="sel-field">
              <label className="sel-label">Board</label>
              <div className="sel-select-wrap">
                <select
                  className="sel-select"
                  value={board}
                  onChange={e => setBoard(e.target.value)}
                  disabled={!schoolId || loadingSchools || boards.length === 0}
                >
                  <option value="">— Select board —</option>
                  {boards.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
                <DropIcon />
              </div>
            </div>

            {/* Medium */}
            <div className="sel-field">
              <label className="sel-label">Medium</label>
              <div className="sel-select-wrap">
                <select
                  className="sel-select"
                  value={medium}
                  onChange={e => setMedium(e.target.value)}
                  disabled={!board || mediums.length === 0}
                >
                  <option value="">— Select medium —</option>
                  {mediums.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <DropIcon />
              </div>
            </div>

            {/* Standard */}
            <div className="sel-field">
              <label className="sel-label">Standard</label>
              <div className="sel-select-wrap">
                <select
                  className="sel-select"
                  value={standard}
                  onChange={e => setStandard(e.target.value)}
                  disabled={!medium || standards.length === 0}
                >
                  <option value="">— Select standard —</option>
                  {standards.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <DropIcon />
              </div>
            </div>

            {/* Subject */}
            <div className="sel-field">
              <label className="sel-label">Subject</label>
              <div className="sel-select-wrap">
                <select
                  className="sel-select"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  disabled={!standard || loadingSubjects || subjects.length === 0}
                >
                  <option value="">
                    {loadingSubjects ? 'Loading…' : '— Select subject —'}
                  </option>
                  {unique(subjects.map(s => s.subjectName)).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                {loadingSubjects ? <Spinner /> : <DropIcon />}
              </div>
            </div>

            {/* Chapter */}
            <div className="sel-field">
              <label className="sel-label">Chapter</label>
              <div className="sel-select-wrap">
                <select
                  className="sel-select"
                  value={chapterId}
                  onChange={e => setChapterId(e.target.value)}
                  disabled={!subject || loadingChapters || chapters.length === 0}
                >
                  <option value="">
                    {loadingChapters ? 'Loading…' : '— Select chapter —'}
                  </option>
                  {chapters.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.topicNumber != null ? `${c.topicNumber}. ${c.name}` : c.name}
                    </option>
                  ))}
                </select>
                {loadingChapters ? <Spinner /> : <DropIcon />}
              </div>
            </div>
          </div>

          <button
            className="sel-open-btn"
            disabled={!chapterId || opening}
            onClick={handleOpen}
          >
            {opening
              ? <><span className="login-spinner" />Opening…</>
              : <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  Open Draft Validator
                </>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

function DropIcon() {
  return (
    <span className="sel-drop-icon" aria-hidden>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
    </span>
  );
}

function Spinner() {
  return <span className="sel-spinner" />;
}
