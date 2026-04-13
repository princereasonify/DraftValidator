import { useCallback, useEffect, useReducer, useState } from 'react';
import rawData from '../data/draftPlan.json';
import { resequenceAll } from '../utils/resequencing';
import { validatePlan } from '../utils/validation';
import SplitTopicModal from './SplitTopicModal';
import MergeTopicModal from './MergeTopicModal';
import ObjectiveModal from './ObjectiveModal';
import MediaModal from './MediaModal';
import MoveModal from './MoveModal';
import AddItemModal from './AddItemModal';
import ValidationPanel from './ValidationPanel';
import VersionHistoryPanel from './VersionHistoryPanel';
import './DraftPlanView.css';

/* ── Constants ───────────────────────────────────────── */
const TOPIC_TYPES_SCIENCE = ['CONCEPT', 'EXPERIMENT', 'PRACTICE', 'INTERACTIVE', 'REVIEW'];
const TOPIC_TYPES_MATH = ['CONCEPT', 'WORKED_EXAMPLE', 'APPLICATION', 'PRACTICE', 'INTERACTIVE', 'REVIEW'];
const BLOOM_COLORS = {
  remember:   { bg: '#FEF3C7', text: '#92400E' },
  understand: { bg: '#E0F2FE', text: '#0C4A6E' },
  apply:      { bg: '#D1FAE5', text: '#065F46' },
  analyze:    { bg: '#EDE9FE', text: '#4C1D95' },
  evaluate:   { bg: '#FCE7F3', text: '#831843' },
  create:     { bg: '#FFF7ED', text: '#7C2D12' },
};

/* ── Helper: resequence + create version snapshot ─────── */
function withResequence(state, summary, createSnapshot = true) {
  const { newData } = resequenceAll(state);
  const versions = createSnapshot
    ? [...(state._versions || []).slice(-19), {
        version: (state._versions?.length || 0) + 1,
        timestamp: new Date().toISOString(),
        summary,
        data: JSON.parse(JSON.stringify(newData)),
        stats: (() => {
          let m = 0, s = 0, t = 0;
          (newData.modules || []).forEach(mod => { m++; (mod.segments || []).forEach(seg => { s++; (seg.topics || []).forEach(() => t++); }); });
          return { modules: m, segments: s, topics: t };
        })(),
      }]
    : (state._versions || []);
  return { ...newData, _versions: versions };
}

