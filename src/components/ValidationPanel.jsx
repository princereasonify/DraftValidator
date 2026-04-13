import './Modal.css';

const SEV_COLORS = {
  error:   { bg: '#FEE2E2', text: '#991B1B', dot: '#EF4444' },
  warning: { bg: '#FEF3C7', text: '#92400E', dot: '#F59E0B' },
};

function StatBar({ label, value, total }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="stat-bar">
      <div className="stat-bar__label">
        <span>{label}</span>
        <span className="stat-bar__val">{value}</span>
      </div>
      <div className="stat-bar__track">
        <div className="stat-bar__fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function ValidationPanel({ result, onClose, onRevalidate, isLoading }) {
  if (!result && !isLoading) return null;

  const passed = result?.passed;
  const errCount = result?.error_count || 0;
  const warnCount = result?.warning_count || 0;
  const stats = result?.stats || {};

  const totalTopics = stats.topics || 0;
  const bloomTotal = Object.values(stats.bloom_distribution || {}).reduce((a, v) => a + v, 0);
  const mediaTotal = Object.values(stats.media_type_distribution || {}).reduce((a, v) => a + v, 0);

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal modal--xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal__header">
          <div className={`modal__header-icon ${passed ? 'modal__header-icon--edit' : 'modal__header-icon--delete'}`}>
            {passed
              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            }
          </div>
          <div style={{ flex: 1 }}>
            <h3 className="modal__title">Validation Results</h3>
            <p className="modal__subtitle">
              {isLoading ? 'Running…' : passed
                ? `Passed — ${warnCount} warning${warnCount !== 1 ? 's' : ''}`
                : `${errCount} error${errCount !== 1 ? 's' : ''}, ${warnCount} warning${warnCount !== 1 ? 's' : ''}`
              }
            </p>
          </div>
          <button className="btn btn--ghost" onClick={onRevalidate} style={{ marginRight: 8 }} disabled={isLoading}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            Re-validate
          </button>
          <button className="modal__close" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="modal__body">
          {isLoading && (
            <div className="pdf-state"><div className="pdf-spinner" /><p>Validating…</p></div>
          )}

          {result && (
            <>
              {/* Summary cards */}
              <div className="val-summary">
                <div className={`val-summary-card val-summary-card--${passed ? 'pass' : 'fail'}`}>
                  <div className="val-summary-card__icon">
                    {passed
                      ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                      : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    }
                  </div>
                  <div className="val-summary-card__body">
                    <span className="val-summary-card__val">{errCount}</span>
                    <span className="val-summary-card__lbl">Errors</span>
                  </div>
                </div>
                <div className="val-summary-card val-summary-card--warn">
                  <div className="val-summary-card__icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  </div>
                  <div className="val-summary-card__body">
                    <span className="val-summary-card__val">{warnCount}</span>
                    <span className="val-summary-card__lbl">Warnings</span>
                  </div>
                </div>
                <div className="val-summary-card val-summary-card--info">
                  <div className="val-summary-card__body">
                    <span className="val-summary-card__val">{stats.modules || 0}</span>
                    <span className="val-summary-card__lbl">Modules</span>
                  </div>
                </div>
                <div className="val-summary-card val-summary-card--info">
                  <div className="val-summary-card__body">
                    <span className="val-summary-card__val">{stats.topics || 0}</span>
                    <span className="val-summary-card__lbl">Topics</span>
                  </div>
                </div>
                <div className="val-summary-card val-summary-card--info">
                  <div className="val-summary-card__body">
                    <span className="val-summary-card__val">{stats.objectives || 0}</span>
                    <span className="val-summary-card__lbl">Objectives</span>
                  </div>
                </div>
                <div className="val-summary-card val-summary-card--info">
                  <div className="val-summary-card__body">
                    <span className="val-summary-card__val">{stats.media_items || 0}</span>
                    <span className="val-summary-card__lbl">Media</span>
                  </div>
                </div>
              </div>

              {/* Errors & Warnings list */}
              {(result.errors.length > 0 || result.warnings.length > 0) && (
                <div className="val-issues">
                  {[...result.errors, ...result.warnings].map((issue, i) => (
                    <div key={i} className={`val-issue val-issue--${issue.severity}`}>
                      <div className="val-issue__dot" style={{ background: SEV_COLORS[issue.severity]?.dot }} />
                      <div className="val-issue__body">
                        <div className="val-issue__path">
                          <code>{issue.path}</code>
                          {issue.field && <span>→ <strong>{issue.field}</strong></span>}
                        </div>
                        <p className="val-issue__msg">{issue.message}</p>
                      </div>
                      <span className={`val-issue__badge val-issue__badge--${issue.severity}`}>
                        {issue.severity}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Distribution stats */}
              {totalTopics > 0 && (
                <div className="val-distributions">
                  <div className="val-dist">
                    <div className="val-dist__title">Topic Types</div>
                    {Object.entries(stats.topic_type_distribution || {}).map(([k, v]) => (
                      <StatBar key={k} label={k} value={v} total={totalTopics} />
                    ))}
                  </div>
                  <div className="val-dist">
                    <div className="val-dist__title">Bloom's Levels</div>
                    {Object.entries(stats.bloom_distribution || {}).map(([k, v]) => (
                      <StatBar key={k} label={k} value={v} total={bloomTotal} />
                    ))}
                  </div>
                  <div className="val-dist">
                    <div className="val-dist__title">Media Types</div>
                    {Object.entries(stats.media_type_distribution || {}).map(([k, v]) => (
                      <StatBar key={k} label={k.replace('_', ' ')} value={v} total={mediaTotal} />
                    ))}
                  </div>
                </div>
              )}

              {passed && result.errors.length === 0 && result.warnings.length === 0 && (
                <div className="val-pass-msg">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="20 6 9 17 4 12"/></svg>
                  <p>All validation checks passed!</p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="modal__footer">
          <button className="btn btn--ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
