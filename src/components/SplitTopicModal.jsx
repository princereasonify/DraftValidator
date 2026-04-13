import { useMemo, useState } from 'react';
import './Modal.css';

/**
 * Enhanced Split Modal — spec Section 5.2
 * - Shows paragraphs as clickable blocks (split at \n\n boundary)
 * - User clicks between paragraphs to select split point
 * - Name both resulting topics
 * - Assign each objective to A or B (radio per objective, default: all to A)
 * - Assign each media item to A or B (radio per media, default: all to A)
 */
export default function SplitTopicModal({ topic, onCancel, onConfirm }) {
  const text = topic.modified_chunk || topic.original_chunk || '';
  const origText = topic.original_chunk || '';
  const objectives = topic.learning_objectives || [];
  const media = topic.media_intent || [];

  // Split text into paragraphs
  const paragraphs = useMemo(() => text.split(/\n\n+/).map(p => p.trim()).filter(Boolean), [text]);
  const origParas = useMemo(() => origText.split(/\n\n+/).map(p => p.trim()).filter(Boolean), [origText]);

  const [splitIdx, setSplitIdx] = useState(null); // index AFTER which to split (0-based)
  const [nameA, setNameA] = useState(topic.topic_name + ' (Part 1)');
  const [nameB, setNameB] = useState(topic.topic_name + ' (Part 2)');
  const [objAssign, setObjAssign] = useState(() => Object.fromEntries(objectives.map(o => [o.objective_id, 'A'])));
  const [mediaAssign, setMediaAssign] = useState(() => Object.fromEntries(media.map(m => [m.media_id, 'A'])));

  const canSplit = splitIdx !== null && splitIdx >= 0 && splitIdx < paragraphs.length - 1;

  const partA = splitIdx !== null ? paragraphs.slice(0, splitIdx + 1).join('\n\n') : '';
  const partB = splitIdx !== null ? paragraphs.slice(splitIdx + 1).join('\n\n') : '';
  const origPartA = splitIdx !== null ? origParas.slice(0, Math.ceil((splitIdx + 1) / paragraphs.length * origParas.length)).join('\n\n') : '';
  const origPartB = splitIdx !== null ? origParas.slice(Math.ceil((splitIdx + 1) / paragraphs.length * origParas.length)).join('\n\n') : '';

  const handleConfirm = () => {
    if (!canSplit) return;
    onConfirm({
      nameA: nameA.trim() || topic.topic_name + ' (Part 1)',
      nameB: nameB.trim() || topic.topic_name + ' (Part 2)',
      modifiedA: partA,
      modifiedB: partB,
      originalA: origPartA,
      originalB: origPartB,
      objectivesA: objectives.filter(o => objAssign[o.objective_id] !== 'B'),
      objectivesB: objectives.filter(o => objAssign[o.objective_id] === 'B'),
      mediaA: media.filter(m => mediaAssign[m.media_id] !== 'B'),
      mediaB: media.filter(m => mediaAssign[m.media_id] === 'B'),
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
            Click <strong>between paragraphs</strong> to choose the split point. Topic A gets paragraphs above; Topic B gets paragraphs below.
          </p>

          {/* Paragraph selector */}
          <div className="split-paragraphs">
            {paragraphs.map((para, i) => (
              <div key={i}>
                <div className={`split-para${splitIdx !== null && i <= splitIdx ? ' split-para--a' : splitIdx !== null ? ' split-para--b' : ''}`}>
                  {splitIdx !== null && (
                    <span className={`split-para__badge split-para__badge--${i <= splitIdx ? 'a' : 'b'}`}>
                      {i <= splitIdx ? 'A' : 'B'}
                    </span>
                  )}
                  <p>{para.length > 180 ? para.slice(0, 180) + '…' : para}</p>
                </div>
                {i < paragraphs.length - 1 && (
                  <button
                    type="button"
                    className={`split-divider-btn${splitIdx === i ? ' split-divider-btn--active' : ''}`}
                    onClick={() => setSplitIdx(prev => prev === i ? null : i)}
                    title={`Split after paragraph ${i + 1}`}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    {splitIdx === i ? 'Split point selected ✓' : `Click to split here`}
                  </button>
                )}
              </div>
            ))}
            {paragraphs.length === 0 && <p className="form-empty">No content to split.</p>}
          </div>

          {canSplit && (
            <>
              {/* Names for both parts */}
              <div className="form-row">
                <div className="form-group form-group--flex">
                  <label className="form-label"><span className="split-label-a">A</span> Topic A Name</label>
                  <input type="text" className="form-input" value={nameA} onChange={e => setNameA(e.target.value)} />
                </div>
                <div className="form-group form-group--flex">
                  <label className="form-label"><span className="split-label-b">B</span> Topic B Name</label>
                  <input type="text" className="form-input" value={nameB} onChange={e => setNameB(e.target.value)} />
                </div>
              </div>

              {/* Objective assignment */}
              {objectives.length > 0 && (
                <div className="form-group">
                  <label className="form-label">Assign Learning Objectives</label>
                  <div className="assign-list">
                    {objectives.map(obj => (
                      <div key={obj.objective_id} className="assign-row">
                        <div className="assign-row__text">
                          <code>{obj.objective_id}</code>
                          <span>[{obj.bloom_level}]</span>
                          <p>{obj.objective_text}</p>
                        </div>
                        <div className="assign-row__btns">
                          <button
                            type="button"
                            className={`assign-btn assign-btn--a${objAssign[obj.objective_id] !== 'B' ? ' assign-btn--active' : ''}`}
                            onClick={() => setObjAssign(p => ({ ...p, [obj.objective_id]: 'A' }))}
                          >A</button>
                          <button
                            type="button"
                            className={`assign-btn assign-btn--b${objAssign[obj.objective_id] === 'B' ? ' assign-btn--active' : ''}`}
                            onClick={() => setObjAssign(p => ({ ...p, [obj.objective_id]: 'B' }))}
                          >B</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Media assignment */}
              {media.length > 0 && (
                <div className="form-group">
                  <label className="form-label">Assign Media Items</label>
                  <div className="assign-list">
                    {media.map(mi => (
                      <div key={mi.media_id} className="assign-row">
                        <div className="assign-row__text">
                          <code>{mi.media_id}</code>
                          <span className={`media-badge media-badge--${mi.type}`}>{mi.type?.replace('_', ' ')}</span>
                          <p>{mi.title}</p>
                        </div>
                        <div className="assign-row__btns">
                          <button
                            type="button"
                            className={`assign-btn assign-btn--a${mediaAssign[mi.media_id] !== 'B' ? ' assign-btn--active' : ''}`}
                            onClick={() => setMediaAssign(p => ({ ...p, [mi.media_id]: 'A' }))}
                          >A</button>
                          <button
                            type="button"
                            className={`assign-btn assign-btn--b${mediaAssign[mi.media_id] === 'B' ? ' assign-btn--active' : ''}`}
                            onClick={() => setMediaAssign(p => ({ ...p, [mi.media_id]: 'B' }))}
                          >B</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
