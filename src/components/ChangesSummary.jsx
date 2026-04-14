import { useState } from 'react';
import { diffTotals } from '../utils/diffPlans';
import './ChangesSummary.css';

export default function ChangesSummary({ diff, prevVersion, currVersion }) {
  const [open, setOpen] = useState(true);

  if (!diff) {
    return (
      <div className="cs-box cs-box--empty">
        <span>No previous version to compare against — this is the first draft (v{currVersion}).</span>
      </div>
    );
  }

  const totals = diffTotals(diff);
  if (totals.total === 0) {
    return (
      <div className="cs-box cs-box--empty">
        <span>No changes between v{prevVersion} and v{currVersion}.</span>
      </div>
    );
  }

  return (
    <div className="cs-box">
      <button className="cs-header" onClick={() => setOpen(v => !v)}>
        <span className="cs-header__title">
          Changes vs v{prevVersion}
          <span className="cs-chip">{totals.total}</span>
        </span>
        <span className="cs-header__counts">
          {totals.modules > 0 && <span className="cs-pill">M: {totals.modules}</span>}
          {totals.segments > 0 && <span className="cs-pill">S: {totals.segments}</span>}
          {totals.topics > 0 && <span className="cs-pill">T: {totals.topics}</span>}
          <span className="cs-caret">{open ? '▾' : '▸'}</span>
        </span>
      </button>

      {open && (
        <div className="cs-body">
          <Section title="Modules" group={diff.modules} renderItem={renderModuleItem} />
          <Section title="Segments" group={diff.segments} renderItem={renderSegmentItem} />
          <Section title="Topics" group={diff.topics} renderItem={renderTopicItem} />
        </div>
      )}
    </div>
  );
}

function Section({ title, group, renderItem }) {
  const empty = group.added.length === 0 && group.deleted.length === 0 && group.modified.length === 0;
  if (empty) return null;
  return (
    <div className="cs-section">
      <h4 className="cs-section__title">{title}</h4>
      {group.added.length > 0 && (
        <div className="cs-list cs-list--added">
          <div className="cs-list__label">Added ({group.added.length})</div>
          {group.added.map(renderItem)}
        </div>
      )}
      {group.deleted.length > 0 && (
        <div className="cs-list cs-list--deleted">
          <div className="cs-list__label">Deleted ({group.deleted.length})</div>
          {group.deleted.map(renderItem)}
        </div>
      )}
      {group.modified.length > 0 && (
        <div className="cs-list cs-list--modified">
          <div className="cs-list__label">Modified ({group.modified.length})</div>
          {group.modified.map(renderItem)}
        </div>
      )}
    </div>
  );
}

function renderModuleItem(m) {
  return (
    <div key={m.id} className="cs-item">
      <code className="cs-id">{m.id}</code>
      <span className="cs-name">
        {m.oldName && m.newName && m.oldName !== m.newName
          ? <><s>{m.oldName}</s> → {m.newName}</>
          : (m.name || m.newName || m.oldName || '—')}
      </span>
    </div>
  );
}

function renderSegmentItem(s) {
  return (
    <div key={s.id} className="cs-item">
      <code className="cs-id">{s.id}</code>
      <span className="cs-name">{s.name || s.oldName || '—'}</span>
      {s.changes && s.changes.length > 0 && (
        <span className="cs-changes">{s.changes.join(', ')}</span>
      )}
      {s.moduleId && !s.changes && (
        <span className="cs-parent">in {s.moduleId}</span>
      )}
    </div>
  );
}

function renderTopicItem(t) {
  return (
    <div key={t.id} className="cs-item">
      <code className="cs-id">{t.id}</code>
      <span className="cs-name">
        {t.oldName && t.name && t.oldName !== t.name
          ? <><s>{t.oldName}</s> → {t.name}</>
          : (t.name || t.oldName || '—')}
      </span>
      {t.changes && t.changes.length > 0 && (
        <span className="cs-changes">{t.changes.join(', ')}</span>
      )}
      {t.segmentId && !t.changes && (
        <span className="cs-parent">in {t.segmentId}</span>
      )}
    </div>
  );
}