/* ── Reducer ─────────────────────────────────────────── */
function reducer(state, action) {
  switch (action.type) {

    /* ─ Text field edits (no resequence needed) ─ */
    case 'UPDATE_MODULE':
      return { ...state, modules: state.modules.map(m => m.module_id === action.moduleId ? { ...m, ...action.patch } : m) };

    case 'UPDATE_SEGMENT':
      return { ...state, modules: state.modules.map(m => ({ ...m, segments: (m.segments || []).map(s => s.segment_id === action.segmentId ? { ...s, ...action.patch } : s) })) };

    case 'UPDATE_TOPIC':
      return { ...state, modules: state.modules.map(m => ({ ...m, segments: (m.segments || []).map(s => ({ ...s, topics: (s.topics || []).map(t => t.topic_id === action.topicId ? { ...t, ...action.patch } : t) })) })) };

    case 'UPDATE_EXAMPLE':
      return { ...state, example_plan: (state.example_plan || []).map(ex => ex.example_id === action.exId ? { ...ex, ...action.patch } : ex) };

    /* ─ Add operations (resequence) ─ */
    case 'ADD_MODULE': {
      const newMod = { module_id: `M${(state.modules || []).length + 1}`, module_name: action.name, segments: [] };
      const next = { ...state, modules: [...(state.modules || []), newMod] };
      return withResequence(next, `Added module "${action.name}"`);
    }

    case 'ADD_SEGMENT': {
      const modules = (state.modules || []).map(m => {
        if (m.module_id !== action.moduleId) return m;
        const newSeg = { segment_id: `${m.module_id}.S${(m.segments || []).length + 1}`, segment_name: action.name, topics: [] };
        return { ...m, segments: [...(m.segments || []), newSeg] };
      });
      return withResequence({ ...state, modules }, `Added segment "${action.name}" to ${action.moduleId}`);
    }

    case 'ADD_TOPIC': {
      const modules = (state.modules || []).map(m => ({ ...m, segments: (m.segments || []).map(s => {
        if (s.segment_id !== action.segmentId) return s;
        const newTopic = {
          topic_id: `${s.segment_id}.T${(s.topics || []).length + 1}`,
          topic_name: action.topic_name,
          topic_type: action.topic_type || 'CONCEPT',
          learning_objectives: [],
          original_chunk: '',
          modified_chunk: '',
          media_intent: [],
          available_media_types: [],
        };
        return { ...s, topics: [...(s.topics || []), newTopic] };
      }) }));
      return withResequence({ ...state, modules }, `Added topic "${action.topic_name}"`);
    }

    case 'ADD_EXAMPLE': {
      const newEx = {
        example_id: `EX${(state.example_plan || []).length + 1}`,
        example_theme: action.example_theme,
        example_description: action.example_description,
        scope_level: action.scope_level || 'chapter',
        supported_topic_ids: action.supported_topic_ids || [],
      };
      const next = { ...state, example_plan: [...(state.example_plan || []), newEx] };
      const { newData } = resequenceAll(next);
      return { ...newData, _versions: state._versions || [] };
    }

    /* ─ Objective operations ─ */
    case 'ADD_OBJECTIVE': {
      const modules = (state.modules || []).map(m => ({ ...m, segments: (m.segments || []).map(s => ({ ...s, topics: (s.topics || []).map(t => {
        if (t.topic_id !== action.topicId) return t;
        const objs = [...(t.learning_objectives || [])];
        const newObj = {
          objective_id: `${t.topic_id}.O${objs.length + 1}`,
          objective_text: action.objective_text,
          bloom_level: action.bloom_level,
        };
        return { ...t, learning_objectives: [...objs, newObj] };
      }) })) }));
      return { ...state, modules };
    }

    case 'EDIT_OBJECTIVE': {
      const modules = (state.modules || []).map(m => ({ ...m, segments: (m.segments || []).map(s => ({ ...s, topics: (s.topics || []).map(t => {
        if (t.topic_id !== action.topicId) return t;
        return { ...t, learning_objectives: (t.learning_objectives || []).map(o => o.objective_id === action.objectiveId ? { ...o, ...action.patch } : o) };
      }) })) }));
      return { ...state, modules };
    }

    case 'REMOVE_OBJECTIVE': {
      const modules = (state.modules || []).map(m => ({ ...m, segments: (m.segments || []).map(s => ({ ...s, topics: (s.topics || []).map(t => {
        if (t.topic_id !== action.topicId) return t;
        const objs = (t.learning_objectives || []).filter(o => o.objective_id !== action.objectiveId);
        // Resequence objectives within topic and fix media links
        let oNum = 0;
        const idMap = {};
        const reseqObjs = objs.map(o => {
          oNum++;
          const newId = `${t.topic_id}.O${oNum}`;
          idMap[o.objective_id] = newId;
          return { ...o, objective_id: newId };
        });
        const reseqMedia = (t.media_intent || []).map(mi => ({
          ...mi,
          linked_objective_id: mi.linked_objective_id ? (idMap[mi.linked_objective_id] || '') : '',
        }));
        return { ...t, learning_objectives: reseqObjs, media_intent: reseqMedia };
      }) })) }));
      return { ...state, modules };
    }

    /* ─ Media operations ─ */
    case 'ADD_MEDIA': {
      const modules = (state.modules || []).map(m => ({ ...m, segments: (m.segments || []).map(s => ({ ...s, topics: (s.topics || []).map(t => {
        if (t.topic_id !== action.topicId) return t;
        const media = [...(t.media_intent || [])];
        const newMi = { ...action.media, media_id: `${t.topic_id}.MI${media.length + 1}` };
        const updated = [...media, newMi];
        return { ...t, media_intent: updated, available_media_types: [...new Set(updated.map(m => m.type))] };
      }) })) }));
      return { ...state, modules };
    }

    case 'EDIT_MEDIA': {
      const modules = (state.modules || []).map(m => ({ ...m, segments: (m.segments || []).map(s => ({ ...s, topics: (s.topics || []).map(t => {
        if (t.topic_id !== action.topicId) return t;
        const updated = (t.media_intent || []).map(mi => mi.media_id === action.mediaId ? { ...mi, ...action.patch } : mi);
        return { ...t, media_intent: updated, available_media_types: [...new Set(updated.map(m => m.type))] };
      }) })) }));
      return { ...state, modules };
    }

    case 'REMOVE_MEDIA': {
      const modules = (state.modules || []).map(m => ({ ...m, segments: (m.segments || []).map(s => ({ ...s, topics: (s.topics || []).map(t => {
        if (t.topic_id !== action.topicId) return t;
        const updated = (t.media_intent || []).filter(mi => mi.media_id !== action.mediaId);
        // Resequence media IDs within topic
        let miNum = 0;
        const reseq = updated.map(mi => { miNum++; return { ...mi, media_id: `${t.topic_id}.MI${miNum}` }; });
        return { ...t, media_intent: reseq, available_media_types: [...new Set(reseq.map(m => m.type))] };
      }) })) }));
      return { ...state, modules };
    }

    /* ─ Delete operations (resequence) ─ */
    case 'DELETE_TOPIC': {
      const modules = (state.modules || []).map(m => ({ ...m, segments: (m.segments || []).map(s => ({ ...s, topics: (s.topics || []).filter(t => t.topic_id !== action.topicId) })) }));
      const pruned = pruneEmpty({ ...state, modules });
      // Remove from example supported_topic_ids
      const example_plan = (pruned.example_plan || []).map(ex => ({
        ...ex, supported_topic_ids: (ex.supported_topic_ids || []).filter(id => id !== action.topicId),
      })).filter(ex => (ex.supported_topic_ids || []).length > 0 || true); // keep examples even if empty
      return withResequence({ ...pruned, example_plan }, `Deleted topic "${action.topicId}"`);
    }

    case 'DELETE_SEGMENT': {
      const topicIds = new Set();
      (state.modules || []).forEach(m => (m.segments || []).forEach(s => {
        if (s.segment_id === action.segmentId) (s.topics || []).forEach(t => topicIds.add(t.topic_id));
      }));
      const modules = (state.modules || []).map(m => ({ ...m, segments: (m.segments || []).filter(s => s.segment_id !== action.segmentId) }));
      const pruned = pruneEmpty({ ...state, modules });
      const example_plan = (pruned.example_plan || []).map(ex => ({ ...ex, supported_topic_ids: (ex.supported_topic_ids || []).filter(id => !topicIds.has(id)) }));
      return withResequence({ ...pruned, example_plan }, `Deleted segment "${action.segmentId}"`);
    }

    case 'DELETE_MODULE': {
      const topicIds = new Set();
      (state.modules || []).forEach(m => {
        if (m.module_id === action.moduleId) (m.segments || []).forEach(s => (s.topics || []).forEach(t => topicIds.add(t.topic_id)));
      });
      const modules = (state.modules || []).filter(m => m.module_id !== action.moduleId);
      const example_plan = (state.example_plan || []).map(ex => ({ ...ex, supported_topic_ids: (ex.supported_topic_ids || []).filter(id => !topicIds.has(id)) }));
      return withResequence({ ...state, modules, example_plan }, `Deleted module "${action.moduleId}"`);
    }

    case 'DELETE_EXAMPLE': {
      const example_plan = (state.example_plan || []).filter(ex => ex.example_id !== action.exId);
      const { newData } = resequenceAll({ ...state, example_plan });
      return { ...newData, _versions: state._versions || [] };
    }

    /* ─ Reorder (resequence) ─ */
    case 'REORDER_TOPICS': {
      const { segmentId, fromIdx, toIdx } = action;
      const modules = (state.modules || []).map(m => ({ ...m, segments: (m.segments || []).map(s => {
        if (s.segment_id !== segmentId) return s;
        const topics = [...(s.topics || [])];
        const [moved] = topics.splice(fromIdx, 1);
        topics.splice(toIdx, 0, moved);
        return { ...s, topics };
      }) }));
      return withResequence({ ...state, modules }, `Reordered topics in ${segmentId}`);
    }

    case 'MOVE_TOPIC_UP':
    case 'MOVE_TOPIC_DOWN': {
      const dir = action.type === 'MOVE_TOPIC_UP' ? -1 : 1;
      const modules = (state.modules || []).map(m => ({ ...m, segments: (m.segments || []).map(s => {
        const idx = (s.topics || []).findIndex(t => t.topic_id === action.topicId);
        if (idx === -1) return s;
        const next = idx + dir;
        if (next < 0 || next >= s.topics.length) return s;
        const topics = [...s.topics]; [topics[idx], topics[next]] = [topics[next], topics[idx]];
        return { ...s, topics };
      }) }));
      return withResequence({ ...state, modules }, `Moved topic ${action.topicId} ${dir < 0 ? 'up' : 'down'}`);
    }

    case 'MOVE_SEGMENT_UP':
    case 'MOVE_SEGMENT_DOWN': {
      const dir = action.type === 'MOVE_SEGMENT_UP' ? -1 : 1;
      const modules = (state.modules || []).map(m => {
        const idx = (m.segments || []).findIndex(s => s.segment_id === action.segmentId);
        if (idx === -1) return m;
        const next = idx + dir;
        if (next < 0 || next >= m.segments.length) return m;
        const segments = [...m.segments]; [segments[idx], segments[next]] = [segments[next], segments[idx]];
        return { ...m, segments };
      });
      return withResequence({ ...state, modules }, `Moved segment ${action.segmentId} ${dir < 0 ? 'up' : 'down'}`);
    }

    case 'MOVE_MODULE_UP':
    case 'MOVE_MODULE_DOWN': {
      const dir = action.type === 'MOVE_MODULE_UP' ? -1 : 1;
      const idx = (state.modules || []).findIndex(m => m.module_id === action.moduleId);
      if (idx === -1) return state;
      const next = idx + dir;
      if (next < 0 || next >= state.modules.length) return state;
      const modules = [...state.modules]; [modules[idx], modules[next]] = [modules[next], modules[idx]];
      return withResequence({ ...state, modules }, `Moved module ${action.moduleId} ${dir < 0 ? 'up' : 'down'}`);
    }

    /* ─ Move topic to segment ─ */
    case 'MOVE_TOPIC_TO_SEGMENT': {
      let movedTopic = null;
      const withRemoved = { ...state, modules: (state.modules || []).map(m => ({ ...m, segments: (m.segments || []).map(s => {
        const t = (s.topics || []).find(t => t.topic_id === action.topicId);
        if (t) { movedTopic = t; return { ...s, topics: s.topics.filter(t => t.topic_id !== action.topicId) }; }
        return s;
      }) })) };
      if (!movedTopic) return state;
      const withAdded = { ...withRemoved, modules: (withRemoved.modules || []).map(m => ({ ...m, segments: (m.segments || []).map(s => {
        if (s.segment_id !== action.destSegId) return s;
        const topics = action.position === 'start' ? [movedTopic, ...(s.topics || [])] : [...(s.topics || []), movedTopic];
        return { ...s, topics };
      }) })) };
      const pruned = pruneEmpty(withAdded);
      return withResequence(pruned, `Moved topic "${movedTopic.topic_name}" to ${action.destSegId}`);
    }

    /* ─ Move segment to module ─ */
    case 'MOVE_SEGMENT_TO_MODULE': {
      let movedSeg = null;
      const withRemoved = { ...state, modules: (state.modules || []).map(m => ({
        ...m,
        segments: (m.segments || []).filter(s => {
          if (s.segment_id === action.segmentId) { movedSeg = s; return false; }
          return true;
        }),
      })) };
      if (!movedSeg) return state;
      const withAdded = { ...withRemoved, modules: (withRemoved.modules || []).map(m => {
        if (m.module_id !== action.destModId) return m;
        const segments = action.position === 'start' ? [movedSeg, ...(m.segments || [])] : [...(m.segments || []), movedSeg];
        return { ...m, segments };
      }) };
      const pruned = pruneEmpty(withAdded);
      return withResequence(pruned, `Moved segment "${movedSeg.segment_name}" to ${action.destModId}`);
    }

    /* ─ Split topic ─ */
    case 'SPLIT_TOPIC': {
      const { topicId, nameA, nameB, modifiedA, modifiedB, originalA, originalB, objectivesA, objectivesB, mediaA, mediaB } = action;
      const modules = (state.modules || []).map(m => ({ ...m, segments: (m.segments || []).map(s => {
        const idx = (s.topics || []).findIndex(t => t.topic_id === topicId);
        if (idx === -1) return s;
        const topic = s.topics[idx];
        const topicA = { ...topic, topic_name: nameA, modified_chunk: modifiedA, original_chunk: originalA, learning_objectives: objectivesA, media_intent: mediaA, available_media_types: [...new Set(mediaA.map(m => m.type))] };
        const topicB = { ...topic, topic_id: topicId + '_b', topic_name: nameB, modified_chunk: modifiedB, original_chunk: originalB, learning_objectives: objectivesB, media_intent: mediaB, available_media_types: [...new Set(mediaB.map(m => m.type))] };
        const topics = [...s.topics]; topics.splice(idx, 1, topicA, topicB);
        return { ...s, topics };
      }) }));
      return withResequence({ ...state, modules }, `Split "${topicId}" → "${nameA}" + "${nameB}"`);
    }

    /* ─ Merge topics ─ */
    case 'MERGE_TOPICS': {
      const { targetId, sourceId, newName, origMode, modMode, keptObjIds, keptMediaIds } = action;
      let sourceTopic = null;
      (state.modules || []).forEach(m => (m.segments || []).forEach(s => (s.topics || []).forEach(t => { if (t.topic_id === sourceId) sourceTopic = t; })));
      if (!sourceTopic) return state;

      const computeChunk = (mode, aVal, bVal) => {
        if (mode === 'a') return aVal;
        if (mode === 'b') return bVal;
        const a = aVal?.trim(), b = bVal?.trim();
        return a && b ? `${a}\n\n${b}` : (a || b || '');
      };

      const modules = (state.modules || []).map(m => ({ ...m, segments: (m.segments || []).map(s => ({
        ...s,
        topics: (s.topics || []).filter(t => t.topic_id !== sourceId).map(t => {
          if (t.topic_id !== targetId) return t;
          const allObjs = [...(t.learning_objectives || []), ...(sourceTopic.learning_objectives || [])];
          const keptObjs = keptObjIds ? allObjs.filter(o => keptObjIds.includes(o.objective_id)) : allObjs;
          const allMedia = [...(t.media_intent || []), ...(sourceTopic.media_intent || [])];
          const keptMedia = keptMediaIds ? allMedia.filter(mi => keptMediaIds.includes(mi.media_id)) : allMedia;
          return {
            ...t,
            topic_name: newName || t.topic_name,
            original_chunk: computeChunk(origMode, t.original_chunk, sourceTopic.original_chunk),
            modified_chunk: computeChunk(modMode, t.modified_chunk, sourceTopic.modified_chunk),
            learning_objectives: keptObjs,
            media_intent: keptMedia,
            available_media_types: [...new Set(keptMedia.map(m => m.type))],
          };
        }),
      })) }));

      // Update examples
      const example_plan = (state.example_plan || []).map(ex => ({
        ...ex,
        supported_topic_ids: [...new Set((ex.supported_topic_ids || []).map(id => id === sourceId ? targetId : id))],
      }));

      return withResequence({ ...state, modules, example_plan }, `Merged "${sourceId}" into "${targetId}" → "${newName}"`);
    }

    /* ─ Rollback ─ */
    case 'ROLLBACK': {
      return { ...action.data, _versions: state._versions || [] };
    }

    default:
      return state;
  }
}

