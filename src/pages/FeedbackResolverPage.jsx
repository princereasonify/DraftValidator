import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getSchoolProfiles,
  getSchoolClasses,
  getSchoolClassSubjectMap,
  getChapters,
  getDraftedPlansForChapter,
  approveDraftedPlan,
} from '../api';
import DraftPlanView from '../components/DraftPlanView';
import { mergeForDiff } from '../utils/mergeForDiff';
import './FeedbackResolverPage.css';

function unique(arr) {
  return [...new Set(arr)].filter(Boolean).sort();
}

function creatorLabel(p) {
  const first = p.createdByFirstName || '';
  const last = p.createdByLastName || '';
  const name = `${first} ${last}`.trim();
  return name || (p.createdBy != null ? `User #${p.createdBy}` : 'Unknown');
}

export default function FeedbackResolverPage({ user, onLogout }) {
  /* ── Cascading selection (same as educator) ── */
  const [schools, setSchools] = useState([]);
  const [schoolId, setSchoolId] = useState('');
  const [classes, setClasses] = useState([]);
  const [board, setBoard] = useState('');
  const [medium, setMedium] = useState('');
  const [standard, setStandard] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [subject, setSubject] = useState('');
  const [chapters, setChapters] = useState([]);
  const [chapterId, setChapterId] = useState('');

  /* ── Drafts / teacher / version ── */
  const [drafts, setDrafts] = useState([]);          // all drafts for selected chapter+school
  const [teacherId, setTeacherId] = useState('');    // createdBy
  const [planId, setPlanId] = useState('');          // selected version's plan_id

  /* ── UI ── */
  const [loadingSchools, setLoadingSchools] = useState(true);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [loadingDrafts, setLoadingDrafts] = useState(false);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState(null); // { type, text }

  /* ── Step 1: load schools ── */
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

  /* ── Step 2: load classes ── */
  useEffect(() => {
    if (!schoolId) { setClasses([]); setBoard(''); return; }
    getSchoolClasses(schoolId).then(setClasses).catch(err => setError(err.message));
  }, [schoolId]);

  /* ── Reset cascade ── */
  useEffect(() => { setMedium(''); }, [board]);
  useEffect(() => { setStandard(''); }, [medium]);
  useEffect(() => { setSubjects([]); setSubject(''); }, [standard]);
  useEffect(() => { setChapters([]); setChapterId(''); }, [subject]);
  useEffect(() => { setDrafts([]); setTeacherId(''); setPlanId(''); }, [chapterId]);
  useEffect(() => { setPlanId(''); }, [teacherId]);

  const boards = unique(classes.map(c => c.boardName));
  const mediums = unique(classes.filter(c => c.boardName === board).map(c => c.languageName));
  const standards = unique(classes.filter(c => c.boardName === board && c.languageName === medium).map(c => c.gradeName));

  /* ── Step 3: subjects ── */
  useEffect(() => {
    if (!board || !medium || !standard) return;
    const matched = classes.find(c => c.boardName === board && c.languageName === medium && c.gradeName === standard);
    if (!matched) return;
    let cancelled = false;
    setLoadingSubjects(true);
    setSubjects([]);
    getSchoolClassSubjectMap(matched.schoolClassId, schoolId)
      .then(list => { if (!cancelled) setSubjects(Array.isArray(list) ? list : []); })
      .catch(err => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoadingSubjects(false); });
    return () => { cancelled = true; };
  }, [board, medium, standard, classes, schoolId]);

  /* ── Step 4: chapters ── */
  useEffect(() => {
    if (!subject) return;
    const subjectObj = subjects.find(s => s.subjectName === subject);
    const classObj = classes.find(c => c.boardName === board && c.languageName === medium && c.gradeName === standard);
    if (!subjectObj || !classObj) return;
    let cancelled = false;
    setLoadingChapters(true);
    setChapters([]);
    getChapters({
      schoolId,
      schoolBoardsLanguagesId: classObj.schoolBoardsLanguagesId,
      gradeId: classObj.gradeId,
      subjectId: subjectObj.subjectId,
    })
      .then(data => { if (!cancelled) setChapters(Array.isArray(data) ? data : []); })
      .catch(err => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoadingChapters(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject]);

  /* ── Step 5: drafts for chapter ── */
  useEffect(() => {
    if (!chapterId) return;
    let cancelled = false;
    setLoadingDrafts(true);
    setDrafts([]);
    const opts = schoolId ? { schoolId } : {};
    getDraftedPlansForChapter(chapterId, opts)
      .then(list => { if (!cancelled) setDrafts(Array.isArray(list) ? list : []); })
      .catch(err => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoadingDrafts(false); });
    return () => { cancelled = true; };
  }, [chapterId, schoolId]);

  /* ── Derived: teachers list, versions list, selected plan ── */
  const teachers = useMemo(() => {
    const map = new Map();
    for (const d of drafts) {
      if (d.createdBy == null) continue;
      if (!map.has(d.createdBy)) map.set(d.createdBy, { id: d.createdBy, label: creatorLabel(d) });
    }
    return [...map.values()];
  }, [drafts]);

  const teacherVersions = useMemo(() => {
    if (!teacherId) return [];
    return drafts
      .filter(d => String(d.createdBy) === String(teacherId))
      .sort((a, b) => (a.version || 0) - (b.version || 0));
  }, [drafts, teacherId]);

  const latestVersionPlanId = useMemo(() => {
    if (teacherVersions.length === 0) return null;
    return teacherVersions[teacherVersions.length - 1].planId;
  }, [teacherVersions]);

  const selectedPlan = useMemo(
    () => drafts.find(d => d.planId === planId) || null,
    [drafts, planId]
  );

  const isLatestSelected = planId && planId === latestVersionPlanId;
  const alreadyApproved = !!(selectedPlan && selectedPlan.approvedAt);

  /* ── Approve ── */
  const handleApprove = useCallback(async () => {
    if (!planId || !isLatestSelected) return;
    if (!window.confirm(`Approve version ${selectedPlan?.version} for this teacher?`)) return;
    setApproving(true);
    setMsg(null);
    try {
      const res = await approveDraftedPlan(planId);
      setMsg({ type: 'success', text: `Version ${res?.version ?? ''} approved.` });
      // Update local state so the UI reflects approval
      setDrafts(prev => prev.map(d => d.planId === planId
        ? { ...d, approvedAt: res?.approvedAt ?? new Date().toISOString(), approvedBy: res?.approvedBy, isDraft: false }
        : d
      ));
    } catch (err) {
      setMsg({ type: 'error', text: err?.message || 'Failed to approve.' });
    } finally {
      setApproving(false);
    }
  }, [planId, isLatestSelected, selectedPlan]);

  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 4000);
    return () => clearTimeout(t);
  }, [msg]);

  const initials = user?.firstName
    ? (user.firstName[0] + (user.lastName?.[0] || '')).toUpperCase()
    : (user?.email?.[0] || 'U').toUpperCase();

  const planJson = useMemo(() => {
    if (!selectedPlan) return null;
    const raw = selectedPlan.draftedPlanJson;
    if (!raw) return null;
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  }, [selectedPlan]);

  // Initial (earliest) version by the same teacher — used as the comparison baseline.
  // This gives the resolver a cumulative view of everything that changed from the first
  // draft to the currently selected version, which is more useful than comparing only
  // against the immediately-prior version.
  const initialPlan = useMemo(() => {
    if (!selectedPlan) return null;
    if (teacherVersions.length === 0) return null;
    const earliest = teacherVersions
      .slice()
      .sort((a, b) => (a.version || 0) - (b.version || 0))[0];
    if (!earliest || earliest.planId === selectedPlan.planId) return null;
    return earliest;
  }, [teacherVersions, selectedPlan]);

  const initialPlanJson = useMemo(() => {
    if (!initialPlan) return null;
    const raw = initialPlan.draftedPlanJson;
    if (!raw) return null;
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  }, [initialPlan]);

  // If there's an initial-version baseline, fold the diff annotations into the
  // plan tree so DraftPlanView can render inline highlights. Otherwise, show the
  // plan exactly as-is.
  const planToRender = useMemo(() => {
    if (!planJson) return null;
    if (!initialPlanJson) return planJson;
    return mergeForDiff(initialPlanJson, planJson);
  }, [planJson, initialPlanJson]);

  return (
    <div className="fr-page">
      {/* Header */}
      <header className="fr-header">
        <div className="fr-header__brand">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          <span className="fr-header__title">Draft Validator — Feedback Resolver</span>
        </div>
        <div className="fr-header__user">
          <div className="fr-avatar">{initials}</div>
          <div className="fr-user-info">
            <span className="fr-user-name">{user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user?.email}</span>
            <span className="fr-user-role">{user?.role}</span>
          </div>
          <button className="fr-logout" onClick={onLogout} title="Sign out">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        </div>
      </header>

      {/* Body: 40% selection + 60% plan */}
      <div className="fr-body">
        <aside className="fr-panel fr-panel--selection">
          <div className="fr-panel__heading">
            <h2>Select content to review</h2>
            <p>Pick a chapter, teacher, and version.</p>
          </div>

          {error && <div className="fr-error">{error}</div>}

          <div className="fr-fields">
            {schools.length > 1 && (
              <Field label="School">
                <select value={schoolId} onChange={e => setSchoolId(e.target.value)} disabled={loadingSchools}>
                  <option value="">— Select school —</option>
                  {schools.map(s => <option key={s.schoolId} value={s.schoolId}>{s.schoolName}</option>)}
                </select>
              </Field>
            )}
            <Field label="Board">
              <select value={board} onChange={e => setBoard(e.target.value)} disabled={!schoolId || boards.length === 0}>
                <option value="">— Select board —</option>
                {boards.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </Field>
            <Field label="Medium">
              <select value={medium} onChange={e => setMedium(e.target.value)} disabled={!board || mediums.length === 0}>
                <option value="">— Select medium —</option>
                {mediums.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </Field>
            <Field label="Standard">
              <select value={standard} onChange={e => setStandard(e.target.value)} disabled={!medium || standards.length === 0}>
                <option value="">— Select standard —</option>
                {standards.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Subject">
              <select value={subject} onChange={e => setSubject(e.target.value)} disabled={!standard || loadingSubjects || subjects.length === 0}>
                <option value="">{loadingSubjects ? 'Loading…' : '— Select subject —'}</option>
                {unique(subjects.map(s => s.subjectName)).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Chapter">
              <select value={chapterId} onChange={e => setChapterId(e.target.value)} disabled={!subject || loadingChapters || chapters.length === 0}>
                <option value="">{loadingChapters ? 'Loading…' : '— Select chapter —'}</option>
                {chapters.map(c => <option key={c.id} value={c.id}>{c.topicNumber != null ? `${c.topicNumber}. ${c.name}` : c.name}</option>)}
              </select>
            </Field>
            <Field label="Teacher">
              <select value={teacherId} onChange={e => setTeacherId(e.target.value)} disabled={!chapterId || loadingDrafts || teachers.length === 0}>
                <option value="">
                  {loadingDrafts ? 'Loading…' : (teachers.length === 0 && chapterId ? 'No drafts found' : '— Select teacher —')}
                </option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </Field>
            <Field label="Version">
              <select value={planId} onChange={e => setPlanId(e.target.value)} disabled={!teacherId || teacherVersions.length === 0}>
                <option value="">— Select version —</option>
                {teacherVersions.map(v => (
                  <option key={v.planId} value={v.planId}>
                    v{v.version}{v.approvedAt ? ' · approved' : ''}{v.planId === latestVersionPlanId ? ' · latest' : ''}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {selectedPlan && (
            <div className="fr-approve-box">
              <div className="fr-approve-meta">
                <div><strong>Version:</strong> v{selectedPlan.version}</div>
                <div><strong>Created:</strong> {selectedPlan.createdAt ? new Date(selectedPlan.createdAt).toLocaleString() : '—'}</div>
                {selectedPlan.approvedAt && (
                  <div><strong>Approved:</strong> {new Date(selectedPlan.approvedAt).toLocaleString()}</div>
                )}
              </div>
              {isLatestSelected ? (
                <button
                  className="fr-approve-btn"
                  onClick={handleApprove}
                  disabled={approving || alreadyApproved}
                  title={alreadyApproved ? 'Already approved' : 'Approve this version'}
                >
                  {approving ? 'Approving…' : alreadyApproved ? 'Approved' : 'Approve final version'}
                </button>
              ) : (
                <p className="fr-approve-hint">Approval is only available for the latest version.</p>
              )}
              {msg && (
                <div className={`fr-msg fr-msg--${msg.type}`}>{msg.text}</div>
              )}
            </div>
          )}
        </aside>

        <section className="fr-panel fr-panel--plan">
          {!planToRender ? (
            <div className="fr-empty">
              <p>Select a chapter, teacher and version to preview the drafted plan.</p>
            </div>
          ) : (
            <DraftPlanView key={selectedPlan?.planId} initialData={planToRender} canSave={false} />
          )}
        </section>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="fr-field">
      <label>{label}</label>
      {children}
    </div>
  );
}
