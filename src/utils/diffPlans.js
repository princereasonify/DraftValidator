// Compare two learning-plan JSON trees and report what changed at each level.
// Returns { modules, segments, topics } where each has { added, deleted, modified }.
//
// - `added`/`deleted` are identified by the presence/absence of a stable id.
// - `modified` lists entries whose id exists in both but whose content differs.
// - For topics, `modified[i].changes` enumerates which fields changed.

function flatten(plan) {
  const modules = new Map();
  const segments = new Map();
  const topics = new Map();
  (plan?.modules || []).forEach(m => {
    modules.set(m.module_id, { id: m.module_id, name: m.module_name });
    (m.segments || []).forEach(s => {
      segments.set(s.segment_id, {
        id: s.segment_id,
        name: s.segment_name,
        moduleId: m.module_id,
        moduleName: m.module_name,
      });
      (s.topics || []).forEach(t => {
        topics.set(t.topic_id, {
          id: t.topic_id,
          name: t.topic_name,
          type: t.topic_type,
          modifiedChunk: t.modified_chunk || '',
          originalChunk: t.original_chunk || '',
          objectivesCount: (t.learning_objectives || []).length,
          mediaCount: (t.media_intent || []).length,
          segmentId: s.segment_id,
          moduleId: m.module_id,
        });
      });
    });
  });
  return { modules, segments, topics };
}

export function diffPlans(oldPlan, newPlan) {
  const a = flatten(oldPlan);
  const b = flatten(newPlan);

  const result = {
    modules:  { added: [], deleted: [], modified: [] },
    segments: { added: [], deleted: [], modified: [] },
    topics:   { added: [], deleted: [], modified: [] },
  };

  // Modules
  for (const [id, m] of b.modules) if (!a.modules.has(id)) result.modules.added.push(m);
  for (const [id, m] of a.modules) if (!b.modules.has(id)) result.modules.deleted.push(m);
  for (const [id, mNew] of b.modules) {
    const mOld = a.modules.get(id);
    if (!mOld) continue;
    if (mOld.name !== mNew.name) {
      result.modules.modified.push({ id, oldName: mOld.name, newName: mNew.name });
    }
  }

  // Segments
  for (const [id, s] of b.segments) if (!a.segments.has(id)) result.segments.added.push(s);
  for (const [id, s] of a.segments) if (!b.segments.has(id)) result.segments.deleted.push(s);
  for (const [id, sNew] of b.segments) {
    const sOld = a.segments.get(id);
    if (!sOld) continue;
    const changes = [];
    if (sOld.name !== sNew.name) changes.push('renamed');
    if (sOld.moduleId !== sNew.moduleId) changes.push(`moved (${sOld.moduleId} → ${sNew.moduleId})`);
    if (changes.length) {
      result.segments.modified.push({ id, name: sNew.name, oldName: sOld.name, changes });
    }
  }

  // Topics
  for (const [id, t] of b.topics) if (!a.topics.has(id)) result.topics.added.push(t);
  for (const [id, t] of a.topics) if (!b.topics.has(id)) result.topics.deleted.push(t);
  for (const [id, tNew] of b.topics) {
    const tOld = a.topics.get(id);
    if (!tOld) continue;
    const changes = [];
    if (tOld.name !== tNew.name) changes.push('name');
    if (tOld.type !== tNew.type) changes.push(`type (${tOld.type || '—'} → ${tNew.type || '—'})`);
    if (tOld.modifiedChunk !== tNew.modifiedChunk) changes.push('modified chunk');
    if (tOld.originalChunk !== tNew.originalChunk) changes.push('original chunk');
    if (tOld.objectivesCount !== tNew.objectivesCount) changes.push(`objectives (${tOld.objectivesCount} → ${tNew.objectivesCount})`);
    if (tOld.mediaCount !== tNew.mediaCount) changes.push(`media (${tOld.mediaCount} → ${tNew.mediaCount})`);
    if (tOld.segmentId !== tNew.segmentId) changes.push(`moved (${tOld.segmentId} → ${tNew.segmentId})`);
    if (changes.length) {
      result.topics.modified.push({ id, name: tNew.name, oldName: tOld.name, changes });
    }
  }

  return result;
}

export function diffTotals(diff) {
  const sum = (obj) => obj.added.length + obj.deleted.length + obj.modified.length;
  return {
    modules:  sum(diff.modules),
    segments: sum(diff.segments),
    topics:   sum(diff.topics),
    total:    sum(diff.modules) + sum(diff.segments) + sum(diff.topics),
  };
}
