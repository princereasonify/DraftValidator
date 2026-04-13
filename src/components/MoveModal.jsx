import { useMemo, useState } from 'react';
import './Modal.css';

/**
 * Move a topic to a different segment, or a segment to a different module.
 * mode: 'topic' | 'segment'
 */
export default function MoveModal({ mode, data, item, onCancel, onConfirm }) {
  const [destId, setDestId] = useState('');
  const [position, setPosition] = useState('end'); // 'start' | 'end'

  const isTopic = mode === 'topic';

  // Build destination options
  const destinations = useMemo(() => {
    if (isTopic) {
      // All segments except the one the topic is currently in
      const currentSegId = (() => {
        for (const m of data.modules || []) {
          for (const s of m.segments || []) {
            if ((s.topics || []).some(t => t.topic_id === item.topic_id)) return s.segment_id;
          }
        }
        return null;
      })();
      const list = [];
      (data.modules || []).forEach(m =>
        (m.segments || []).forEach(s => {
          if (s.segment_id !== currentSegId) {
            list.push({ id: s.segment_id, label: `${s.segment_id} — ${s.segment_name}`, sub: m.module_name });
          }
        })
      );
      return list;
    } else {
      // All modules except the one the segment is currently in
      const currentModId = (() => {
        for (const m of data.modules || []) {
          if ((m.segments || []).some(s => s.segment_id === item.segment_id)) return m.module_id;
        }
        return null;
      })();
      return (data.modules || [])
        .filter(m => m.module_id !== currentModId)
        .map(m => ({ id: m.module_id, label: `${m.module_id} — ${m.module_name}` }));
    }
  }, [data, item, isTopic]);

  const icon = isTopic ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="5 9 2 12 5 15"/><polyline points="9 5 12 2 15 5"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/></svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="3" width="20" height="4" rx="1"/><rect x="2" y="10" width="20" height="4" rx="1"/><path d="M2 17h8"/><path d="M15 14l5 5-5 5"/></svg>
  );

  return (
    <div className="modal-backdrop" onClick={onCancel} role="dialog" aria-modal="true">
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal__header">
          <div className="modal__header-icon modal__header-icon--split">{icon}</div>
          <div>
            <h3 className="modal__title">Move {isTopic ? 'Topic' : 'Segment'}</h3>
            <p className="modal__subtitle">
              {isTopic
                ? `${item.topic_id} — ${item.topic_name}`
                : `${item.segment_id} — ${item.segment_name}`}
            </p>
          </div>
          <button className="modal__close" onClick={onCancel}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="modal__body">
          <p className="modal__hint">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            Choose destination {isTopic ? 'segment' : 'module'}. IDs will be resequenced automatically.
          </p>

          <div className="form-group">
            <label className="form-label">Destination {isTopic ? 'Segment' : 'Module'}</label>
            {destinations.length === 0 ? (
              <p className="form-empty">No other {isTopic ? 'segments' : 'modules'} available.</p>
            ) : (
              <div className="move-list">
                {destinations.map(d => (
                  <button
                    key={d.id}
                    type="button"
                    className={`move-option${destId === d.id ? ' move-option--selected' : ''}`}
                    onClick={() => setDestId(d.id)}
                  >
                    <code className="move-option__id">{d.id.split('—')[0].trim()}</code>
                    <span className="move-option__label">{d.label.split('—').slice(1).join('—').trim()}</span>
                    {d.sub && <span className="move-option__sub">{d.sub}</span>}
                    {destId === d.id && (
                      <span className="move-option__check">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Insert Position</label>
            <div className="type-pills">
              <button type="button" className={`type-pill${position === 'start' ? ' type-pill--active' : ''}`} onClick={() => setPosition('start')}>At the beginning</button>
              <button type="button" className={`type-pill${position === 'end' ? ' type-pill--active' : ''}`} onClick={() => setPosition('end')}>At the end</button>
            </div>
          </div>
        </div>

        <div className="modal__footer">
          <button className="btn btn--ghost" onClick={onCancel}>Cancel</button>
          <button className="btn btn--primary" disabled={!destId || destinations.length === 0} onClick={() => onConfirm({ destId, position })}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            Move {isTopic ? 'Topic' : 'Segment'}
          </button>
        </div>
      </div>
    </div>
  );
}
