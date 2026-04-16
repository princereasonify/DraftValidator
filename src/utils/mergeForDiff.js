// Merge old + new learning-plan JSON trees into a single tree that DraftPlanView
// can render directly. Each module/segment/topic node gets a `__diff` hint:
//   { status: 'added' | 'deleted' | 'modified' | 'unchanged',
//     fields?: { topic_name?, topic_type?, modified_chunk?, original_chunk?,
//                bloom_level?, learning_objectives?, media_intent? } }
//
// Topics are matched by ID first, then by original_chunk content (handles
// renumbered IDs from prior saves). Deleted nodes (present in old, absent in
// new) are appended in-place so the reviewer can still see removed content.
// If `oldPlan` is null or undefined, the new plan is returned untouched.

export function mergeForDiff(oldPlan, newPlan) {
  if (!oldPlan || !newPlan) return newPlan || null;

  // ── Flatten old plan indexes ──
  const oldModuleMap = new Map((oldPlan.modules || []).map(m => [m.module_id, m]));
  const oldTopicById = new Map();
  (oldPlan.modules || []).forEach(m =>
    (m.segments || []).forEach(s =>
      (s.topics || []).forEach(t => oldTopicById.set(t.topic_id, t))
    )
  );

  // ── Flatten new plan indexes ──
  const newModuleIds = new Set();
  const newSegmentIds = new Set();
  const newTopicIds = new Set();
  (newPlan.modules || []).forEach(m => {
    newModuleIds.add(m.module_id);
    (m.segments || []).forEach(s => {
      newSegmentIds.add(s.segment_id);
      (s.topics || []).forEach(t => newTopicIds.add(t.topic_id));
    });
  });

  // ── Build topic matching: track which old topics are accounted for,
  //    and map each new topic ID to its corresponding old topic (if any). ──
  const matchedOldIds = new Set();
  const newIdToOldTopic = new Map(); // new topic ID → old topic object

  // Phase 1: Direct ID match
  for (const [oldId, oldT] of oldTopicById) {
    if (newTopicIds.has(oldId)) {
      matchedOldIds.add(oldId);
      newIdToOldTopic.set(oldId, oldT);
    }
  }

  // Phase 2: Content-based match for topics whose IDs changed (renumbered).
  // Match on original_chunk since that's the textbook content and remains
  // stable across renames, type changes, and other edits.
  const normalize = s => (s || '').trim().replace(/\s+/g, ' ');
  const unmatchedOldEntries = [...oldTopicById.entries()].filter(([id]) => !matchedOldIds.has(id));

  // Collect unmatched new topics
  const unmatchedNewTopics = [];
  (newPlan.modules || []).forEach(m =>
    (m.segments || []).forEach(s =>
      (s.topics || []).forEach(t => {
        if (!newIdToOldTopic.has(t.topic_id)) unmatchedNewTopics.push(t);
      })
    )
  );

  const claimedNewIds = new Set();
  for (const [oldId, oldT] of unmatchedOldEntries) {
    const oldChunk = normalize(oldT.original_chunk);
    if (!oldChunk || oldChunk.length < 10) continue;

    for (const newT of unmatchedNewTopics) {
      if (claimedNewIds.has(newT.topic_id)) continue;
      if (normalize(newT.original_chunk) === oldChunk) {
        matchedOldIds.add(oldId);
        claimedNewIds.add(newT.topic_id);
        newIdToOldTopic.set(newT.topic_id, oldT);
        break;
      }
    }
  }

  // Phase 3: Name-based match for topics with short/empty original_chunk.
  // Only match if the topic_name is identical AND there's exactly one candidate.
  const stillUnmatchedOld = [...oldTopicById.entries()].filter(([id]) => !matchedOldIds.has(id));
  const stillUnmatchedNewSet = new Set(
    unmatchedNewTopics.filter(t => !claimedNewIds.has(t.topic_id)).map(t => t.topic_id)
  );

  for (const [oldId, oldT] of stillUnmatchedOld) {
    const oldName = (oldT.topic_name || '').trim().toLowerCase();
    if (!oldName) continue;
    const candidates = unmatchedNewTopics.filter(
      t => stillUnmatchedNewSet.has(t.topic_id) && (t.topic_name || '').trim().toLowerCase() === oldName
    );
    if (candidates.length === 1) {
      matchedOldIds.add(oldId);
      stillUnmatchedNewSet.delete(candidates[0].topic_id);
      claimedNewIds.add(candidates[0].topic_id);
      newIdToOldTopic.set(candidates[0].topic_id, oldT);
    }
  }

  // ── Diff helpers ──
  function topicDiff(oldT, newT) {
    if (!oldT) return { status: 'added' };
    const fields = {};
    if ((oldT.topic_name || '') !== (newT.topic_name || ''))
      fields.topic_name = { old: oldT.topic_name || '', new: newT.topic_name || '' };
    if ((oldT.topic_type || '') !== (newT.topic_type || ''))
      fields.topic_type = { old: oldT.topic_type || '', new: newT.topic_type || '' };
    if ((oldT.modified_chunk || '') !== (newT.modified_chunk || ''))
      fields.modified_chunk = { old: oldT.modified_chunk || '', new: newT.modified_chunk || '' };
    if ((oldT.original_chunk || '') !== (newT.original_chunk || ''))
      fields.original_chunk = { old: oldT.original_chunk || '', new: newT.original_chunk || '' };

    // Compare objectives by actual content, not just count
    const oldObjTexts = (oldT.learning_objectives || []).map(o => (o.objective_text || '').trim()).sort();
    const newObjTexts = (newT.learning_objectives || []).map(o => (o.objective_text || '').trim()).sort();
    if (JSON.stringify(oldObjTexts) !== JSON.stringify(newObjTexts)) {
      fields.learning_objectives = {
        old: (oldT.learning_objectives || []).length,
        new: (newT.learning_objectives || []).length,
      };
    }

    // Compare media by actual content, not just count
    const mediaKey = m => `${m.type || ''}|${(m.title || '').trim()}|${(m.intent_description || '').trim()}`;
    const oldMediaKeys = (oldT.media_intent || []).map(mediaKey).sort();
    const newMediaKeys = (newT.media_intent || []).map(mediaKey).sort();
    if (JSON.stringify(oldMediaKeys) !== JSON.stringify(newMediaKeys)) {
      fields.media_intent = {
        old: (oldT.media_intent || []).length,
        new: (newT.media_intent || []).length,
      };
    }

    return Object.keys(fields).length === 0 ? { status: 'unchanged' } : { status: 'modified', fields };
  }

  function markDeletedTopic(t)   { return { ...t, __diff: { status: 'deleted' } }; }
  function markDeletedSegment(s) {
    return { ...s, topics: (s.topics || []).map(markDeletedTopic), __diff: { status: 'deleted' } };
  }
  function markDeletedModule(m) {
    return { ...m, segments: (m.segments || []).map(markDeletedSegment), __diff: { status: 'deleted' } };
  }

  // ── Walk new plan, annotate, append deleted nodes ──
  const mergedModules = (newPlan.modules || []).map(m => {
    const oldMod = oldModuleMap.get(m.module_id);
    const oldSegMap = new Map(((oldMod?.segments) || []).map(s => [s.segment_id, s]));

    const mergedSegments = (m.segments || []).map(s => {
      const oldSeg = oldSegMap.get(s.segment_id);

      const mergedTopics = (s.topics || []).map(t => {
        // Look up old topic via matching (handles both ID match and content match)
        const oldT = newIdToOldTopic.get(t.topic_id);
        return { ...t, __diff: topicDiff(oldT, t) };
      });

      // Append topics that WERE in this old segment but are truly deleted
      // (not matched to any new topic by ID or content)
      if (oldSeg) {
        for (const oldT of (oldSeg.topics || [])) {
          if (!matchedOldIds.has(oldT.topic_id)) {
            mergedTopics.push(markDeletedTopic(oldT));
          }
        }
      }

      const segStatus = !oldSeg
        ? 'added'
        : ((oldSeg.segment_name || '') !== (s.segment_name || '') ? 'modified' : 'unchanged');

      return { ...s, topics: mergedTopics, __diff: { status: segStatus } };
    });

    // Append segments from old module that have disappeared entirely
    if (oldMod) {
      for (const oldS of (oldMod.segments || [])) {
        if (!newSegmentIds.has(oldS.segment_id)) mergedSegments.push(markDeletedSegment(oldS));
      }
    }

    const modStatus = !oldMod
      ? 'added'
      : ((oldMod.module_name || '') !== (m.module_name || '') ? 'modified' : 'unchanged');

    return { ...m, segments: mergedSegments, __diff: { status: modStatus } };
  });

  // Append modules from old plan that have been removed entirely
  for (const oldM of (oldPlan.modules || [])) {
    if (!newModuleIds.has(oldM.module_id)) mergedModules.push(markDeletedModule(oldM));
  }

  return { ...newPlan, modules: mergedModules };
}
