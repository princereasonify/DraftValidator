import { useEffect, useState } from 'react';
import './Modal.css';

const MEDIA_TYPES = ['image', 'video', '2d_tool', '3d_tool', 'simulation'];
const IMAGE_CATS = ['textbook_reference', 'example_based'];

export default function MediaModal({ mode = 'add', media = null, topic, onSave, onCancel }) {
  const isEdit = mode === 'edit';

  const [type, setType] = useState(media?.type || 'image');
  const [priority, setPriority] = useState(media?.priority ?? 1);
  const [title, setTitle] = useState(media?.title || '');
  const [intentDesc, setIntentDesc] = useState(media?.intent_description || '');
  const [pedPurpose, setPedPurpose] = useState(media?.pedagogical_purpose || '');
  const [imgCat, setImgCat] = useState(media?.image_category || 'textbook_reference');
  const [linkedObj, setLinkedObj] = useState(media?.linked_objective_id || '');

  // When type changes away from image, clear image_category
  useEffect(() => {
    if (type !== 'image') setImgCat('');
    else if (!imgCat) setImgCat('textbook_reference');
  }, [type]);

  const objectives = topic?.learning_objectives || [];
  const canSave = title.trim() && intentDesc.trim() && pedPurpose.trim();

  const handleSave = () => {
    if (!canSave) return;
    const payload = {
      type,
      priority: Number(priority),
      title: title.trim(),
      intent_description: intentDesc.trim(),
      pedagogical_purpose: pedPurpose.trim(),
      linked_objective_id: linkedObj || '',
    };
    if (type === 'image') payload.image_category = imgCat;
    onSave(payload);
  };

  const typeLabel = t => t.replace('_', ' ');

  return (
    <div className="modal-backdrop" onClick={onCancel} role="dialog" aria-modal="true">
      <div className="modal modal--lg" onClick={e => e.stopPropagation()}>
        <div className="modal__header">
          <div className="modal__header-icon modal__header-icon--merge">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
            </svg>
          </div>
          <div>
            <h3 className="modal__title">{isEdit ? 'Edit' : 'Add'} Media Intent</h3>
            <p className="modal__subtitle">Topic {topic?.topic_id}</p>
          </div>
          <button className="modal__close" onClick={onCancel}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="modal__body">
          {/* Type + Priority row */}
          <div className="form-row">
            <div className="form-group form-group--flex">
              <label className="form-label">Media Type <span className="form-required">*</span></label>
              <div className="type-pills">
                {MEDIA_TYPES.map(t => (
                  <button
                    key={t}
                    type="button"
                    className={`type-pill type-pill--${t}${type === t ? ' type-pill--active' : ''}`}
                    onClick={() => setType(t)}
                  >
                    {typeLabel(t)}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group form-group--sm">
              <label className="form-label">Priority</label>
              <select className="form-select" value={priority} onChange={e => setPriority(e.target.value)}>
                <option value={1}>1 — Shown first</option>
                <option value={2}>2 — Shown after</option>
                <option value={3}>3 — On request</option>
              </select>
            </div>
          </div>

          {/* Image category (conditional) */}
          {type === 'image' && (
            <div className="form-group">
              <label className="form-label">Image Category <span className="form-required">*</span></label>
              <div className="type-pills">
                {IMAGE_CATS.map(c => (
                  <button
                    key={c}
                    type="button"
                    className={`type-pill${imgCat === c ? ' type-pill--active' : ''}`}
                    onClick={() => setImgCat(c)}
                  >
                    {c.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Title */}
          <div className="form-group">
            <label className="form-label">Title <span className="form-required">*</span></label>
            <input
              type="text"
              className="form-input"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Short descriptive title for this media"
              autoFocus
            />
          </div>

          {/* Intent description */}
          <div className="form-group">
            <label className="form-label">Intent Description <span className="form-required">*</span></label>
            <textarea
              className="form-textarea"
              value={intentDesc}
              onChange={e => setIntentDesc(e.target.value)}
              rows={3}
              placeholder="1–3 sentences: what this media shows or does"
            />
          </div>

          {/* Pedagogical purpose */}
          <div className="form-group">
            <label className="form-label">Pedagogical Purpose <span className="form-required">*</span></label>
            <textarea
              className="form-textarea"
              value={pedPurpose}
              onChange={e => setPedPurpose(e.target.value)}
              rows={2}
              placeholder="Why this media helps at this specific learning point"
            />
          </div>

          {/* Linked objective */}
          <div className="form-group">
            <label className="form-label">Linked Objective</label>
            <select className="form-select" value={linkedObj} onChange={e => setLinkedObj(e.target.value)}>
              <option value="">— Unlinked —</option>
              {objectives.map(obj => (
                <option key={obj.objective_id} value={obj.objective_id}>
                  [{obj.bloom_level}] {obj.objective_text?.slice(0, 80)}{obj.objective_text?.length > 80 ? '…' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="modal__footer">
          <button className="btn btn--ghost" onClick={onCancel}>Cancel</button>
          <button className="btn btn--primary" onClick={handleSave} disabled={!canSave}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            {isEdit ? 'Save Changes' : 'Add Media'}
          </button>
        </div>
      </div>
    </div>
  );
}