/* ── Prune empty modules/segments after delete ────────── */
function pruneEmpty(state) {
  const modules = (state.modules || []).map(m => ({
    ...m,
    segments: (m.segments || []).filter(s => (s.topics || []).length > 0),
  })).filter(m => (m.segments || []).length > 0);
  return { ...state, modules };
}

/* ── Helpers ─────────────────────────────────────────── */
function mediaIcon(type) {
  const icons = {
    image: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
    video: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>,
    '2d_tool': <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
    '3d_tool': <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>,
    simulation: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  };
  return icons[type] || icons.image;
}

/* ── InlineEdit ──────────────────────────────────────── */
function InlineEdit({ value, onSave, className = '', multiline = false, placeholder = 'Click to edit…' }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const commit = () => { setEditing(false); if (draft.trim() !== value) onSave(draft.trim()); };
  const cancel = () => { setEditing(false); setDraft(value); };
  const handleKey = (e) => { if (!multiline && e.key === 'Enter') { e.preventDefault(); commit(); } if (e.key === 'Escape') cancel(); };
  if (editing) {
    const props = { value: draft, onChange: e => setDraft(e.target.value), onBlur: commit, onKeyDown: handleKey, className: `inline-edit__input${multiline ? ' inline-edit__input--multiline' : ''}`, autoFocus: true };
    return multiline ? <textarea {...props} rows={Math.max(3, draft.split('\n').length)} /> : <input {...props} type="text" />;
  }
  return (
    <span className={`inline-edit ${className}`} onClick={() => { setEditing(true); setDraft(value); }} title="Click to edit" role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && setEditing(true)}>
      {value || <em className="inline-edit__placeholder">{placeholder}</em>}
    </span>
  );
}

