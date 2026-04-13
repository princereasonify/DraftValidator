import { useState } from 'react';
import './Modal.css';

const BLOOM_LEVELS = ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'];

const BLOOM_COLORS = {
  remember:   { bg: '#FEF3C7', text: '#92400E' },
  understand: { bg: '#E0F2FE', text: '#0C4A6E' },
  apply:      { bg: '#D1FAE5', text: '#065F46' },
  analyze:    { bg: '#EDE9FE', text: '#4C1D95' },
  evaluate:   { bg: '#FCE7F3', text: '#831843' },
  create:     { bg: '#FFF7ED', text: '#7C2D12' },
};

export default function ObjectiveModal({ mode = 'add', objective = null, topicId, onSave, onCancel }) {
  const [text, setText] = useState(objective?.objective_text || '');
  const [bloom, setBloom] = useState(objective?.bloom_level || 'understand');

  const isEdit = mode === 'edit';
  const canSave = text.trim().length >= 5;

  const handleSave = () => {
    if (!canSave) return;
    onSave({ objective_text: text.trim(), bloom_level: bloom });
  };

  return (
    <div className="modal-backdrop" onClick={onCancel} role="dialog" aria-modal="true">
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal__header">
          <div className="modal__header-icon modal__header-icon--edit">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 8 12 12 14 14"/>
            </svg>
          </div>
          <div>
            <h3 className="modal__title">{isEdit ? 'Edit' : 'Add'} Learning Objective</h3>
            <p className="modal__subtitle">Topic {topicId}</p>
          </div>
          <button className="modal__close" onClick={onCancel}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="modal__body">
          {/* Bloom level picker */}
          <div className="form-group">
            <label className="form-label">Bloom's Taxonomy Level</label>
            <div className="bloom-picker">
              {BLOOM_LEVELS.map(lvl => (
                <button
                  key={lvl}
                  type="button"
                  className={`bloom-pill${bloom === lvl ? ' bloom-pill--active' : ''}`}
                  style={bloom === lvl ? { background: BLOOM_COLORS[lvl].bg, color: BLOOM_COLORS[lvl].text, borderColor: BLOOM_COLORS[lvl].text } : {}}
                  onClick={() => setBloom(lvl)}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Objective text */}
          <div className="form-group">
            <label className="form-label">Objective Text <span className="form-required">*</span></label>
            <textarea
              className="form-textarea"
              value={text}
              onChange={e => setText(e.target.value)}
              rows={3}
              placeholder="e.g. Explain the process of photosynthesis and its role in plant nutrition"
              autoFocus
            />
            <span className="form-hint">{text.length} chars — at least 10 recommended</span>
          </div>

          {/* Preview */}
          {text.trim() && (
            <div className="objective-preview">
              <span
                className="objective-bloom"
                style={{ background: BLOOM_COLORS[bloom]?.bg, color: BLOOM_COLORS[bloom]?.text }}
              >
                {bloom}
              </span>
              <span className="objective-text">{text.trim()}</span>
            </div>
          )}
        </div>

        <div className="modal__footer">
          <button className="btn btn--ghost" onClick={onCancel}>Cancel</button>
          <button className="btn btn--primary" onClick={handleSave} disabled={!canSave}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            {isEdit ? 'Save Changes' : 'Add Objective'}
          </button>
        </div>
      </div>
    </div>
  );
}
