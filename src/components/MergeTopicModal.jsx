import { useMemo, useState } from 'react';
import './Modal.css';

/**
 * Simplified Merge Modal
 * - Pick one source topic to merge into the target.
 * - All content merges: original + modified chunks concatenated, all objectives
 *   and media combined. Merged topic keeps the target's name by default
 *   (editable). Topic IDs renumber after save.
 */
export default function MergeTopicModal({ data, targetTopic, onCancel, onConfirm }) {
  const [selectedId, setSelectedId] = useState(null);
  const [newName, setNewName] = useState(targetTopic?.topic_name || '');

  const options = useMemo(() => {
    if (!data?.modules) return [];
    const list = [];
    data.modules.forEach(mod =>
      (mod.segments || []).forEach(seg => {
        const inSameSegment = (seg.topics || []).some(t => t.topic_id === targetTopic?.topic_id);
        (seg.topics || []).forEach(topic => {
          if (topic.topic_id === targetTopic?.topic_id) return;
          list.push({
            id: topic.topic_id,
            name: topic.topic_name,
            type: topic.topic_type,
            moduleName: mod.module_name,
            segmentName: seg.segment_name,
            sameSegment: inSameSegment,
            snippet: (topic.modified_chunk || topic.original_chunk || '').slice(0, 100),
          });
        });
      })
    );
    list.sort((a, b) => (b.sameSegment ? 1 : 0) - (a.sameSegment ? 1 : 0));
    return list;
  }, [data, targetTopic]);

  const canSave = !!selectedId && !!newName.trim();

  return (
    <div className="modal-backdrop" onClick={onCancel} role="dialog" aria-modal="true">
      <div className="modal modal--xl" onClick={e => e.stopPropagation()}>
        <div className="modal__header">
          <div className="modal__header-icon modal__header-icon--merge">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="15" x2="12" y2="9"/><line x1="6" y1="15" x2="12" y2="9"/><line x1="12" y1="9" x2="12" y2="21"/>
            </svg>
          </div>
          <div>
            <h3 className="modal__title">Merge Topics</h3>
            <p className="modal__subtitle">Target: <strong>{targetTopic?.topic_id}</strong> — {targetTopic?.topic_name}</p>
          </div>
          <button className="modal__close" onClick={onCancel}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="modal__body">
          <p className="modal__hint">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            Select the topic to merge into <strong>{targetTopic?.topic_id}</strong>. All its content — chunks, objectives, and media — will be combined. Topic IDs resequence after merge.
          </p>

          <div className="form-group">
            <label className="form-label">Select topic to merge</label>
            {options.length === 0 ? (
              <p className="form-empty">No other topics available.</p>
            ) : (
              <div className="merge-list" style={{ maxHeight: 320 }}>
                {options.map(opt => (
                  <button
                    key={opt.id}
                    className={`merge-option${selectedId === opt.id ? ' merge-option--selected' : ''}${opt.sameSegment ? ' merge-option--same-seg' : ''}`}
                    onClick={() => setSelectedId(opt.id)}
                  >
                    <div className="merge-option__header">
                      <span className="merge-option__id">{opt.id}</span>
                      <span className={`topic-type-badge topic-type-badge--${opt.type?.toLowerCase()}`}>{opt.type}</span>
                      {opt.sameSegment && <span className="merge-same-seg-badge">Same segment</span>}
                      <span className="merge-option__location">{opt.moduleName} › {opt.segmentName}</span>
                    </div>
                    <p className="merge-option__name">{opt.name}</p>
                    <p className="merge-option__snippet">{opt.snippet}{opt.snippet.length >= 100 ? '…' : ''}</p>
                    {selectedId === opt.id && (
                      <div className="merge-option__check">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedId && (
            <div className="form-group">
              <label className="form-label">Merged topic name</label>
              <input type="text" className="form-input" value={newName} onChange={e => setNewName(e.target.value)} />
            </div>
          )}
        </div>

        <div className="modal__footer">
          <button className="btn btn--ghost" onClick={onCancel}>Cancel</button>
          <button
            className="btn btn--primary"
            disabled={!canSave}
            onClick={() => onConfirm({
              sourceId: selectedId,
              newName: newName.trim(),
              origMode: 'both',
              modMode: 'both',
              keptObjIds: null,
              keptMediaIds: null,
            })}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="15" x2="12" y2="9"/><line x1="6" y1="15" x2="12" y2="9"/><line x1="12" y1="9" x2="12" y2="21"/></svg>
            Merge Topics
          </button>
        </div>
      </div>
    </div>
  );
}
