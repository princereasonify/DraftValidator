import { useMemo, useState } from 'react';
import './Modal.css';

/**
 * Enhanced Merge Modal — spec Section 5.1
 * - Select source topic (same segment preferred)
 * - New topic name
 * - Content combination options: A only / B only / Both (for original + modified)
 * - Select which objectives to keep (checkboxes, default: all)
 * - Select which media to keep (checkboxes, default: all)
 */
export default function MergeTopicModal({ data, targetTopic, onCancel, onConfirm }) {
  const [selectedId, setSelectedId] = useState(null);
  const [newName, setNewName] = useState(targetTopic?.topic_name || '');
  const [origMode, setOrigMode] = useState('both'); // 'a' | 'b' | 'both'
  const [modMode, setModMode] = useState('both');
  const [keptObjs, setKeptObjs] = useState(null); // null = not yet computed (lazy)
  const [keptMedia, setKeptMedia] = useState(null);

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
            topic,
            snippet: (topic.modified_chunk || topic.original_chunk || '').slice(0, 100),
          });
        });
      })
    );
    // Same-segment topics first
    list.sort((a, b) => (b.sameSegment ? 1 : 0) - (a.sameSegment ? 1 : 0));
    return list;
  }, [data, targetTopic]);

  const selectedTopic = options.find(o => o.id === selectedId)?.topic;

  // When source changes, reset checkbox selections
  const handleSelect = (id) => {
    setSelectedId(id);
    const src = options.find(o => o.id === id)?.topic;
    if (src) {
      const allObjIds = [
        ...(targetTopic.learning_objectives || []).map(o => o.objective_id),
        ...(src.learning_objectives || []).map(o => o.objective_id),
      ];
      setKeptObjs(new Set(allObjIds));
      const allMediaIds = [
        ...(targetTopic.media_intent || []).map(m => m.media_id),
        ...(src.media_intent || []).map(m => m.media_id),
      ];
      setKeptMedia(new Set(allMediaIds));
    }
  };

  const canSave = selectedId && newName.trim();

  const ContentModeSelect = ({ label, value, onChange }) => (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <div className="type-pills">
        {[['a', 'A only'], ['b', 'B only'], ['both', 'Both (A + B)']].map(([v, l]) => (
          <button key={v} type="button" className={`type-pill${value === v ? ' type-pill--active' : ''}`} onClick={() => onChange(v)}>{l}</button>
        ))}
      </div>
    </div>
  );

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
            <p className="modal__subtitle">Target (A): <strong>{targetTopic?.topic_id}</strong></p>
          </div>
          <button className="modal__close" onClick={onCancel}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="modal__body">
          <p className="modal__hint">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            A = <strong>{targetTopic?.topic_id}</strong> (target). B = source topic to merge in. IDs resequence after merge.
          </p>

          {/* Step 1: Select source topic */}
          <div className="form-group">
            <label className="form-label">Step 1 — Select Source Topic (B)</label>
            {options.length === 0 ? (
              <p className="form-empty">No other topics available.</p>
            ) : (
              <div className="merge-list" style={{ maxHeight: 200 }}>
                {options.map(opt => (
                  <button
                    key={opt.id}
                    className={`merge-option${selectedId === opt.id ? ' merge-option--selected' : ''}${opt.sameSegment ? ' merge-option--same-seg' : ''}`}
                    onClick={() => handleSelect(opt.id)}
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
            <>
              {/* Step 2: Merged topic name */}
              <div className="form-group">
                <label className="form-label">Step 2 — Merged Topic Name</label>
                <input type="text" className="form-input" value={newName} onChange={e => setNewName(e.target.value)} />
              </div>

              {/* Step 3: Content combination */}
              <div className="form-row">
                <ContentModeSelect label="Step 3 — Original Chunk" value={origMode} onChange={setOrigMode} />
                <ContentModeSelect label="Modified Chunk" value={modMode} onChange={setModMode} />
              </div>

              {/* Step 4: Objectives */}
              {(keptObjs !== null) && (() => {
                const allObjs = [
                  ...(targetTopic.learning_objectives || []).map(o => ({ ...o, _src: 'A' })),
                  ...(selectedTopic?.learning_objectives || []).map(o => ({ ...o, _src: 'B' })),
                ];
                return allObjs.length > 0 ? (
                  <div className="form-group">
                    <label className="form-label">Step 4 — Keep Objectives (default: all)</label>
                    <div className="assign-list">
                      {allObjs.map(obj => (
                        <label key={obj.objective_id} className={`assign-check-row${keptObjs.has(obj.objective_id) ? ' assign-check-row--checked' : ''}`}>
                          <input type="checkbox" checked={keptObjs.has(obj.objective_id)} onChange={e => {
                            const s = new Set(keptObjs);
                            e.target.checked ? s.add(obj.objective_id) : s.delete(obj.objective_id);
                            setKeptObjs(s);
                          }} />
                          <span className={`assign-src assign-src--${obj._src.toLowerCase()}`}>{obj._src}</span>
                          <span className="obj-bloom-small">[{obj.bloom_level}]</span>
                          <span>{obj.objective_text?.slice(0, 80)}{obj.objective_text?.length > 80 ? '…' : ''}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}

              {/* Step 5: Media */}
              {(keptMedia !== null) && (() => {
                const allMedia = [
                  ...(targetTopic.media_intent || []).map(m => ({ ...m, _src: 'A' })),
                  ...(selectedTopic?.media_intent || []).map(m => ({ ...m, _src: 'B' })),
                ];
                return allMedia.length > 0 ? (
                  <div className="form-group">
                    <label className="form-label">Step 5 — Keep Media (default: all)</label>
                    <div className="assign-list">
                      {allMedia.map(mi => (
                        <label key={mi.media_id} className={`assign-check-row${keptMedia.has(mi.media_id) ? ' assign-check-row--checked' : ''}`}>
                          <input type="checkbox" checked={keptMedia.has(mi.media_id)} onChange={e => {
                            const s = new Set(keptMedia);
                            e.target.checked ? s.add(mi.media_id) : s.delete(mi.media_id);
                            setKeptMedia(s);
                          }} />
                          <span className={`assign-src assign-src--${mi._src.toLowerCase()}`}>{mi._src}</span>
                          <span className={`media-badge media-badge--${mi.type}`}>{mi.type?.replace('_', ' ')}</span>
                          <span>{mi.title?.slice(0, 70)}{mi.title?.length > 70 ? '…' : ''}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}
            </>
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
              origMode,
              modMode,
              keptObjIds: keptObjs ? [...keptObjs] : null,
              keptMediaIds: keptMedia ? [...keptMedia] : null,
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