/* ── TopicCard ───────────────────────────────────────── */
function TopicCard({ topic, segmentId, topicIndex, totalTopics, dispatch, data, onSplit, onMerge, onMove, comments, onAddComment }) {
  const [expanded, setExpanded] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [editTypeOpen, setEditTypeOpen] = useState(false);
  const [objModal, setObjModal] = useState(null);   // null | 'add' | {obj} for edit
  const [mediaModal, setMediaModal] = useState(null); // null | 'add' | {mi} for edit
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState(null);

  const subject = data?.subject || 'science';
  const topicTypes = subject === 'mathematics' ? TOPIC_TYPES_MATH : TOPIC_TYPES_SCIENCE;
  const topicComments = (comments || []).filter(c => c.topic_id === topic.topic_id && !c.resolved);
  const resolvedComments = (comments || []).filter(c => c.topic_id === topic.topic_id && c.resolved);

  const handleDragStart = (e) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', JSON.stringify({ topicId: topic.topic_id, segmentId, topicIndex }));
    setDragging(true);
  };

  const submitComment = () => {
    if (!commentText.trim()) return;
    onAddComment({ topic_id: topic.topic_id, text: commentText.trim(), parent_id: replyTo });
    setCommentText('');
    setReplyTo(null);
  };

  return (
    <div className={`topic-card${dragging ? ' topic-card--dragging' : ''}`} draggable onDragStart={handleDragStart} onDragEnd={() => setDragging(false)}>
      {/* Header */}
      <div className="topic-card__header">
        <div className="topic-card__drag-handle" title="Drag to reorder">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="5" r="1" fill="currentColor"/><circle cx="9" cy="12" r="1" fill="currentColor"/><circle cx="9" cy="19" r="1" fill="currentColor"/><circle cx="15" cy="5" r="1" fill="currentColor"/><circle cx="15" cy="12" r="1" fill="currentColor"/><circle cx="15" cy="19" r="1" fill="currentColor"/></svg>
        </div>
        <div className="topic-card__meta">
          <code className="topic-card__id">{topic.topic_id}</code>
          {/* Type dropdown */}
          <div className="topic-type-dropdown">
            <button className={`topic-type-badge topic-type-badge--${(topic.topic_type||'').toLowerCase()}`} onClick={() => setEditTypeOpen(v => !v)}>
              {topic.topic_type} <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            {editTypeOpen && (
              <div className="topic-type-menu">
                {topicTypes.map(tt => (
                  <button key={tt} className={`topic-type-menu__item${tt === topic.topic_type ? ' topic-type-menu__item--active' : ''}`} onClick={() => { dispatch({ type: 'UPDATE_TOPIC', topicId: topic.topic_id, patch: { topic_type: tt } }); setEditTypeOpen(false); }}>
                    {tt}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="topic-card__name-wrap">
          <InlineEdit className="topic-card__name" value={topic.topic_name} onSave={v => dispatch({ type: 'UPDATE_TOPIC', topicId: topic.topic_id, patch: { topic_name: v } })} />
        </div>
        <div className="topic-card__actions">
          <button className="icon-btn icon-btn--muted" onClick={() => dispatch({ type: 'MOVE_TOPIC_UP', topicId: topic.topic_id })} disabled={topicIndex === 0} title="Move up"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15"/></svg></button>
          <button className="icon-btn icon-btn--muted" onClick={() => dispatch({ type: 'MOVE_TOPIC_DOWN', topicId: topic.topic_id })} disabled={topicIndex === totalTopics - 1} title="Move down"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg></button>
          <div className="icon-btn__sep" />
          <button className="icon-btn icon-btn--split" onClick={() => onSplit(topic)} title="Split topic">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="6" cy="18" r="3"/><circle cx="18" cy="6" r="3"/><line x1="13.51" y1="6.51" x2="6.51" y2="13.51"/></svg>Split
          </button>
          <button className="icon-btn icon-btn--merge" onClick={() => onMerge(topic)} title="Merge topic">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="15" x2="12" y2="9"/><line x1="6" y1="15" x2="12" y2="9"/><line x1="12" y1="9" x2="12" y2="21"/></svg>Merge
          </button>
          <button className="icon-btn icon-btn--muted" onClick={() => onMove(topic)} title="Move to segment">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="5 9 2 12 5 15"/><polyline points="9 5 12 2 15 5"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/></svg>Move
          </button>
          <div className="icon-btn__sep" />
          <button className={`icon-btn${topicComments.length > 0 ? ' icon-btn--comment-active' : ' icon-btn--muted'}`} onClick={() => setShowComments(v => !v)} title="Comments">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            {topicComments.length > 0 && <span className="comment-count">{topicComments.length}</span>}
          </button>
          <div className="icon-btn__sep" />
          <button className="icon-btn icon-btn--danger" onClick={() => { if (window.confirm(`Delete topic "${topic.topic_name}"?`)) dispatch({ type: 'DELETE_TOPIC', topicId: topic.topic_id }); }} title="Delete topic">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/></svg>
          </button>
          <button className={`icon-btn icon-btn--muted icon-btn--expand${expanded ? ' icon-btn--expanded' : ''}`} onClick={() => setExpanded(v => !v)} title={expanded ? 'Collapse' : 'Expand'}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
        </div>
      </div>

      {/* Body */}
      {expanded && (
        <div className="topic-card__body">
          {/* Objectives */}
          <div className="topic-section">
            <div className="topic-section__label-row">
              <div className="topic-section__label">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 8 12 12 14 14"/></svg>
                Learning Objectives ({(topic.learning_objectives || []).length})
              </div>
              <button className="add-inline-btn" onClick={() => setObjModal('add')}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Add
              </button>
            </div>
            {(topic.learning_objectives || []).length === 0 && (
              <p className="section-empty">No objectives — <button className="link-btn" onClick={() => setObjModal('add')}>add one</button></p>
            )}
            <ul className="objectives-list">
              {(topic.learning_objectives || []).map(obj => (
                <li key={obj.objective_id} className="objective-item">
                  <span className="objective-bloom" style={{ background: BLOOM_COLORS[obj.bloom_level]?.bg, color: BLOOM_COLORS[obj.bloom_level]?.text }}>{obj.bloom_level}</span>
                  <span className="objective-text">{obj.objective_text}</span>
                  <div className="objective-actions">
                    <button className="icon-btn icon-btn--muted icon-btn--xs" title="Edit objective" onClick={() => setObjModal(obj)}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button className="icon-btn icon-btn--danger icon-btn--xs" title="Remove objective" onClick={() => dispatch({ type: 'REMOVE_OBJECTIVE', topicId: topic.topic_id, objectiveId: obj.objective_id })}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Content chunks — side by side */}
          <div className="chunk-columns">
            {/* Modified chunk */}
            <div className="chunk-col">
              <div className="chunk-col__label chunk-col__label--modified">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                Modified Chunk
              </div>
              <textarea
                className="chunk-textarea"
                value={topic.modified_chunk || ''}
                onChange={e => dispatch({ type: 'UPDATE_TOPIC', topicId: topic.topic_id, patch: { modified_chunk: e.target.value } })}
                placeholder="Modified teaching content (HOOK / RECALL / CORE / VISUAL BRIDGE / WORK-THROUGH / ERROR ALERT)…"
              />
            </div>
            {/* Original chunk */}
            <div className="chunk-col">
              <div className="chunk-col__label chunk-col__label--original">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                Original Chunk
              </div>
              <textarea
                className="chunk-textarea chunk-textarea--original"
                value={topic.original_chunk || ''}
                onChange={e => dispatch({ type: 'UPDATE_TOPIC', topicId: topic.topic_id, patch: { original_chunk: e.target.value } })}
                placeholder="Original textbook text…"
              />
            </div>
          </div>

          {/* Media Intent */}
          <div className="topic-section">
            <div className="topic-section__label-row">
              <div className="topic-section__label">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                Media Intent ({(topic.media_intent || []).length})
              </div>
              <button className="add-inline-btn" onClick={() => setMediaModal('add')}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Add
              </button>
            </div>
            {(topic.media_intent || []).length === 0 && (
              <p className="section-empty">No media — <button className="link-btn" onClick={() => setMediaModal('add')}>add one</button></p>
            )}
            <div className="media-list">
              {(topic.media_intent || []).map(mi => (
                <div key={mi.media_id} className="media-item">
                  <div className="media-item__header">
                    <span className={`media-badge media-badge--${mi.type}`}>{mediaIcon(mi.type)} {mi.type?.replace(/_/g, ' ')}</span>
                    <span className="media-item__priority">P{mi.priority}</span>
                    {mi.image_category && <span className="media-cat-badge">{mi.image_category.replace('_', ' ')}</span>}
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 3 }}>
                      <button className="icon-btn icon-btn--muted icon-btn--xs" title="Edit media" onClick={() => setMediaModal(mi)}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button className="icon-btn icon-btn--danger icon-btn--xs" title="Remove media" onClick={() => dispatch({ type: 'REMOVE_MEDIA', topicId: topic.topic_id, mediaId: mi.media_id })}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </div>
                  </div>
                  <p className="media-item__title">{mi.title}</p>
                  {mi.intent_description && <p className="media-item__desc">{mi.intent_description}</p>}
                  {mi.pedagogical_purpose && <p className="media-item__purpose"><strong>Pedagogical:</strong> {mi.pedagogical_purpose}</p>}
                  {mi.linked_objective_id && <p className="media-item__link"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg> Linked to <code>{mi.linked_objective_id}</code></p>}
                </div>
              ))}
            </div>
          </div>

          {/* Comments */}
          {showComments && (
            <div className="topic-comments">
              <div className="topic-comments__header">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                Comments ({topicComments.length + resolvedComments.length})
              </div>
              <div className="comment-list">
                {[...topicComments, ...resolvedComments].map(c => (
                  <div key={c.id} className={`comment-item${c.resolved ? ' comment-item--resolved' : ''}`}>
                    <div className="comment-item__header">
                      <span className="comment-item__author">{c.author}</span>
                      <span className="comment-item__time">{new Date(c.timestamp).toLocaleString()}</span>
                      {c.resolved && <span className="comment-resolved-badge">Resolved</span>}
                      {!c.resolved && (
                        <button className="comment-resolve-btn" onClick={() => onAddComment({ id: c.id, resolve: true })}>Resolve</button>
                      )}
                    </div>
                    <p className="comment-item__text">{c.text}</p>
                    {!c.resolved && (
                      <button className="link-btn" onClick={() => setReplyTo(c.id)}>Reply</button>
                    )}
                  </div>
                ))}
                {topicComments.length === 0 && resolvedComments.length === 0 && (
                  <p className="section-empty">No comments yet.</p>
                )}
              </div>
              <div className="comment-compose">
                {replyTo && (
                  <div className="comment-reply-indicator">
                    Replying to comment <button className="link-btn" onClick={() => setReplyTo(null)}>✕ cancel</button>
                  </div>
                )}
                <textarea className="comment-input" placeholder="Add a comment…" value={commentText} onChange={e => setCommentText(e.target.value)} rows={2} />
                <button className="btn btn--primary" style={{ fontSize: '.75rem', padding: '5px 12px' }} onClick={submitComment} disabled={!commentText.trim()}>Post</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Objective modal */}
      {objModal && (
        <ObjectiveModal
          mode={typeof objModal === 'string' ? 'add' : 'edit'}
          objective={typeof objModal === 'object' ? objModal : null}
          topicId={topic.topic_id}
          onCancel={() => setObjModal(null)}
          onSave={patch => {
            if (typeof objModal === 'string') {
              dispatch({ type: 'ADD_OBJECTIVE', topicId: topic.topic_id, ...patch });
            } else {
              dispatch({ type: 'EDIT_OBJECTIVE', topicId: topic.topic_id, objectiveId: objModal.objective_id, patch });
            }
            setObjModal(null);
          }}
        />
      )}

      {/* Media modal */}
      {mediaModal && (
        <MediaModal
          mode={typeof mediaModal === 'string' ? 'add' : 'edit'}
          media={typeof mediaModal === 'object' ? mediaModal : null}
          topic={topic}
          onCancel={() => setMediaModal(null)}
          onSave={payload => {
            if (typeof mediaModal === 'string') {
              dispatch({ type: 'ADD_MEDIA', topicId: topic.topic_id, media: payload });
            } else {
              dispatch({ type: 'EDIT_MEDIA', topicId: topic.topic_id, mediaId: mediaModal.media_id, patch: payload });
            }
            setMediaModal(null);
          }}
        />
      )}
    </div>
  );
}

/* ── SegmentBlock ─────────────────────────────────────── */
function SegmentBlock({ segment, segIdx, totalSegs, dispatch, data, onSplit, onMerge, onMoveTopic, onMoveSegment, comments, onAddComment }) {
  const [collapsed, setCollapsed] = useState(false);
  const [dragOverIdx, setDragOverIdx] = useState(null);
  const [addTopicModal, setAddTopicModal] = useState(false);

  const handleDragOver = useCallback((e, idx) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverIdx(idx); }, []);
  const handleDrop = useCallback((e, toIdx) => {
    e.preventDefault(); setDragOverIdx(null);
    try {
      const { segmentId: fromSegId, topicIndex: fromIdx } = JSON.parse(e.dataTransfer.getData('text/plain'));
      if (fromSegId !== segment.segment_id) return;
      if (fromIdx === toIdx) return;
      dispatch({ type: 'REORDER_TOPICS', segmentId: segment.segment_id, fromIdx, toIdx });
    } catch (_) {}
  }, [segment.segment_id, dispatch]);

  const topics = segment.topics || [];

  return (
    <div className="segment-block">
      <div className="segment-header">
        <div className="segment-header__left">
          <button className={`segment-collapse-btn${collapsed ? ' segment-collapse-btn--collapsed' : ''}`} onClick={() => setCollapsed(v => !v)}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <code className="segment-id">{segment.segment_id}</code>
          <InlineEdit className="segment-name" value={segment.segment_name} onSave={v => dispatch({ type: 'UPDATE_SEGMENT', segmentId: segment.segment_id, patch: { segment_name: v } })} />
          <span className="segment-count">{topics.length} topic{topics.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="segment-header__right">
          <button className="icon-btn icon-btn--muted" onClick={() => dispatch({ type: 'MOVE_SEGMENT_UP', segmentId: segment.segment_id })} disabled={segIdx === 0} title="Move segment up"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15"/></svg></button>
          <button className="icon-btn icon-btn--muted" onClick={() => dispatch({ type: 'MOVE_SEGMENT_DOWN', segmentId: segment.segment_id })} disabled={segIdx === totalSegs - 1} title="Move segment down"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg></button>
          <button className="icon-btn icon-btn--muted" onClick={() => onMoveSegment(segment)} title="Move to module">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="3" width="20" height="4" rx="1"/><rect x="2" y="10" width="20" height="4" rx="1"/><path d="M2 17h8"/><path d="M15 14l5 5-5 5"/></svg>
          </button>
          <div className="icon-btn__sep" />
          <button className="add-inline-btn" onClick={() => setAddTopicModal(true)}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Topic
          </button>
          <div className="icon-btn__sep" />
          <button className="icon-btn icon-btn--danger" onClick={() => { if (window.confirm(`Delete segment "${segment.segment_name}" and all its topics?`)) dispatch({ type: 'DELETE_SEGMENT', segmentId: segment.segment_id }); }} title="Delete segment">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/></svg>
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="segment-body">
          {topics.length === 0 && <div className="segment-empty">No topics — click <strong>+ Topic</strong> to add one.</div>}
          {topics.map((topic, idx) => (
            <div key={topic.topic_id} className={`topic-drop-zone${dragOverIdx === idx ? ' topic-drop-zone--over' : ''}`}
              onDragOver={e => handleDragOver(e, idx)} onDragLeave={() => setDragOverIdx(null)} onDrop={e => handleDrop(e, idx)}>
              <TopicCard
                topic={topic} segmentId={segment.segment_id} topicIndex={idx} totalTopics={topics.length}
                dispatch={dispatch} data={data}
                onSplit={onSplit} onMerge={onMerge} onMove={onMoveTopic}
                comments={comments} onAddComment={onAddComment}
              />
            </div>
          ))}
        </div>
      )}

      {addTopicModal && (
        <AddItemModal
          mode="topic" data={data} targetId={segment.segment_id}
          onCancel={() => setAddTopicModal(false)}
          onSave={({ topic_name, topic_type }) => {
            dispatch({ type: 'ADD_TOPIC', segmentId: segment.segment_id, topic_name, topic_type });
            setAddTopicModal(false);
          }}
        />
      )}
    </div>
  );
}

/* ── ModuleBlock ──────────────────────────────────────── */
function ModuleBlock({ module, modIdx, totalMods, dispatch, data, onSplit, onMerge, onMoveTopic, onMoveSegment, comments, onAddComment }) {
  const [collapsed, setCollapsed] = useState(false);
  const [addSegmentModal, setAddSegmentModal] = useState(false);
  const segments = module.segments || [];
  const topicCount = segments.reduce((a, s) => a + (s.topics || []).length, 0);

  return (
    <div className="module-block">
      <div className="module-header">
        <div className="module-header__left">
          <button className={`module-collapse-btn${collapsed ? ' module-collapse-btn--collapsed' : ''}`} onClick={() => setCollapsed(v => !v)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <span className="module-number">M{modIdx + 1}</span>
          <InlineEdit className="module-name" value={module.module_name} onSave={v => dispatch({ type: 'UPDATE_MODULE', moduleId: module.module_id, patch: { module_name: v } })} />
        </div>
        <div className="module-header__stats">
          <span className="module-stat">{segments.length} seg{segments.length !== 1 ? 's' : ''}</span>
          <span className="module-stat">{topicCount} topic{topicCount !== 1 ? 's' : ''}</span>
        </div>
        <div className="module-header__actions">
          <button className="icon-btn icon-btn--muted" onClick={() => dispatch({ type: 'MOVE_MODULE_UP', moduleId: module.module_id })} disabled={modIdx === 0} title="Move module up"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15"/></svg></button>
          <button className="icon-btn icon-btn--muted" onClick={() => dispatch({ type: 'MOVE_MODULE_DOWN', moduleId: module.module_id })} disabled={modIdx === totalMods - 1} title="Move module down"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg></button>
          <div className="icon-btn__sep" />
          <button className="add-inline-btn" onClick={() => setAddSegmentModal(true)}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Segment
          </button>
          <div className="icon-btn__sep" />
          <button className="icon-btn icon-btn--danger" onClick={() => { if (window.confirm(`Delete module "${module.module_name}" and ALL its content?`)) dispatch({ type: 'DELETE_MODULE', moduleId: module.module_id }); }} title="Delete module">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/></svg>
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="module-body">
          {segments.map((seg, sIdx) => (
            <SegmentBlock
              key={seg.segment_id} segment={seg} moduleId={module.module_id}
              segIdx={sIdx} totalSegs={segments.length}
              dispatch={dispatch} data={data}
              onSplit={onSplit} onMerge={onMerge}
              onMoveTopic={onMoveTopic} onMoveSegment={onMoveSegment}
              comments={comments} onAddComment={onAddComment}
            />
          ))}
          {segments.length === 0 && <div className="module-empty">No segments — click <strong>+ Segment</strong> to add one.</div>}
        </div>
      )}

      {addSegmentModal && (
        <AddItemModal
          mode="segment" data={data} targetId={module.module_id}
          onCancel={() => setAddSegmentModal(false)}
          onSave={({ name }) => {
            dispatch({ type: 'ADD_SEGMENT', moduleId: module.module_id, name });
            setAddSegmentModal(false);
          }}
        />
      )}
    </div>
  );
}

/* ── Undo/Redo history wrapper ───────────────────────── */
const MAX_HISTORY = 50;

function historyReducer(history, action) {
  if (action.type === '__UNDO__') {
    if (history.past.length === 0) return history;
    return {
      past: history.past.slice(0, -1),
      present: history.past[history.past.length - 1],
      future: [history.present, ...history.future].slice(0, MAX_HISTORY),
    };
  }
  if (action.type === '__REDO__') {
    if (history.future.length === 0) return history;
    return {
      past: [...history.past, history.present].slice(-MAX_HISTORY),
      present: history.future[0],
      future: history.future.slice(1),
    };
  }
  // Regular action — delegate to inner reducer
  const next = reducer(history.present, action);
  if (next === history.present) return history; // no change, skip
  return {
    past: [...history.past, history.present].slice(-MAX_HISTORY),
    present: next,
    future: [],
  };
}

function useUndoReducer(initialState) {
  const [history, rawDispatch] = useReducer(historyReducer, {
    past: [],
    present: initialState,
    future: [],
  });
  const undo = useCallback(() => rawDispatch({ type: '__UNDO__' }), []);
  const redo = useCallback(() => rawDispatch({ type: '__REDO__' }), []);
  return [
    history.present,
    rawDispatch,
    { undo, redo, canUndo: history.past.length > 0, canRedo: history.future.length > 0 },
  ];
}

/* ── Main DraftPlanView ──────────────────────────────── */
export default function DraftPlanView({ initialData }) {
  const seed = initialData ? { ...resequenceAll(initialData).newData, _versions: [] } : { ...rawData, _versions: [] };
  const [data, dispatch, { undo, redo, canUndo, canRedo }] = useUndoReducer(seed);
  const [splitModal, setSplitModal] = useState(null);
  const [mergeModal, setMergeModal] = useState(null);
  const [moveTopicModal, setMoveTopicModal] = useState(null);
  const [moveSegmentModal, setMoveSegmentModal] = useState(null);
  const [addModuleModal, setAddModuleModal] = useState(false);
  const [addExampleModal, setAddExampleModal] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [showValidation, setShowValidation] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showExamples, setShowExamples] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [comments, setComments] = useState([]);

  // Keyboard shortcuts: Ctrl/Cmd+Z = undo, Ctrl/Cmd+Shift+Z or Ctrl+Y = redo
  useEffect(() => {
    const handler = (e) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (!ctrl) return;
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return; // don't steal from text fields
      if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.key === 'z' && e.shiftKey) || e.key === 'y') { e.preventDefault(); redo(); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [undo, redo]);

  const handleAddComment = useCallback(({ topic_id, text, parent_id, id, resolve }) => {
    if (resolve && id) {
      setComments(prev => prev.map(c => c.id === id ? { ...c, resolved: true } : c));
      return;
    }
    const newComment = {
      id: `c-${Date.now()}`,
      topic_id,
      text,
      author: 'Reviewer',
      timestamp: new Date().toISOString(),
      parent_id: parent_id || null,
      resolved: false,
    };
    setComments(prev => [...prev, newComment]);
  }, []);

  const handleSplitConfirm = useCallback((payload) => {
    if (!splitModal) return;
    dispatch({ type: 'SPLIT_TOPIC', topicId: splitModal.topic_id, ...payload });
    setSplitModal(null);
  }, [splitModal]);

  const handleMergeConfirm = useCallback((payload) => {
    if (!mergeModal) return;
    dispatch({ type: 'MERGE_TOPICS', targetId: mergeModal.topic_id, ...payload });
    setMergeModal(null);
  }, [mergeModal]);

  const handleRunValidation = useCallback(() => {
    const result = validatePlan(data);
    setValidationResult(result);
    setShowValidation(true);
  }, [data]);

  const handleExport = useCallback(() => {
    const exportData = { ...data };
    delete exportData._versions;
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.plan_id || 'draft'}_approved.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [data]);

  const versions = data._versions || [];
  const totalComments = comments.filter(c => !c.resolved).length;
  const totalModules = (data.modules || []).length;
  const totalSegments = (data.modules || []).reduce((a, m) => a + (m.segments || []).length, 0);
  const totalTopics = (data.modules || []).reduce((a, m) => a + (m.segments || []).reduce((b, s) => b + (s.topics || []).length, 0), 0);

  const validationErrors = validationResult?.error_count || 0;
  const validationWarnings = validationResult?.warning_count || 0;

  const filteredModules = searchQuery.trim()
    ? (data.modules || []).map(m => ({
        ...m,
        segments: (m.segments || []).map(s => ({
          ...s,
          topics: (s.topics || []).filter(t =>
            t.topic_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.topic_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.modified_chunk?.toLowerCase().includes(searchQuery.toLowerCase())
          ),
        })).filter(s => s.topics.length > 0),
      })).filter(m => m.segments.length > 0)
    : (data.modules || []);

  return (
    <div className="dv">
      <div className="dv-fixed-top">
      {/* Plan Header */}
      <div className="dv-plan-header">
        <div className="dv-plan-header__info">
          <div className="dv-plan-header__title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
            {data.chapter_name}
          </div>
          <div className="dv-plan-header__meta">
            <span>{data.textbook}</span><span className="dv-dot">·</span>
            <span>Grade {data.grade}</span><span className="dv-dot">·</span>
            <span className="dv-cap">{data.subject}</span><span className="dv-dot">·</span>
            <span>Unit {data.unit_number}</span>
          </div>
        </div>
        <div className="dv-plan-header__stats">
          {[['Modules', totalModules], ['Segments', totalSegments], ['Topics', totalTopics]].map(([l, v]) => (
            <div key={l} className="dv-stat">
              <span className="dv-stat__val">{v}</span>
              <span className="dv-stat__lbl">{l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Toolbar */}
      <div className="dv-toolbar">
        <div className="dv-search">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="Search topics…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="dv-search__input" />
          {searchQuery && <button className="dv-search__clear" onClick={() => setSearchQuery('')}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>}
        </div>

        <button className="dv-toolbar__btn" onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>
          Undo
        </button>
        <button className="dv-toolbar__btn" onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 14 20 9 15 4"/><path d="M4 20v-7a4 4 0 0 1 4-4h12"/></svg>
          Redo
        </button>

        <div className="dv-toolbar__sep" />

        <button className={`dv-toolbar__btn${showExamples ? ' dv-toolbar__btn--active' : ''}`} onClick={() => setShowExamples(v => !v)}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          Examples
        </button>

        <button className="dv-toolbar__btn" onClick={() => setAddModuleModal(true)}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Module
        </button>

        <div className="dv-toolbar__sep" />

        <button
          className={`dv-toolbar__btn${validationErrors > 0 ? ' dv-toolbar__btn--error' : validationWarnings > 0 ? ' dv-toolbar__btn--warn' : validationResult?.passed ? ' dv-toolbar__btn--pass' : ''}`}
          onClick={handleRunValidation}
          title="Run validation"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          Validate
          {validationResult && (
            <span className={`toolbar-badge toolbar-badge--${validationErrors > 0 ? 'error' : 'pass'}`}>
              {validationErrors > 0 ? `${validationErrors}E` : validationWarnings > 0 ? `${validationWarnings}W` : '✓'}
            </span>
          )}
        </button>

        <button className="dv-toolbar__btn" onClick={() => setShowHistory(true)} title="Version history">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          History
          {versions.length > 0 && <span className="toolbar-badge toolbar-badge--info">{versions.length}</span>}
        </button>

        {totalComments > 0 && (
          <button className="dv-toolbar__btn dv-toolbar__btn--comment">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            <span className="toolbar-badge toolbar-badge--comment">{totalComments}</span>
          </button>
        )}

        <button className="dv-toolbar__btn dv-toolbar__btn--export" onClick={handleExport} title="Export JSON">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Export
        </button>
      </div>
      </div>{/* /dv-fixed-top */}

      {/* Examples Panel */}
      {showExamples && (
        <div className="dv-examples">
          <div className="dv-examples__header">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            Chapter Examples ({(data.example_plan || []).length})
            <button className="add-inline-btn" style={{ marginLeft: 'auto' }} onClick={() => setAddExampleModal(true)}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Add Example
            </button>
          </div>
          <div className="dv-examples__list">
            {(data.example_plan || []).map(ex => (
              <div key={ex.example_id} className="example-card">
                <div className="example-card__header">
                  <code className="example-card__id">{ex.example_id}</code>
                  <select
                    className="example-scope-select"
                    value={ex.scope_level}
                    onChange={e => dispatch({ type: 'UPDATE_EXAMPLE', exId: ex.example_id, patch: { scope_level: e.target.value } })}
                  >
                    {['chapter', 'module', 'segment', 'topic'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <InlineEdit className="example-card__title" value={ex.example_theme} onSave={v => dispatch({ type: 'UPDATE_EXAMPLE', exId: ex.example_id, patch: { example_theme: v } })} />
                  <button className="icon-btn icon-btn--danger icon-btn--xs" style={{ marginLeft: 'auto' }} onClick={() => { if (window.confirm(`Delete example "${ex.example_theme}"?`)) dispatch({ type: 'DELETE_EXAMPLE', exId: ex.example_id }); }} title="Delete example">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
                <InlineEdit multiline value={ex.example_description} className="example-card__desc" onSave={v => dispatch({ type: 'UPDATE_EXAMPLE', exId: ex.example_id, patch: { example_description: v } })} />
                <div className="example-card__topics">
                  {(ex.supported_topic_ids || []).map(id => <code key={id} className="example-card__topic-id">{id}</code>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Module content */}
      <div className="dv-content">
        {searchQuery.trim() && filteredModules.length === 0 && (
          <div className="dv-no-results">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <p>No topics match "{searchQuery}"</p>
          </div>
        )}
        {filteredModules.map((mod, idx) => (
          <ModuleBlock
            key={mod.module_id} module={mod} modIdx={idx} totalMods={filteredModules.length}
            dispatch={dispatch} data={data}
            onSplit={setSplitModal} onMerge={setMergeModal}
            onMoveTopic={setMoveTopicModal} onMoveSegment={setMoveSegmentModal}
            comments={comments} onAddComment={handleAddComment}
          />
        ))}
        {(data.modules || []).length === 0 && !searchQuery && (
          <div className="dv-no-results">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
            <p>No modules yet. Click <strong>+ Module</strong> to add one.</p>
          </div>
        )}
      </div>

      {/* ── Modals ─────────────────────────────── */}
      {splitModal && (
        <SplitTopicModal topic={splitModal} onCancel={() => setSplitModal(null)} onConfirm={handleSplitConfirm} />
      )}
      {mergeModal && (
        <MergeTopicModal data={data} targetTopic={mergeModal} onCancel={() => setMergeModal(null)} onConfirm={handleMergeConfirm} />
      )}
      {moveTopicModal && (
        <MoveModal
          mode="topic" data={data} item={moveTopicModal}
          onCancel={() => setMoveTopicModal(null)}
          onConfirm={({ destId, position }) => {
            dispatch({ type: 'MOVE_TOPIC_TO_SEGMENT', topicId: moveTopicModal.topic_id, destSegId: destId, position });
            setMoveTopicModal(null);
          }}
        />
      )}
      {moveSegmentModal && (
        <MoveModal
          mode="segment" data={data} item={moveSegmentModal}
          onCancel={() => setMoveSegmentModal(null)}
          onConfirm={({ destId, position }) => {
            dispatch({ type: 'MOVE_SEGMENT_TO_MODULE', segmentId: moveSegmentModal.segment_id, destModId: destId, position });
            setMoveSegmentModal(null);
          }}
        />
      )}
      {addModuleModal && (
        <AddItemModal
          mode="module" data={data}
          onCancel={() => setAddModuleModal(false)}
          onSave={({ name }) => { dispatch({ type: 'ADD_MODULE', name }); setAddModuleModal(false); }}
        />
      )}
      {addExampleModal && (
        <AddItemModal
          mode="example" data={data}
          onCancel={() => setAddExampleModal(false)}
          onSave={(payload) => { dispatch({ type: 'ADD_EXAMPLE', ...payload }); setAddExampleModal(false); }}
        />
      )}
      {showValidation && (
        <ValidationPanel
          result={validationResult}
          onClose={() => setShowValidation(false)}
          onRevalidate={handleRunValidation}
        />
      )}
      {showHistory && (
        <VersionHistoryPanel
          versions={versions}
          onClose={() => setShowHistory(false)}
          onRollback={(v) => { dispatch({ type: 'ROLLBACK', data: v.data }); setShowHistory(false); }}
        />
      )}
    </div>
  );
}
