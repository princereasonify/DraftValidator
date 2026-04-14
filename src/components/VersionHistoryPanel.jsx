import './Modal.css';

export default function VersionHistoryPanel({ versions, onRollback, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal modal--lg" onClick={e => e.stopPropagation()}>
        <div className="modal__header">
          <div className="modal__header-icon modal__header-icon--edit">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div>
            <h3 className="modal__title">Version History</h3>
            <p className="modal__subtitle">{versions.length} snapshot{versions.length !== 1 ? 's' : ''}</p>
          </div>
          <button className="modal__close" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="modal__body">
          {versions.length === 0 && (
            <div className="dv-no-results" style={{ padding: '24px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <p>No versions saved yet. Structural operations automatically create snapshots.</p>
            </div>
          )}

          <div className="version-list">
            {[...versions].reverse().map((v, i) => (
              <div key={v.version} className={`version-item${i === 0 ? ' version-item--current' : ''}`}>
                <div className="version-item__left">
                  <div className="version-item__num">v{v.version}</div>
                  <div className="version-item__info">
                    <p className="version-item__summary">{v.summary}</p>
                    <p className="version-item__time">{new Date(v.timestamp).toLocaleString()}</p>
                    <div className="version-item__stats">
                      <span>{v.stats?.modules || 0}M</span>
                      <span>{v.stats?.segments || 0}S</span>
                      <span>{v.stats?.topics || 0}T</span>
                    </div>
                  </div>
                </div>
                <div className="version-item__right">
                  {i === 0
                    ? <span className="version-current-badge">Current</span>
                    : (
                      <button
                        className="btn btn--ghost"
                        style={{ fontSize: '.72rem', padding: '5px 10px' }}
                        onClick={() => {
                          if (window.confirm(`Restore version ${v.version}? "${v.summary}"\n\nThis will replace the current plan.`)) {
                            onRollback(v);
                          }
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.95"/></svg>
                        Restore
                      </button>
                    )
                  }
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="modal__footer">
          <button className="btn btn--ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
