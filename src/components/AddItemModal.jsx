import { useState } from 'react';
import './Modal.css';

const TOPIC_TYPES_SCIENCE = ['CONCEPT', 'EXPERIMENT', 'PRACTICE', 'INTERACTIVE', 'REVIEW'];
const TOPIC_TYPES_MATH = ['CONCEPT', 'WORKED_EXAMPLE', 'APPLICATION', 'PRACTICE', 'INTERACTIVE', 'REVIEW'];

/**
 * mode: 'module' | 'segment' | 'topic' | 'example'
 */
export default function AddItemModal({ mode, data, targetId, onSave, onCancel }) {
  const [name, setName] = useState('');
  const [topicType, setTopicType] = useState('CONCEPT');
  const [exTheme, setExTheme] = useState('');
  const [exDesc, setExDesc] = useState('');
  const [exScope, setExScope] = useState('chapter');
  const [exTopics, setExTopics] = useState([]);

  const subject = data?.subject || 'science';
  const topicTypes = subject === 'mathematics' ? TOPIC_TYPES_MATH : TOPIC_TYPES_SCIENCE;

  // Flat topic list for example topic picker
  const allTopics = [];
  (data?.modules || []).forEach(m =>
    (m.segments || []).forEach(s =>
      (s.topics || []).forEach(t =>
        allTopics.push({ id: t.topic_id, name: t.topic_name })
      )
    )
  );

  const modeConfig = {
    module: { title: 'Add New Module', label: 'Module Name', icon: 'M' },
    segment: { title: 'Add New Segment', label: 'Segment Name', icon: 'S' },
    topic: { title: 'Add New Topic', label: 'Topic Name', icon: 'T' },
    example: { title: 'Add New Example', label: null, icon: 'E' },
  };
  const cfg = modeConfig[mode] || modeConfig.module;

  const canSave = mode === 'example'
    ? exTheme.trim() && exDesc.trim()
    : name.trim().length >= 2;

  const handleSave = () => {
    if (!canSave) return;
    if (mode === 'example') {
      onSave({ example_theme: exTheme.trim(), example_description: exDesc.trim(), scope_level: exScope, supported_topic_ids: exTopics });
    } else if (mode === 'topic') {
      onSave({ topic_name: name.trim(), topic_type: topicType });
    } else {
      onSave({ name: name.trim() });
    }
  };

  return (
    <div className="modal-backdrop" onClick={onCancel} role="dialog" aria-modal="true">
      <div className={`modal${mode === 'example' ? ' modal--lg' : ''}`} onClick={e => e.stopPropagation()}>
        <div className="modal__header">
          <div className="modal__header-icon modal__header-icon--edit">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
            </svg>
          </div>
          <div>
            <h3 className="modal__title">{cfg.title}</h3>
            {targetId && <p className="modal__subtitle">In {targetId}</p>}
          </div>
          <button className="modal__close" onClick={onCancel}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="modal__body">
          {mode === 'example' ? (
            <>
              <div className="form-group">
                <label className="form-label">Example Theme <span className="form-required">*</span></label>
                <input type="text" className="form-input" value={exTheme} onChange={e => setExTheme(e.target.value)} placeholder="e.g. Paper Plane and the Science of Flight" autoFocus />
              </div>
              <div className="form-group">
                <label className="form-label">Description <span className="form-required">*</span></label>
                <textarea className="form-textarea" value={exDesc} onChange={e => setExDesc(e.target.value)} rows={3} placeholder="1–3 sentences describing the example" />
              </div>
              <div className="form-row">
                <div className="form-group form-group--flex">
                  <label className="form-label">Scope Level</label>
                  <div className="type-pills">
                    {['chapter', 'module', 'segment', 'topic'].map(s => (
                      <button key={s} type="button" className={`type-pill${exScope === s ? ' type-pill--active' : ''}`} onClick={() => setExScope(s)}>{s}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Supported Topics</label>
                <div className="topic-multi-select">
                  {allTopics.map(t => (
                    <label key={t.id} className={`topic-multi-option${exTopics.includes(t.id) ? ' topic-multi-option--checked' : ''}`}>
                      <input type="checkbox" checked={exTopics.includes(t.id)} onChange={e => {
                        if (e.target.checked) setExTopics(p => [...p, t.id]);
                        else setExTopics(p => p.filter(x => x !== t.id));
                      }} />
                      <code>{t.id}</code> <span>{t.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="form-group">
                <label className="form-label">{cfg.label} <span className="form-required">*</span></label>
                <input
                  type="text"
                  className="form-input"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder={`Enter ${cfg.label.toLowerCase()}…`}
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Enter' && canSave) handleSave(); }}
                />
              </div>
              {mode === 'topic' && (
                <div className="form-group">
                  <label className="form-label">Topic Type</label>
                  <div className="type-pills type-pills--wrap">
                    {topicTypes.map(t => (
                      <button
                        key={t}
                        type="button"
                        className={`type-pill${topicType === t ? ' type-pill--active' : ''}`}
                        onClick={() => setTopicType(t)}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="modal__footer">
          <button className="btn btn--ghost" onClick={onCancel}>Cancel</button>
          <button className="btn btn--primary" onClick={handleSave} disabled={!canSave}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add {mode.charAt(0).toUpperCase() + mode.slice(1)}
          </button>
        </div>
      </div>
    </div>
  );
}
