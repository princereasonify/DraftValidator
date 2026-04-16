import { useRef, useState } from 'react';
import './Modal.css';

/**
 * Split Modal
 * - Shows the full ORIGINAL chunk as selectable text.
 * - User clicks inside the text to place the caret, then hits "Split here" —
 *   the split happens at that exact character position (mid-paragraph is fine).
 * - After a split point is set, user ticks objectives to move to Part B.
 *   Media follows its linked objective automatically (image + video + tools).
 * - Modified chunk stays entirely with Part A.
 */
export default function SplitTopicModal({ topic, onCancel, onConfirm }) {
  const origText = topic.original_chunk || '';
  const objectives = topic.learning_objectives || [];
  const media = topic.media_intent || [];

  const textareaRef = useRef(null);
  const [caret, setCaret] = useState(0);
  const [splitPos, setSplitPos] = useState(null); // character offset; null = not yet chosen
  const [nameA, setNameA] = useState(topic.topic_name + ' (Part 1)');
  const [nameB, setNameB] = useState(topic.topic_name + ' (Part 2)');
  const [objIdsForB, setObjIdsForB] = useState(() => new Set());

  const updateCaret = () => {
    const el = textareaRef.current;
    if (el) setCaret(el.selectionStart ?? 0);
  };

  const confirmSplitHere = () => {
    if (caret <= 0 || caret >= origText.length) return;
    setSplitPos(caret);
  };

  const clearSplit = () => setSplitPos(null);

  const canSplit = splitPos !== null && splitPos > 0 && splitPos < origText.length;
  const originalA = canSplit ? origText.slice(0, splitPos).trimEnd() : origText;
  const originalB = canSplit ? origText.slice(splitPos).trimStart() : '';

  const toggleObjForB = (objId) => {
    setObjIdsForB(prev => {
      const next = new Set(prev);
      if (next.has(objId)) next.delete(objId); else next.add(objId);
      return next;
    });
  };

  const objectivesA = objectives.filter(o => !objIdsForB.has(o.objective_id));
  const objectivesB = objectives.filter(o => objIdsForB.has(o.objective_id));
  const mediaA = media.filter(m => !m.linked_objective_id || !objIdsForB.has(m.linked_objective_id));
  const mediaB = media.filter(m => m.linked_objective_id && objIdsForB.has(m.linked_objective_id));

  const handleConfirm = () => {
    if (!canSplit) return;
    onConfirm({
      nameA: nameA.trim() || topic.topic_name + ' (Part 1)',
      nameB: nameB.trim() || topic.topic_name + ' (Part 2)',
      modifiedA: topic.modified_chunk || '',
      modifiedB: '',
      originalA,
      originalB,
      objectivesA,
      objectivesB,
      mediaA,
      mediaB,
    });
  };

  return (
    <div className="modal-backdrop" onClick={onCancel} role="dialog" aria-modal="true">
      <div className="modal modal--xl" onClick={e => e.stopPropagation()}>
        <div className="modal__header">
          <div className="modal__header-icon modal__header-icon--split">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="6" cy="18" r="3"/><circle cx="18" cy="6" r="3"/><line x1="13.51" y1="6.51" x2="6.51" y2="13.51"/>
            </svg>
          </div>
          <div>
            <h3 className="modal__title">Split Topic</h3>
            <p className="modal__subtitle">{topic.topic_id} — {topic.topic_name}</p>
          </div>
          <button className="modal__close" onClick={onCancel}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="modal__body">
          <p className="modal__hint">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            Click anywhere inside the <strong>original chunk</strong> below to place the cursor, then hit <strong>Split here</strong>. You can split mid-paragraph. Modified chunk stays with Part A.
          </p>

          {/* Free-text split area */}
          <div className="form-group">
            <label className="form-label">
              Original chunk
              <span className="form-label__hint"> · cursor at position {caret} of {origText.length}</span>
            </label>
            <textarea
              ref={textareaRef}
              className="chunk-textarea"
              style={{ minHeight: 260 }}
              value={origText}
              readOnly
              onClick={updateCaret}
              onKeyUp={updateCaret}
              onSelect={updateCaret}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
              <button
                type="button"
                className="btn btn--primary"
                onClick={confirmSplitHere}
                disabled={caret <= 0 || caret >= origText.length}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Split here
              </button>
              {splitPos !== null && (
                <button type="button" className="btn btn--ghost" onClick={clearSplit}>
                  Clear split point
                </button>
              )}
              {splitPos !== null && (
                <span className="merge-option__location">Split at character {splitPos}</span>
              )}
            </div>
          </div>

          {canSplit && (
            <>
              {/* Preview of both parts */}
              <div className="form-row">
                <div className="form-group form-group--flex">
                  <label className="form-label"><span className="split-label-a">A</span> Part 1 preview</label>
                  <div className="split-para split-para--a" style={{ whiteSpace: 'pre-wrap', maxHeight: 160, overflow: 'auto' }}>
                    <p>{originalA || <em>(empty)</em>}</p>
                  </div>
                </div>
                <div className="form-group form-group--flex">
                  <label className="form-label"><span className="split-label-b">B</span> Part 2 preview</label>
                  <div className="split-para split-para--b" style={{ whiteSpace: 'pre-wrap', maxHeight: 160, overflow: 'auto' }}>
                    <p>{originalB || <em>(empty)</em>}</p>
                  </div>
                </div>
              </div>

              {/* Part names */}
              <div className="form-row">
                <div className="form-group form-group--flex">
                  <label className="form-label"><span className="split-label-a">A</span> Part 1 name</label>
                  <input type="text" className="form-input" value={nameA} onChange={e => setNameA(e.target.value)} />
                </div>
                <div className="form-group form-group--flex">
                  <label className="form-label"><span className="split-label-b">B</span> Part 2 name</label>
                  <input type="text" className="form-input" value={nameB} onChange={e => setNameB(e.target.value)} />
                </div>
              </div>

              {/* Objectives — checkbox = move to Part B; linked media follows */}
              {objectives.length > 0 && (
                <div className="form-group">
                  <label className="form-label">
                    Move learning objectives to Part B
                    <span className="form-label__hint"> (unchecked stay with Part A; media follows its linked objective)</span>
                  </label>
                  <div className="assign-list">
                    {objectives.map(obj => {
                      const linkedMedia = media.filter(m => m.linked_objective_id === obj.objective_id);
                      const isInB = objIdsForB.has(obj.objective_id);
                      return (
                        <label key={obj.objective_id} className={`assign-check-row${isInB ? ' assign-check-row--checked' : ''}`}>
                          <input type="checkbox" checked={isInB} onChange={() => toggleObjForB(obj.objective_id)} />
                          <span className={`assign-src assign-src--${isInB ? 'b' : 'a'}`}>{isInB ? 'B' : 'A'}</span>
                          <span className="obj-bloom-small">[{obj.bloom_level}]</span>
                          <span style={{ flex: 1 }}>{obj.objective_text}</span>
                          {linkedMedia.length > 0 && (
                            <span className="merge-option__location" style={{ marginLeft: 8 }}>
                              + {linkedMedia.length} media
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="form-group">
                <label className="form-label">Summary</label>
                <div className="assign-list" style={{ background: 'transparent', border: 'none', padding: 0 }}>
                  <div className="assign-check-row" style={{ cursor: 'default' }}>
                    <span className="assign-src assign-src--a">A</span>
                    <span>{objectivesA.length} objectives, {mediaA.length} media, modified chunk kept</span>
                  </div>
                  <div className="assign-check-row" style={{ cursor: 'default' }}>
                    <span className="assign-src assign-src--b">B</span>
                    <span>{objectivesB.length} objectives, {mediaB.length} media, new topic</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="modal__footer">
          <button className="btn btn--ghost" onClick={onCancel}>Cancel</button>
          <button className="btn btn--primary" disabled={!canSplit} onClick={handleConfirm}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="6" cy="18" r="3"/><circle cx="18" cy="6" r="3"/><line x1="13.51" y1="6.51" x2="6.51" y2="13.51"/></svg>
            Split into A + B
          </button>
        </div>
      </div>
    </div>
  );
}
