/**
 * Resequence all IDs in the draft plan per spec Section 6.
 * - Module: M{n}
 * - Segment: M{n}.S{n} — S is globally sequential
 * - Topic: M{n}.S{n}.T{n} — T is globally sequential
 * - Objective: {topic_id}.O{n} — resets per topic
 * - Media: {topic_id}.MI{n} — resets per topic
 * - Example: EX{n}
 *
 * Returns { newData, idMap } where idMap is old_id → new_id.
 */
export function resequenceAll(data) {
  let mNum = 0, sNum = 0, tNum = 0;
  const idMap = {};

  // Pass 1: assign new IDs and build idMap
  const newModules = (data.modules || []).map(mod => {
    mNum++;
    const newModId = `M${mNum}`;
    idMap[mod.module_id] = newModId;

    const newSegments = (mod.segments || []).map(seg => {
      sNum++;
      const newSegId = `M${mNum}.S${sNum}`;
      idMap[seg.segment_id] = newSegId;

      const newTopics = (seg.topics || []).map(topic => {
        tNum++;
        const newTopicId = `M${mNum}.S${sNum}.T${tNum}`;
        idMap[topic.topic_id] = newTopicId;

        let oNum = 0;
        const newObjs = (topic.learning_objectives || []).map(obj => {
          oNum++;
          const newObjId = `${newTopicId}.O${oNum}`;
          if (obj.objective_id) idMap[obj.objective_id] = newObjId;
          return { ...obj, objective_id: newObjId };
        });

        let miNum = 0;
        const newMedia = (topic.media_intent || []).map(mi => {
          miNum++;
          const newMiId = `${newTopicId}.MI${miNum}`;
          if (mi.media_id) idMap[mi.media_id] = newMiId;
          return { ...mi, media_id: newMiId };
        });

        const available_media_types = [...new Set(newMedia.map(m => m.type).filter(Boolean))];

        return {
          ...topic,
          topic_id: newTopicId,
          learning_objectives: newObjs,
          media_intent: newMedia,
          available_media_types,
        };
      });

      return { ...seg, segment_id: newSegId, topics: newTopics };
    });

    return { ...mod, module_id: newModId, segments: newSegments };
  });

  // Pass 2: update cross-references using idMap
  const modulesFixed = newModules.map(mod => ({
    ...mod,
    segments: (mod.segments || []).map(seg => ({
      ...seg,
      topics: (seg.topics || []).map(topic => ({
        ...topic,
        media_intent: (topic.media_intent || []).map(mi => ({
          ...mi,
          linked_objective_id:
            mi.linked_objective_id
              ? (idMap[mi.linked_objective_id] || mi.linked_objective_id)
              : (mi.linked_objective_id ?? ''),
        })),
      })),
    })),
  }));

  // Resequence examples and remap topic IDs in supported_topic_ids
  let exNum = 0;
  const newExamples = (data.example_plan || []).map(ex => {
    exNum++;
    const newExId = `EX${exNum}`;
    if (ex.example_id) idMap[ex.example_id] = newExId;
    const supported_topic_ids = [...new Set(
      (ex.supported_topic_ids || []).map(tid => idMap[tid] || tid)
    )];
    return { ...ex, example_id: newExId, supported_topic_ids };
  });

  return {
    newData: { ...data, modules: modulesFixed, example_plan: newExamples },
    idMap,
  };
}

/** Derive the next available example ID */
export function nextExampleId(data) {
  return `EX${(data.example_plan || []).length + 1}`;
}

/** Get flat list of all topics with location info */
export function flatTopics(data) {
  const list = [];
  (data.modules || []).forEach(mod =>
    (mod.segments || []).forEach(seg =>
      (seg.topics || []).forEach(topic =>
        list.push({ topic, seg, mod })
      )
    )
  );
  return list;
}

/** Get flat list of all segments with module info */
export function flatSegments(data) {
  const list = [];
  (data.modules || []).forEach(mod =>
    (mod.segments || []).forEach(seg =>
      list.push({ seg, mod })
    )
  );
  return list;
}
