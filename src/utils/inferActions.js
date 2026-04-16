// Infer a human-readable list of semantic actions (split, merge, add, delete,
// rename, edit) by comparing two plan JSONs. Topics are matched by ID first,
// then by original_chunk content (handles renumbered IDs from prior saves).
// The backend only stores the final saved state, so we reconstruct what
// happened by looking at ID patterns and content shifts.

function flattenTopics(plan) {
  const map = new Map();
  (plan?.modules || []).forEach(m =>
    (m.segments || []).forEach(s =>
      (s.topics || []).forEach(t => {
        map.set(t.topic_id, {
          id: t.topic_id,
          name: t.topic_name,
          type: t.topic_type,
          moduleId: m.module_id,
          moduleName: m.module_name,
          segmentId: s.segment_id,
          segmentName: s.segment_name,
          originalChunk: t.original_chunk || '',
          modifiedChunk: t.modified_chunk || '',
          objectivesCount: (t.learning_objectives || []).length,
          mediaCount: (t.media_intent || []).length,
        });
      })
    )
  );
  return map;
}

function flattenSegmentsModules(plan) {
  const segs = new Map();
  const mods = new Map();
  (plan?.modules || []).forEach(m => {
    mods.set(m.module_id, { id: m.module_id, name: m.module_name });
    (m.segments || []).forEach(s => segs.set(s.segment_id, { id: s.segment_id, name: s.segment_name, moduleId: m.module_id }));
  });
  return { segs, mods };
}

// Normalize whitespace for content comparison
const norm = s => (s || '').trim().replace(/\s+/g, ' ');

