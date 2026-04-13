/**
 * Full client-side validation per spec Section 9.
 * Returns { passed, error_count, warning_count, errors[], warnings[], stats{} }
 */
export function validatePlan(data) {
  const errors = [];
  const warnings = [];

  const err = (path, field, message) =>
    errors.push({ path, field, message, severity: 'error' });
  const warn = (path, field, message) =>
    warnings.push({ path, field, message, severity: 'warning' });

  /* ── 9.1 Root-level ─────────────────────────────── */
  const REQ_ROOT = [
    'plan_id', 'draft_version', 'pipeline_stage', 'chapter_id', 'chapter_name',
    'subject', 'grade', 'level', 'textbook', 'unit_number', 'unit_title',
    'textbook_url', 'generated_at',
  ];
  REQ_ROOT.forEach(f => {
    if (data[f] === undefined || data[f] === null || data[f] === '') {
      err('root', f, `Required field "${f}" is missing or empty`);
    }
  });

  if (data.pipeline_stage && data.pipeline_stage !== 'draft') {
    err('root', 'pipeline_stage', `Must be "draft", got "${data.pipeline_stage}"`);
  }
  if (data.subject && !['science', 'mathematics'].includes(data.subject)) {
    err('root', 'subject', `Must be "science" or "mathematics", got "${data.subject}"`);
  }
  if (data.grade != null) {
    if (data.subject === 'science' && (data.grade < 5 || data.grade > 10)) {
      warn('root', 'grade', `Science grade should be 5–10, got ${data.grade}`);
    }
    if (data.subject === 'mathematics' && (data.grade < 3 || data.grade > 12)) {
      warn('root', 'grade', `Mathematics grade should be 3–12, got ${data.grade}`);
    }
  }

  /* ── Collect all topic IDs (for cross-ref checks) ── */
  const allTopicIds = new Set();
  (data.modules || []).forEach(m =>
    (m.segments || []).forEach(s =>
      (s.topics || []).forEach(t => { if (t.topic_id) allTopicIds.add(t.topic_id); })
    )
  );

  /* ── 9.2 Example plan ───────────────────────────── */
  if (!data.modules || data.modules.length === 0) {
    err('root', 'modules', 'Plan must have at least 1 module');
  }

  const exampleIds = new Set();
  (data.example_plan || []).forEach((ex, ei) => {
    const path = `example_plan[${ei}]`;
    ['example_id', 'example_theme', 'example_description', 'scope_level', 'supported_topic_ids'].forEach(f => {
      if (!ex[f] && ex[f] !== 0) err(path, f, `Required field "${f}" missing`);
    });
    if (ex.scope_level && !['chapter', 'module', 'segment', 'topic'].includes(ex.scope_level)) {
      err(path, 'scope_level', `Must be chapter/module/segment/topic, got "${ex.scope_level}"`);
    }
    if (ex.example_id) {
      if (exampleIds.has(ex.example_id)) err(path, 'example_id', `Duplicate example_id "${ex.example_id}"`);
      exampleIds.add(ex.example_id);
    }
    if (ex.example_description && ex.example_description.length < 20) {
      warn(path, 'example_description', 'Should be at least 20 characters');
    }
    (ex.supported_topic_ids || []).forEach(tid => {
      if (!allTopicIds.has(tid)) {
        err(path, 'supported_topic_ids', `Topic ID "${tid}" does not exist in the plan`);
      }
    });
  });

  /* ── 9.3-9.9 Hierarchy ──────────────────────────── */
  const SCIENCE_TYPES = new Set(['CONCEPT', 'EXPERIMENT', 'PRACTICE', 'INTERACTIVE', 'REVIEW']);
  const MATH_TYPES = new Set(['CONCEPT', 'WORKED_EXAMPLE', 'APPLICATION', 'PRACTICE', 'INTERACTIVE', 'REVIEW']);
  const BLOOM_LEVELS = new Set(['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create']);
  const MEDIA_TYPES = new Set(['image', 'video', '2d_tool', '3d_tool', 'simulation']);
  const IMG_CATS = new Set(['textbook_reference', 'example_based']);

  const allObjIds = new Set();
  const allMediaIds = new Set();
  const seenModIds = new Set();
  const seenSegIds = new Set();
  const seenTopicIds = new Set();

  let mNum = 0, sNum = 0, tNum = 0;

  (data.modules || []).forEach((mod, mi) => {
    mNum++;
    const modPath = `modules[${mi}]`;

    if (!mod.module_id) err(modPath, 'module_id', 'Required');
    if (!mod.module_name || mod.module_name.trim() === '') err(modPath, 'module_name', 'Required');
    if (mod.module_id) {
      if (seenModIds.has(mod.module_id)) err(modPath, 'module_id', `Duplicate module_id "${mod.module_id}"`);
      seenModIds.add(mod.module_id);
      if (!/^M\d+$/.test(mod.module_id)) err(modPath, 'module_id', `Must match M{n}, got "${mod.module_id}"`);
      else if (mod.module_id !== `M${mNum}`) err(modPath, 'module_id', `Expected M${mNum}, got "${mod.module_id}"`);
    }
    if (!mod.segments || mod.segments.length === 0) {
      err(modPath, 'segments', 'Module must have at least 1 segment');
    }

    (mod.segments || []).forEach((seg, si) => {
      sNum++;
      const segPath = `${modPath}.segments[${si}]`;

      if (!seg.segment_id) err(segPath, 'segment_id', 'Required');
      if (!seg.segment_name || seg.segment_name.trim() === '') err(segPath, 'segment_name', 'Required');
      if (seg.segment_id) {
        if (seenSegIds.has(seg.segment_id)) err(segPath, 'segment_id', `Duplicate "${seg.segment_id}"`);
        seenSegIds.add(seg.segment_id);
        if (!/^M\d+\.S\d+$/.test(seg.segment_id)) err(segPath, 'segment_id', `Must match M{n}.S{n}`);
        else if (seg.segment_id !== `M${mNum}.S${sNum}`) {
          err(segPath, 'segment_id', `Expected M${mNum}.S${sNum}, got "${seg.segment_id}"`);
        }
      }
      if (!seg.topics || seg.topics.length === 0) {
        err(segPath, 'topics', 'Segment must have at least 1 topic');
      }

      (seg.topics || []).forEach((topic, ti) => {
        tNum++;
        const tp = `${segPath}.topics[${ti}]`;

        ['topic_id', 'topic_name', 'topic_type', 'original_chunk', 'modified_chunk'].forEach(f => {
          if (topic[f] === undefined || topic[f] === null || topic[f] === '') {
            if (f !== 'original_chunk') err(tp, f, `Required field "${f}" missing`);
            else warn(tp, f, 'original_chunk is empty');
          }
        });
        if (topic.learning_objectives === undefined) err(tp, 'learning_objectives', 'Required');
        if (topic.media_intent === undefined) err(tp, 'media_intent', 'Required');

        if (topic.topic_id) {
          if (seenTopicIds.has(topic.topic_id)) err(tp, 'topic_id', `Duplicate "${topic.topic_id}"`);
          seenTopicIds.add(topic.topic_id);
          if (!/^M\d+\.S\d+\.T\d+$/.test(topic.topic_id)) err(tp, 'topic_id', `Must match M{n}.S{n}.T{n}`);
          else if (topic.topic_id !== `M${mNum}.S${sNum}.T${tNum}`) {
            err(tp, 'topic_id', `Expected M${mNum}.S${sNum}.T${tNum}, got "${topic.topic_id}"`);
          }
        }
        if (topic.topic_type) {
          const valid = data.subject === 'mathematics' ? MATH_TYPES : SCIENCE_TYPES;
          if (!valid.has(topic.topic_type)) {
            err(tp, 'topic_type', `Invalid "${topic.topic_type}" for subject "${data.subject}"`);
          }
        }

        // Content checks
        if (topic.original_chunk && topic.original_chunk.length < 20 && topic.topic_type !== 'REVIEW') {
          warn(tp, 'original_chunk', 'Should be at least 20 characters');
        }
        if (!topic.modified_chunk || topic.modified_chunk.length < 50) {
          warn(tp, 'modified_chunk', 'Should be at least 50 characters');
        }
        if (topic.modified_chunk && topic.original_chunk &&
            topic.modified_chunk.length < topic.original_chunk.length) {
          warn(tp, 'modified_chunk', 'Modified chunk should be longer than the original chunk');
        }
        if (topic.modified_chunk) {
          ['HOOK', 'RECALL', 'CORE'].forEach(marker => {
            if (!topic.modified_chunk.includes(marker)) {
              warn(tp, 'modified_chunk', `Missing section marker "${marker}"`);
            }
          });
        }

        // Objectives
        if (!topic.learning_objectives || topic.learning_objectives.length === 0) {
          err(tp, 'learning_objectives', 'Topic must have at least 1 learning objective');
        }
        const topicObjIds = new Set();
        let oNum = 0;
        (topic.learning_objectives || []).forEach((obj, oi) => {
          oNum++;
          const op = `${tp}.learning_objectives[${oi}]`;
          ['objective_id', 'objective_text', 'bloom_level'].forEach(f => {
            if (!obj[f]) err(op, f, `Required field "${f}" missing`);
          });
          if (obj.objective_id) {
            if (allObjIds.has(obj.objective_id)) err(op, 'objective_id', `Duplicate "${obj.objective_id}"`);
            allObjIds.add(obj.objective_id);
            topicObjIds.add(obj.objective_id);
            if (obj.objective_id !== `${topic.topic_id}.O${oNum}`) {
              err(op, 'objective_id', `Expected ${topic.topic_id}.O${oNum}, got "${obj.objective_id}"`);
            }
          }
          if (obj.bloom_level && !BLOOM_LEVELS.has(obj.bloom_level)) {
            err(op, 'bloom_level', `Invalid bloom_level "${obj.bloom_level}"`);
          }
          if (obj.objective_text && obj.objective_text.length < 10) {
            warn(op, 'objective_text', 'Should be at least 10 characters');
          }
        });

        // Media intent
        const actualTypes = new Set();
        let miNum = 0;
        (topic.media_intent || []).forEach((mi, mii) => {
          miNum++;
          const mp = `${tp}.media_intent[${mii}]`;
          ['media_id', 'type', 'priority', 'title', 'intent_description', 'pedagogical_purpose'].forEach(f => {
            if (!mi[f] && mi[f] !== 0) err(mp, f, `Required field "${f}" missing`);
          });
          if (mi.media_id) {
            if (allMediaIds.has(mi.media_id)) err(mp, 'media_id', `Duplicate "${mi.media_id}"`);
            allMediaIds.add(mi.media_id);
            if (mi.media_id !== `${topic.topic_id}.MI${miNum}`) {
              err(mp, 'media_id', `Expected ${topic.topic_id}.MI${miNum}, got "${mi.media_id}"`);
            }
          }
          if (mi.type) {
            if (!MEDIA_TYPES.has(mi.type)) err(mp, 'type', `Invalid type "${mi.type}"`);
            else actualTypes.add(mi.type);
          }
          if (mi.priority !== undefined && ![1, 2, 3].includes(Number(mi.priority))) {
            err(mp, 'priority', `Must be 1, 2, or 3`);
          }
          if (mi.type === 'image') {
            if (!mi.image_category) err(mp, 'image_category', 'Required when type is "image"');
            else if (!IMG_CATS.has(mi.image_category)) err(mp, 'image_category', `Invalid "${mi.image_category}"`);
          } else if (mi.image_category) {
            warn(mp, 'image_category', 'Should not be present for non-image types');
          }
          if (mi.linked_objective_id && mi.linked_objective_id !== '') {
            if (!topicObjIds.has(mi.linked_objective_id)) {
              err(mp, 'linked_objective_id', `References non-existent objective "${mi.linked_objective_id}"`);
            }
          }
          if (mi.intent_description && mi.intent_description.length < 20) {
            warn(mp, 'intent_description', 'Should be at least 20 characters');
          }
        });

        // available_media_types cross-ref check
        if (topic.available_media_types !== undefined) {
          const declared = new Set(topic.available_media_types);
          if (declared.size !== actualTypes.size || [...actualTypes].some(t => !declared.has(t))) {
            err(tp, 'available_media_types',
              `Declared [${[...declared].join(', ')}] but actual types are [${[...actualTypes].join(', ')}]`);
          }
        }
      });
    });
  });

  /* ── Stats ──────────────────────────────────────── */
  const topicTypeDist = {}, bloomDist = {}, mediaTypeDist = {}, priorityDist = {};
  let totalObjs = 0, totalMedia = 0;
  (data.modules || []).forEach(m =>
    (m.segments || []).forEach(s =>
      (s.topics || []).forEach(t => {
        topicTypeDist[t.topic_type] = (topicTypeDist[t.topic_type] || 0) + 1;
        (t.learning_objectives || []).forEach(o => {
          totalObjs++;
          if (o.bloom_level) bloomDist[o.bloom_level] = (bloomDist[o.bloom_level] || 0) + 1;
        });
        (t.media_intent || []).forEach(mi => {
          totalMedia++;
          if (mi.type) mediaTypeDist[mi.type] = (mediaTypeDist[mi.type] || 0) + 1;
          if (mi.priority) priorityDist[mi.priority] = (priorityDist[mi.priority] || 0) + 1;
        });
      })
    )
  );

  return {
    passed: errors.length === 0,
    error_count: errors.length,
    warning_count: warnings.length,
    errors,
    warnings,
    stats: {
      modules: seenModIds.size,
      segments: seenSegIds.size,
      topics: seenTopicIds.size,
      objectives: totalObjs,
      media_items: totalMedia,
      examples: (data.example_plan || []).length,
      topic_type_distribution: topicTypeDist,
      bloom_distribution: bloomDist,
      media_type_distribution: mediaTypeDist,
      priority_distribution: priorityDist,
    },
  };
}
