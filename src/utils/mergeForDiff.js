// Merge old + new learning-plan JSON trees into a single tree that DraftPlanView
// can render directly. Each module/segment/topic node gets a `__diff` hint:
//   { status: 'added' | 'deleted' | 'modified' | 'unchanged',
//     fields?: { topic_name?, topic_type?, modified_chunk?, original_chunk?,
//                learning_objectives?, media_intent? } }
//
// Deleted nodes (present in old, absent in new) are appended in-place so the
// reviewer can still see the content that was removed. If `oldPlan` is null or
// undefined, the new plan is returned untouched (no diff annotations).

export function mergeForDiff(oldPlan, newPlan) {
  if (!oldPlan || !newPlan) return newPlan || null;

  const oldModuleMap = new Map((oldPlan.modules || []).map(m => [m.module_id, m]));

  // Flatten new-plan ids so we know whether an old node survived anywhere
  // (handles moves between parents correctly).
  const newModuleIds = new Set();
  const newSegmentIds = new Set();
  const newTopicIds = new Set();
  const newTopicById = new Map();
  (newPlan.modules || []).forEach(m => {
    newModuleIds.add(m.module_id);
    (m.segments || []).forEach(s => {
      newSegmentIds.add(s.segment_id);
      (s.topics || []).forEach(t => {
        newTopicIds.add(t.topic_id);
        newTopicById.set(t.topic_id, t);
      });
    });
  });

  // Same flatten for old plan.
  const oldTopicById = new Map();
  (oldPlan.modules || []).forEach(m => (m.segments || []).forEach(s => (s.topics || []).forEach(t => {
    oldTopicById.set(t.topic_id, t);
  })));

  function topicDiff(oldT, newT) {
    if (!oldT) return { status: 'added' };
    const fields = {};
    if ((oldT.topic_name || '') !== (newT.topic_name || '')) fields.topic_name = { old: oldT.topic_name || '', new: newT.topic_name || '' };
    if ((oldT.topic_type || '') !== (newT.topic_type || '')) fields.topic_type = { old: oldT.topic_type || '', new: newT.topic_type || '' };
    if ((oldT.modified_chunk || '') !== (newT.modified_chunk || '')) fields.modified_chunk = { old: oldT.modified_chunk || '', new: newT.modified_chunk || '' };
    if ((oldT.original_chunk || '') !== (newT.original_chunk || '')) fields.original_chunk = { old: oldT.original_chunk || '', new: newT.original_chunk || '' };
    if ((oldT.learning_objectives || []).length !== (newT.learning_objectives || []).length) {
      fields.learning_objectives = { old: (oldT.learning_objectives || []).length, new: (newT.learning_objectives || []).length };
    }
    if ((oldT.media_intent || []).length !== (newT.media_intent || []).length) {
      fields.media_intent = { old: (oldT.media_intent || []).length, new: (newT.media_intent || []).length };
    }
    return Object.keys(fields).length === 0 ? { status: 'unchanged' } : { status: 'modified', fields };
  }

  function markDeletedTopic(t)   { return { ...t, __diff: { status: 'deleted' } }; }
  function markDeletedSegment(s) {
    return {
      ...s,
      topics: (s.topics || []).map(markDeletedTopic),
      __diff: { status: 'deleted' },
    };
  }
  function markDeletedModule(m) {
    return {
      ...m,
      segments: (m.segments || []).map(markDeletedSegment),
      __diff: { status: 'deleted' },
    };
  }

  // Walk new plan and annotate. Also append deleted nodes that belonged to
  // each old parent but no longer exist anywhere in the new plan.
  const mergedModules = (newPlan.modules || []).map(m => {
    const oldMod = oldModuleMap.get(m.module_id);
    const oldSegMap = new Map(((oldMod?.segments) || []).map(s => [s.segment_id, s]));

    const mergedSegments = (m.segments || []).map(s => {
      const oldSeg = oldSegMap.get(s.segment_id);
      const oldSegTopicMap = new Map(((oldSeg?.topics) || []).map(t => [t.topic_id, t]));

      const mergedTopics = (s.topics || []).map(t => {
        // Look up the old topic globally (supports topics that moved between segments).
        const oldT = oldTopicById.get(t.topic_id);
        return { ...t, __diff: topicDiff(oldT, t) };
      });

      // Append topics that WERE in this old segment but are gone from the whole new plan.
      ((oldSeg?.topics) || []).forEach(oldT => {
        if (!newTopicIds.has(oldT.topic_id)) mergedTopics.push(markDeletedTopic(oldT));
      });

      const segStatus = !oldSeg
        ? 'added'
        : ((oldSeg.segment_name || '') !== (s.segment_name || '') ? 'modified' : 'unchanged');

      return { ...s, topics: mergedTopics, __diff: { status: segStatus } };
    });

    // Append segments that were in old module but have disappeared entirely.
    ((oldMod?.segments) || []).forEach(oldS => {
      if (!newSegmentIds.has(oldS.segment_id)) mergedSegments.push(markDeletedSegment(oldS));
    });

    const modStatus = !oldMod
      ? 'added'
      : ((oldMod.module_name || '') !== (m.module_name || '') ? 'modified' : 'unchanged');

    return { ...m, segments: mergedSegments, __diff: { status: modStatus } };
  });

  // Append modules that existed in old but have been removed entirely.
  (oldPlan.modules || []).forEach(oldM => {
    if (!newModuleIds.has(oldM.module_id)) mergedModules.push(markDeletedModule(oldM));
  });

  return { ...newPlan, modules: mergedModules };
}