export function inferActions(oldPlan, newPlan) {
  if (!oldPlan || !newPlan) return [];
  const oldT = flattenTopics(oldPlan);
  const newT = flattenTopics(newPlan);
  const { segs: oldS, mods: oldM } = flattenSegmentsModules(oldPlan);
  const { segs: newS, mods: newM } = flattenSegmentsModules(newPlan);

  // ── Phase 1: Build topic matching (old ID ↔ new ID) ──
  const matchedOldIds = new Set();
  const matchedNewIds = new Set();
  const oldToNewMap = new Map(); // old ID → new ID

  // 1a. Direct ID match
  for (const [id] of newT) {
    if (oldT.has(id)) {
      matchedOldIds.add(id);
      matchedNewIds.add(id);
      oldToNewMap.set(id, id);
    }
  }

  // 1b. Content-based match (original_chunk) for renumbered topics
  const unmatchedOld = [...oldT.entries()].filter(([id]) => !matchedOldIds.has(id));
  const unmatchedNew = [...newT.entries()].filter(([id]) => !matchedNewIds.has(id));

  for (const [oldId, oldTopic] of unmatchedOld) {
    const oldChunk = norm(oldTopic.originalChunk);
    if (!oldChunk || oldChunk.length < 10) continue;

    for (const [newId, newTopic] of unmatchedNew) {
      if (matchedNewIds.has(newId)) continue;
      if (norm(newTopic.originalChunk) === oldChunk) {
        matchedOldIds.add(oldId);
        matchedNewIds.add(newId);
        oldToNewMap.set(oldId, newId);
        break;
      }
    }
  }

  // 1c. Name-based match for topics with short/empty original_chunk
  const stillUnmatchedOld = [...oldT.entries()].filter(([id]) => !matchedOldIds.has(id));
  const stillUnmatchedNew = [...newT.entries()].filter(([id]) => !matchedNewIds.has(id));

  for (const [oldId, oldTopic] of stillUnmatchedOld) {
    const oldName = (oldTopic.name || '').trim().toLowerCase();
    if (!oldName) continue;
    const candidates = stillUnmatchedNew.filter(
      ([nid, nt]) => !matchedNewIds.has(nid) && (nt.name || '').trim().toLowerCase() === oldName
    );
    if (candidates.length === 1) {
      const [newId] = candidates[0];
      matchedOldIds.add(oldId);
      matchedNewIds.add(newId);
      oldToNewMap.set(oldId, newId);
    }
  }

  // Build reverse map
  const newToOldMap = new Map();
  for (const [oldId, newId] of oldToNewMap) newToOldMap.set(newId, oldId);

  // Determine truly unmatched (added / deleted)
  const trulyAddedIds = new Set([...newT.keys()].filter(id => !matchedNewIds.has(id)));
  const trulyDeletedIds = new Set([...oldT.keys()].filter(id => !matchedOldIds.has(id)));

  const handledAdded = new Set();
  const handledDeleted = new Set();
  const matchedSplitSources = new Set();
  const matchedMergeTargets = new Set();
  const actions = [];

  // ── Phase 2: Detect splits ──

  // 2a. ID-pattern splits: new topic with id `{sourceId}_split_<n>`
  for (const id of trulyAddedIds) {
    const match = id.match(/^(.+)_split_\d+$/);
    if (!match) continue;
    const sourceId = match[1];
    const src = newT.get(sourceId) || oldT.get(sourceId);
    const piece = newT.get(id);
    actions.push({
      kind: 'split',
      topicId: sourceId,
      newId: id,
      description: `${sourceId}${src?.name ? ` ("${src.name}")` : ''} was split — new piece ${id}${piece?.name ? ` ("${piece.name}")` : ''}`,
    });
    matchedSplitSources.add(sourceId);
    handledAdded.add(id);
  }

  // 2b. Content-based splits: one deleted topic's content appears across multiple new topics
  for (const delId of trulyDeletedIds) {
    if (handledDeleted.has(delId)) continue;
    const del = oldT.get(delId);
    if (!del) continue;
    const delChunk = norm(del.originalChunk);
    if (!delChunk || delChunk.length < 20) continue;

    const pieces = [...trulyAddedIds].filter(addId => {
      if (handledAdded.has(addId)) return false;
      const addTopic = newT.get(addId);
      if (!addTopic) return false;
      const addChunk = norm(addTopic.originalChunk);
      return addChunk && addChunk.length >= 10 && delChunk.includes(addChunk);
    });

    if (pieces.length >= 2) {
      const coveredLen = pieces.reduce((sum, id) => sum + norm(newT.get(id).originalChunk).length, 0);
      if (coveredLen >= delChunk.length * 0.5) {
        for (const pieceId of pieces) {
          const piece = newT.get(pieceId);
          actions.push({
            kind: 'split',
            topicId: delId,
            newId: pieceId,
            description: `${delId}${del.name ? ` ("${del.name}")` : ''} was split — new piece ${pieceId}${piece?.name ? ` ("${piece.name}")` : ''}`,
          });
          handledAdded.add(pieceId);
        }
        matchedSplitSources.add(delId);
        handledDeleted.add(delId);
      }
    }
  }

  // ── Phase 3: Detect merges ──

  // 3a. Content-based merges: multiple deleted topics' content found inside one new topic
  for (const addId of trulyAddedIds) {
    if (handledAdded.has(addId)) continue;
    const addTopic = newT.get(addId);
    if (!addTopic) continue;
    const addChunk = norm(addTopic.originalChunk);
    if (!addChunk || addChunk.length < 20) continue;

    const sources = [...trulyDeletedIds].filter(delId => {
      if (handledDeleted.has(delId)) return false;
      const del = oldT.get(delId);
      if (!del) return false;
      const delChunk = norm(del.originalChunk);
      return delChunk && delChunk.length >= 10 && addChunk.includes(delChunk);
    });

    if (sources.length >= 1) {
      for (const srcId of sources) {
        const src = oldT.get(srcId);
        actions.push({
          kind: 'merge',
          sourceId: srcId,
          targetId: addId,
          description: `${srcId}${src?.name ? ` ("${src.name}")` : ''} was merged into ${addId}${addTopic.name ? ` ("${addTopic.name}")` : ''}`,
        });
        matchedMergeTargets.add(addId);
        handledDeleted.add(srcId);
      }
      handledAdded.add(addId);
    }
  }

  // 3b. Heuristic merges: deleted topic + a matched sibling that grew in content
  for (const delId of trulyDeletedIds) {
    if (handledDeleted.has(delId)) continue;
    const del = oldT.get(delId);
    if (!del) continue;
    let target = null;

    for (const [nid, n] of newT) {
      if (matchedMergeTargets.has(nid)) continue;
      // Find the corresponding old topic for this new topic
      const oldId = newToOldMap.get(nid);
      if (!oldId) continue;
      const old = oldT.get(oldId);
      if (!old) continue;
      // Must share a segment with the deleted topic (in old or new plan)
      if (n.segmentId !== del.segmentId && old.segmentId !== del.segmentId) continue;
      const gainedObj = n.objectivesCount >= old.objectivesCount;
      const gainedMedia = n.mediaCount >= old.mediaCount;
      const grew = (n.objectivesCount + n.mediaCount) > (old.objectivesCount + old.mediaCount);
      const chunkGrew = n.originalChunk.length + n.modifiedChunk.length > old.originalChunk.length + old.modifiedChunk.length;
      if (gainedObj && gainedMedia && (grew || chunkGrew)) { target = nid; break; }
    }

    if (target) {
      actions.push({
        kind: 'merge',
        sourceId: delId,
        targetId: target,
        description: `${delId}${del.name ? ` ("${del.name}")` : ''} was merged into ${target}${newT.get(target)?.name ? ` ("${newT.get(target).name}")` : ''}`,
      });
      matchedMergeTargets.add(target);
      handledDeleted.add(delId);
    }
  }

  // ── Phase 4: Remaining truly deleted topics ──
  for (const delId of trulyDeletedIds) {
    if (handledDeleted.has(delId)) continue;
    const del = oldT.get(delId);
    actions.push({
      kind: 'delete',
      topicId: delId,
      description: `${delId}${del?.name ? ` ("${del.name}")` : ''} was deleted`,
    });
  }

  // ── Phase 5: Remaining truly added topics ──
  for (const addId of trulyAddedIds) {
    if (handledAdded.has(addId)) continue;
    const n = newT.get(addId);
    actions.push({
      kind: 'add',
      topicId: addId,
      description: `${addId}${n?.name ? ` ("${n.name}")` : ''} was added`,
    });
  }

  // ── Phase 6: Compare matched pairs for edits / renames / moves ──
  for (const [oldId, newId] of oldToNewMap) {
    const o = oldT.get(oldId);
    const n = newT.get(newId);
    if (!o || !n) continue;

    const isMergeTarget = matchedMergeTargets.has(newId);

    if (o.name !== n.name) {
      actions.push({
        kind: 'rename',
        topicId: newId,
        description: `${newId} renamed — "${o.name}" → "${n.name}"`,
      });
    }
    if (o.type !== n.type) {
      actions.push({
        kind: 'edit',
        topicId: newId,
        description: `${newId} type changed — ${o.type || '—'} → ${n.type || '—'}`,
      });
    }
    if (o.segmentId !== n.segmentId) {
      actions.push({
        kind: 'edit',
        topicId: newId,
        description: `${newId} moved from segment ${o.segmentId} to ${n.segmentId}`,
      });
    }
    if (!isMergeTarget && !matchedSplitSources.has(oldId)) {
      if (o.originalChunk !== n.originalChunk) {
        actions.push({ kind: 'edit', topicId: newId, description: `${newId} original chunk edited` });
      }
      if (o.modifiedChunk !== n.modifiedChunk) {
        actions.push({ kind: 'edit', topicId: newId, description: `${newId} modified chunk edited` });
      }
      if (o.objectivesCount !== n.objectivesCount) {
        actions.push({
          kind: 'edit',
          topicId: newId,
          description: `${newId} objectives ${o.objectivesCount} → ${n.objectivesCount}`,
        });
      }
      if (o.mediaCount !== n.mediaCount) {
        actions.push({
          kind: 'edit',
          topicId: newId,
          description: `${newId} media ${o.mediaCount} → ${n.mediaCount}`,
        });
      }
    }
  }

  // ── Phase 7: Module / segment level add/delete/rename ──
  for (const [id, m] of newM) {
    if (!oldM.has(id)) actions.push({ kind: 'add', topicId: id, description: `Module ${id}${m.name ? ` ("${m.name}")` : ''} was added` });
    else if (oldM.get(id).name !== m.name) actions.push({ kind: 'rename', topicId: id, description: `Module ${id} renamed — "${oldM.get(id).name}" → "${m.name}"` });
  }
  for (const [id, m] of oldM) if (!newM.has(id)) actions.push({ kind: 'delete', topicId: id, description: `Module ${id}${m.name ? ` ("${m.name}")` : ''} was deleted` });

  for (const [id, s] of newS) {
    if (!oldS.has(id)) actions.push({ kind: 'add', topicId: id, description: `Segment ${id}${s.name ? ` ("${s.name}")` : ''} was added` });
    else {
      const o = oldS.get(id);
      if (o.name !== s.name) actions.push({ kind: 'rename', topicId: id, description: `Segment ${id} renamed — "${o.name}" → "${s.name}"` });
      if (o.moduleId !== s.moduleId) actions.push({ kind: 'edit', topicId: id, description: `Segment ${id} moved — ${o.moduleId} → ${s.moduleId}` });
    }
  }
  for (const [id, s] of oldS) if (!newS.has(id)) actions.push({ kind: 'delete', topicId: id, description: `Segment ${id}${s.name ? ` ("${s.name}")` : ''} was deleted` });

  return actions;
}
