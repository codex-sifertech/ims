import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ChevronDown, Plus, Paperclip, Smile, Send,
  Clock, Flag, AlignLeft, CheckSquare, Link2,
  Calendar, Users, Trash2, ArrowLeft, MoreHorizontal,
  Copy, Sparkles, Search, ExternalLink,
  CheckCircle2, Loader2, Tag, Timer, Activity,
  MessageSquare, Check, ClipboardCopy, Zap,
  RotateCcw, ArrowRight, Circle
} from 'lucide-react';
import {
  doc, collection, addDoc, updateDoc, deleteDoc, onSnapshot,
  serverTimestamp, query, orderBy, getDoc
} from 'firebase/firestore';
import { db } from '../../firebase';
import useStore from '../../store/useStore';
import { format, isPast, formatDistanceToNow } from 'date-fns';
import { sendNotification } from '../../utils/notifications';
import { syncTaskToGoogleCalendar } from '../../utils/calendarSync';

// ── Constants ─────────────────────────────────────────────────────────────

const PRIORITIES = [
  { label: 'Low',    color: 'bg-emerald-500/15', dot: 'bg-emerald-400', text: 'text-emerald-300', border: 'border-emerald-500/30' },
  { label: 'Medium', color: 'bg-blue-500/15',    dot: 'bg-blue-400',    text: 'text-blue-300',    border: 'border-blue-500/30'    },
  { label: 'High',   color: 'bg-amber-500/15',   dot: 'bg-amber-400',   text: 'text-amber-300',   border: 'border-amber-500/30'   },
  { label: 'Urgent', color: 'bg-red-500/15',     dot: 'bg-red-400',     text: 'text-red-300',     border: 'border-red-500/30'     },
];

const STATUSES = [
  { id: 'todo',        label: 'To Do',       icon: <Circle size={12} className="text-slate-500" />,       ring: 'border-slate-500'   },
  { id: 'in-progress', label: 'In Progress', icon: <RotateCcw size={12} className="text-amber-400" />,    ring: 'border-amber-400'   },
  { id: 'review',      label: 'In Review',   icon: <ArrowRight size={12} className="text-blue-400" />,    ring: 'border-blue-400'    },
  { id: 'done',        label: 'Done',        icon: <CheckCircle2 size={12} className="text-emerald-400" />, ring: 'border-emerald-400' },
];

const TAG_OPTIONS = [
  { label: 'Bug',      bg: 'bg-red-500/20',     text: 'text-red-300',     border: 'border-red-500/30'     },
  { label: 'Feature',  bg: 'bg-blue-500/20',    text: 'text-blue-300',    border: 'border-blue-500/30'    },
  { label: 'Design',   bg: 'bg-purple-500/20',  text: 'text-purple-300',  border: 'border-purple-500/30'  },
  { label: 'Sprint',   bg: 'bg-amber-500/20',   text: 'text-amber-300',   border: 'border-amber-500/30'   },
  { label: 'Review',   bg: 'bg-cyan-500/20',    text: 'text-cyan-300',    border: 'border-cyan-500/30'    },
  { label: 'Docs',     bg: 'bg-emerald-500/20', text: 'text-emerald-300', border: 'border-emerald-500/30' },
  { label: 'Testing',  bg: 'bg-indigo-500/20',  text: 'text-indigo-300',  border: 'border-indigo-500/30'  },
  { label: 'Backend',  bg: 'bg-rose-500/20',    text: 'text-rose-300',    border: 'border-rose-500/30'    },
];

const tagCfg = (label) => TAG_OPTIONS.find(t => t.label === label) || TAG_OPTIONS[0];

const EMOJI_SET = ['👍', '❤️', '😂', '🎉', '👀', '🔥', '✅', '🚀'];

// ── Tiny helpers ──────────────────────────────────────────────────────────

function Avatar({ name, photoURL, size = 6 }) {
  const colors = ['bg-violet-600','bg-blue-600','bg-emerald-600','bg-amber-600','bg-pink-600','bg-cyan-600'];
  const idx = name ? name.charCodeAt(0) % colors.length : 0;
  if (photoURL) return <img src={photoURL} alt={name} className={`w-${size} h-${size} rounded-full object-cover shrink-0`} />;
  return (
    <div className={`w-${size} h-${size} rounded-full ${colors[idx]} flex items-center justify-center text-white font-black text-[10px] shrink-0`}>
      {(name || '?').charAt(0).toUpperCase()}
    </div>
  );
}

function SaveBadge({ state }) {
  return (
    <AnimatePresence>
      {state !== 'idle' && (
        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className={`text-[10px] font-semibold ${state === 'saving' ? 'text-slate-500' : 'text-emerald-500'} flex items-center gap-1`}>
          {state === 'saving'
            ? <><Loader2 size={10} className="animate-spin" /> Saving…</>
            : <><Check size={10} /> Saved</>}
        </motion.span>
      )}
    </AnimatePresence>
  );
}

function Toast({ msg, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2200); return () => clearTimeout(t); }, [onDone]);
  return (
    <motion.div initial={{ opacity: 0, y: 12, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12 }}
      className="fixed bottom-6 right-6 z-[400] bg-dark-800 border border-white/10 shadow-2xl rounded-xl px-4 py-2.5 flex items-center gap-2 text-sm text-white font-semibold">
      <CheckCircle2 size={15} className="text-emerald-400 shrink-0" /> {msg}
    </motion.div>
  );
}

// ── Inline property chip ──────────────────────────────────────────────────

function PropChip({ icon, label, onClick, className = '' }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-white/5 border border-transparent hover:border-white/8 ${className}`}>
      {icon}{label}
    </button>
  );
}

// ── Subtask row ───────────────────────────────────────────────────────────

function SubtaskRow({ subtask, taskPath, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(subtask.title);

  const toggle = () => updateDoc(doc(db, taskPath, 'subtasks', subtask.id), {
    done: !subtask.done, updatedAt: serverTimestamp()
  });

  const saveEdit = async () => {
    if (editVal.trim() && editVal !== subtask.title) {
      await updateDoc(doc(db, taskPath, 'subtasks', subtask.id), { title: editVal.trim(), updatedAt: serverTimestamp() });
    }
    setEditing(false);
  };

  return (
    <div className="flex items-center gap-2.5 group py-1 px-1 rounded-lg hover:bg-white/[0.02] transition-colors">
      <button onClick={toggle}
        className={`shrink-0 w-[18px] h-[18px] rounded-[5px] border-2 flex items-center justify-center transition-all ${
          subtask.done ? 'bg-emerald-500 border-emerald-500' : 'border-white/20 hover:border-primary-400'
        }`}>
        {subtask.done && <Check size={11} className="text-white" strokeWidth={3} />}
      </button>

      {editing ? (
        <input autoFocus value={editVal}
          onChange={e => setEditVal(e.target.value)}
          onBlur={saveEdit}
          onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') { setEditVal(subtask.title); setEditing(false); } }}
          className="flex-1 bg-transparent text-sm text-white outline-none border-b border-primary-500/50" />
      ) : (
        <span
          onDoubleClick={() => setEditing(true)}
          className={`flex-1 text-sm cursor-default select-none transition-all ${
            subtask.done ? 'line-through text-slate-600' : 'text-slate-200'
          }`}>
          {subtask.title}
        </span>
      )}

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => setEditing(true)} className="p-1 text-slate-600 hover:text-slate-300 transition-colors rounded">
          <Sparkles size={11} />
        </button>
        <button onClick={() => onDelete(subtask.id)} className="p-1 text-slate-600 hover:text-red-400 transition-colors rounded">
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────

export default function TaskDetailPanel({ task, onClose, onUpdate, onCreate, onDelete, members = [] }) {
  const { user } = useStore();
  const isNewTask = !task?.id;
  const taskPath = task?._path;

  // ── Editable fields ───────────────────────────────────
  const [title, setTitle]       = useState(task?.title || '');
  const [status, setStatus]     = useState(task?.status || 'todo');
  const [priority, setPriority] = useState(task?.priority || 'Medium');
  const [startDate, setStartDate] = useState(task?.startDate || '');
  const [dueDate, setDueDate]   = useState(task?.dueDate || '');
  const [description, setDescription] = useState(task?.description || '');
  const [tags, setTags]         = useState(task?.tags || []);
  const [timeEst, setTimeEst]   = useState(task?.timeEstimate || '');
  const [assignees, setAssignees] = useState(
    task?.assignedTo || (isNewTask && user
      ? [{ id: user.uid, name: user.name, photoURL: user.photoURL, email: user.email }]
      : [])
  );

  // ── Subtasks ─────────────────────────────────────────
  const [subtasks, setSubtasks] = useState([]);
  const [newSubtask, setNewSubtask] = useState('');
  const [addingSubtask, setAddingSubtask] = useState(false);
  const subtaskInputRef = useRef(null);

  // ── Attachments ───────────────────────────────────────
  const [attachments, setAttachments] = useState(task?.attachments || []);
  const [attachUrl, setAttachUrl]   = useState('');
  const [attachName, setAttachName] = useState('');
  const [showAttachForm, setShowAttachForm] = useState(false);

  // ── Comments + Activity ───────────────────────────────
  const [comments, setComments]     = useState([]);
  const [activityLog, setActivityLog] = useState([]);
  const [rightTab, setRightTab]     = useState('comments'); // 'comments' | 'activity'
  const [commentText, setCommentText] = useState('');
  const [sending, setSending]       = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [mentionSearch, setMentionSearch]   = useState('');
  const [showMentions, setShowMentions]     = useState(false);
  const commentInputRef = useRef(null);
  const feedEndRef      = useRef(null);

  // ── UI state ──────────────────────────────────────────
  const [saveState, setSaveState]     = useState('idle'); // 'idle' | 'saving' | 'saved'
  const [showStatusMenu, setShowStatusMenu]   = useState(false);
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  const [showTagMenu, setShowTagMenu]     = useState(false);
  const [showAssigneeMenu, setShowAssigneeMenu] = useState(false);
  const [assigneeSearch, setAssigneeSearch]   = useState('');
  const [showMoreMenu, setShowMoreMenu]     = useState(false);
  const [confirmDelete, setConfirmDelete]   = useState(false);
  const [deleting, setDeleting]       = useState(false);
  const [toast, setToast]             = useState('');
  const saveTimer = useRef(null);

  // ── Firestore subscriptions ───────────────────────────
  useEffect(() => {
    if (!taskPath) return;
    const unsub1 = onSnapshot(
      query(collection(db, taskPath, 'subtasks'), orderBy('createdAt', 'asc')),
      snap => setSubtasks(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    const unsub2 = onSnapshot(
      query(collection(db, taskPath, 'comments'), orderBy('createdAt', 'asc')),
      snap => setComments(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    const unsub3 = onSnapshot(
      query(collection(db, taskPath, 'activity'), orderBy('at', 'desc')),
      snap => setActivityLog(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return () => { unsub1(); unsub2(); unsub3(); };
  }, [taskPath]);

  useEffect(() => { feedEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [comments]);
  useEffect(() => { setAttachments(task?.attachments || []); }, [task?.attachments]);

  // ── Auto-save with debounce + activity log ────────────
  const logActivity = useCallback(async (type, extra = {}) => {
    if (!taskPath || isNewTask) return;
    try {
      await addDoc(collection(db, taskPath, 'activity'), {
        type, by: user.uid, byName: user.name || user.email,
        at: serverTimestamp(), ...extra
      });
    } catch {}
  }, [taskPath, isNewTask, user]);

  const saveField = useCallback(async (field, value, logPayload) => {
    if (isNewTask) { onUpdate?.({ [field]: value }); return; }
    if (!taskPath) return;
    clearTimeout(saveTimer.current);
    setSaveState('saving');
    saveTimer.current = setTimeout(async () => {
      try {
        await updateDoc(doc(db, taskPath), { [field]: value, updatedAt: new Date().toISOString() });
        if (logPayload) await logActivity(logPayload.type, logPayload);
        if (field === 'status' && value === 'done') {
          (Array.isArray(task.assignedTo) ? task.assignedTo : []).forEach(m =>
            sendNotification(m.id, user, 'completed', `completed task "${task.title}"`, task.id)
          );
        }
        const updated = { ...task, [field]: value };
        if (updated.dueDate && ['title', 'description', 'dueDate', 'assignedTo'].includes(field)) {
          syncTaskToGoogleCalendar(user.uid, updated).catch(() => {});
        }
        onUpdate?.({ [field]: value });
        setSaveState('saved');
        setTimeout(() => setSaveState('idle'), 1800);
      } catch (e) {
        console.error('Save failed:', e);
        setSaveState('idle');
      }
    }, 600);
  }, [isNewTask, taskPath, task, user, logActivity, onUpdate]);

  // ── Status & Priority ─────────────────────────────────
  const handleStatusChange = (newStatus) => {
    const prev = status;
    setStatus(newStatus);
    setShowStatusMenu(false);
    saveField('status', newStatus, { type: 'status_changed', from: prev, to: newStatus });
  };

  const handlePriorityChange = (newPriority) => {
    const prev = priority;
    setPriority(newPriority);
    setShowPriorityMenu(false);
    saveField('priority', newPriority, { type: 'priority_changed', from: prev, to: newPriority });
  };

  // ── Tags ──────────────────────────────────────────────
  const toggleTag = (tagLabel) => {
    const has = tags.includes(tagLabel);
    const updated = has ? tags.filter(t => t !== tagLabel) : [...tags, tagLabel];
    setTags(updated);
    saveField('tags', updated, { type: has ? 'tag_removed' : 'tag_added', tag: tagLabel });
  };

  // ── Assignees ─────────────────────────────────────────
  const toggleAssignee = (member) => {
    const existing = assignees.find(a => a.id === member.id);
    const updated = existing
      ? assignees.filter(a => a.id !== member.id)
      : [...assignees, { id: member.id, name: member.name, photoURL: member.photoURL, email: member.email }];
    setAssignees(updated);
    saveField('assignedTo', updated, {
      type: existing ? 'unassigned' : 'assigned',
      memberName: member.name
    });
    if (!existing) sendNotification(member.id, user, 'assignment', `assigned you to "${task?.title || 'a task'}"`, task?.id);
  };

  // ── Subtasks ──────────────────────────────────────────
  const handleAddSubtask = async () => {
    if (!newSubtask.trim() || !taskPath) return;
    setAddingSubtask(true);
    try {
      await addDoc(collection(db, taskPath, 'subtasks'), {
        title: newSubtask.trim(), done: false,
        createdBy: user.uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp()
      });
      setNewSubtask('');
      subtaskInputRef.current?.focus();
    } catch (e) { console.error(e); }
    setAddingSubtask(false);
  };

  const handleDeleteSubtask = (id) => deleteDoc(doc(db, taskPath, 'subtasks', id));

  const doneCount = subtasks.filter(s => s.done).length;
  const progress  = subtasks.length ? Math.round((doneCount / subtasks.length) * 100) : 0;

  // ── Attachments ───────────────────────────────────────
  const handleAddAttachment = async () => {
    if (!attachUrl.trim() || !taskPath) return;
    const newAtt = {
      id: Date.now().toString(),
      url: attachUrl.trim(),
      name: attachName.trim() || attachUrl.trim(),
      addedBy: user.uid, addedAt: new Date().toISOString()
    };
    const updated = [...attachments, newAtt];
    await updateDoc(doc(db, taskPath), { attachments: updated, updatedAt: new Date().toISOString() });
    setAttachments(updated);
    setAttachUrl(''); setAttachName(''); setShowAttachForm(false);
  };

  const handleDeleteAttachment = async (id) => {
    const updated = attachments.filter(a => a.id !== id);
    await updateDoc(doc(db, taskPath), { attachments: updated, updatedAt: new Date().toISOString() });
    setAttachments(updated);
  };

  // ── Share ─────────────────────────────────────────────
  const handleShare = async () => {
    const url = `${window.location.origin}${window.location.pathname}?task=${task?.id || ''}`;
    try { await navigator.clipboard.writeText(url); } catch {}
    setToast('Link copied!');
  };

  // ── Delete ────────────────────────────────────────────
  const handleDeleteTask = async () => {
    if (!taskPath) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, taskPath));
      onDelete?.();
      onClose();
    } catch (e) { console.error(e); setDeleting(false); }
  };

  // ── Create ────────────────────────────────────────────
  const handleCreate = () => {
    if (!title.trim()) return;
    const newTaskData = { title: title.trim(), status, priority, description, assignedTo: assignees, startDate, dueDate, tags, timeEstimate: timeEst };
    onCreate?.(newTaskData);
    if (dueDate) syncTaskToGoogleCalendar(user.uid, newTaskData).catch(() => {});
    onClose();
  };

  // ── Comments ──────────────────────────────────────────
  const handleSendComment = async () => {
    if (!commentText.trim() || !taskPath || sending) return;
    setSending(true);
    try {
      await addDoc(collection(db, taskPath, 'comments'), {
        text: commentText.trim(), authorId: user.uid,
        authorName: user.name || user.email, authorPhoto: user.photoURL || null,
        createdAt: serverTimestamp(), reactions: {}, type: 'text'
      });
      commentText.split(/\s+/).filter(w => w.startsWith('@')).forEach(w => {
        const m = members.find(x => x.name?.toLowerCase() === w.slice(1).toLowerCase());
        if (m) sendNotification(m.id, user, 'mention', `mentioned you in "${task?.title}"`, task?.id);
      });
      setCommentText('');
    } finally { setSending(false); }
  };

  const handleDeleteComment = async (commentId) => {
    if (!taskPath) return;
    await deleteDoc(doc(db, taskPath, 'comments', commentId));
  };

  const toggleReaction = async (commentId, emoji) => {
    if (!taskPath) return;
    const ref = doc(db, taskPath, 'comments', commentId);
    const snap = await getDoc(ref);
    const current = snap.data()?.reactions?.[emoji] || [];
    const updated = current.includes(user.uid) ? current.filter(id => id !== user.uid) : [...current, user.uid];
    await updateDoc(ref, { [`reactions.${emoji}`]: updated });
  };

  const handleCommentInput = (e) => {
    const val = e.target.value;
    setCommentText(val);
    const lastAt = val.lastIndexOf('@');
    if (lastAt !== -1 && !val.slice(lastAt + 1).includes(' ')) {
      setMentionSearch(val.slice(lastAt + 1)); setShowMentions(true);
    } else { setShowMentions(false); }
  };

  const insertMention = (member) => {
    const lastAt = commentText.lastIndexOf('@');
    setCommentText(commentText.slice(0, lastAt) + `@${member.name} `);
    setShowMentions(false);
    commentInputRef.current?.focus();
  };

  // ── Derived ───────────────────────────────────────────
  const isOverdue = dueDate && isPast(new Date(dueDate + 'T23:59:59')) && status !== 'done';
  const statusCfg   = STATUSES.find(s => s.id === status) || STATUSES[0];
  const priorityCfg = PRIORITIES.find(p => p.label === priority) || PRIORITIES[1];
  const filteredMembers = members.filter(m =>
    m.name?.toLowerCase().includes(assigneeSearch.toLowerCase()) ||
    m.email?.toLowerCase().includes(assigneeSearch.toLowerCase())
  );
  const mentionCandidates = members.filter(m => m.name?.toLowerCase().includes(mentionSearch.toLowerCase()));

  if (!task) return null;

  // ── Activity label ────────────────────────────────────
  const activityLabel = (log) => {
    switch (log.type) {
      case 'created':         return <><b>{log.byName}</b> created this task</>;
      case 'status_changed':  return <><b>{log.byName}</b> changed status from <b>{log.from}</b> → <b>{log.to}</b></>;
      case 'priority_changed':return <><b>{log.byName}</b> changed priority to <b>{log.to}</b></>;
      case 'assigned':        return <><b>{log.byName}</b> assigned <b>{log.memberName}</b></>;
      case 'unassigned':      return <><b>{log.byName}</b> removed <b>{log.memberName}</b></>;
      case 'tag_added':       return <><b>{log.byName}</b> added tag <b>{log.tag}</b></>;
      case 'tag_removed':     return <><b>{log.byName}</b> removed tag <b>{log.tag}</b></>;
      case 'due_date_set':    return <><b>{log.byName}</b> set due date to <b>{log.to}</b></>;
      default: return <><b>{log.byName}</b> updated the task</>;
    }
  };

  return (
    <AnimatePresence>
      {/* Toast */}
      <AnimatePresence>{toast && <Toast msg={toast} onDone={() => setToast('')} />}</AnimatePresence>

      <div className="fixed inset-0 z-[200] flex items-stretch justify-end">
        {/* Backdrop */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }} onClick={onClose}
          className="absolute inset-0 bg-dark-900/70 backdrop-blur-sm" />

        {/* Panel */}
        <motion.div
          initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 32, stiffness: 320, mass: 0.75 }}
          className="relative z-10 w-full max-w-[88vw] xl:max-w-[1240px] bg-[#0f1117] border-l border-white/8 flex h-full shadow-2xl"
          onClick={e => {
            // close dropdowns on panel click
            if (showStatusMenu)   setShowStatusMenu(false);
            if (showPriorityMenu) setShowPriorityMenu(false);
            if (showTagMenu)      setShowTagMenu(false);
            if (showAssigneeMenu) setShowAssigneeMenu(false);
            if (showMoreMenu)     setShowMoreMenu(false);
          }}
        >

          {/* ═══ LEFT PANE ════════════════════════════════════════════════ */}
          <div className="flex-[1.4] flex flex-col overflow-hidden border-r border-white/5 min-w-0">

            {/* ── Sticky header ── */}
            <div className="shrink-0 px-7 py-4 border-b border-white/5 bg-[#0f1117]/90 backdrop-blur-xl flex items-center gap-3">
              {/* Back */}
              <button onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all shrink-0">
                <ArrowLeft size={17} />
              </button>

              {/* Task ID */}
              <span className="text-[11px] font-mono text-slate-600 shrink-0">
                {task.id ? `#${task.id.slice(-8).toUpperCase()}` : 'Draft'}
              </span>

              <div className="w-px h-4 bg-white/10 shrink-0" />

              {/* Status pill */}
              <div className="relative" onClick={e => e.stopPropagation()}>
                <button onClick={() => setShowStatusMenu(v => !v)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all hover:bg-white/5 ${statusCfg.ring} border-opacity-50`}>
                  {statusCfg.icon}
                  <span className="text-slate-200">{statusCfg.label}</span>
                  <ChevronDown size={11} className="text-slate-500" />
                </button>
                <AnimatePresence>
                  {showStatusMenu && (
                    <motion.div initial={{ opacity: 0, y: -4, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.97 }}
                      className="absolute top-full left-0 mt-1.5 w-44 bg-dark-800 border border-white/10 rounded-xl shadow-2xl z-50 py-1 overflow-hidden">
                      {STATUSES.map(s => (
                        <button key={s.id} onClick={() => handleStatusChange(s.id)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold hover:bg-white/5 transition-colors text-left ${status === s.id ? 'text-white' : 'text-slate-400'}`}>
                          {s.icon} {s.label}
                          {status === s.id && <Check size={12} className="ml-auto text-primary-400" />}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Priority pill */}
              <div className="relative" onClick={e => e.stopPropagation()}>
                <button onClick={() => setShowPriorityMenu(v => !v)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all hover:bg-white/5 ${priorityCfg.border} ${priorityCfg.text}`}>
                  <span className={`w-2 h-2 rounded-full ${priorityCfg.dot} shrink-0`} />
                  {priorityCfg.label}
                  <ChevronDown size={11} className="opacity-60" />
                </button>
                <AnimatePresence>
                  {showPriorityMenu && (
                    <motion.div initial={{ opacity: 0, y: -4, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.97 }}
                      className="absolute top-full left-0 mt-1.5 w-36 bg-dark-800 border border-white/10 rounded-xl shadow-2xl z-50 py-1 overflow-hidden">
                      {PRIORITIES.map(p => (
                        <button key={p.label} onClick={() => handlePriorityChange(p.label)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-bold hover:bg-white/5 transition-colors text-left ${p.text}`}>
                          <span className={`w-2 h-2 rounded-full ${p.dot} shrink-0`} /> {p.label}
                          {priority === p.label && <Check size={11} className="ml-auto text-white/50" />}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Save state */}
              <div className="ml-auto flex items-center gap-2">
                <SaveBadge state={saveState} />

                {/* Actions */}
                {isNewTask ? (
                  <button onClick={handleCreate} disabled={!title.trim()}
                    className="px-4 py-1.5 bg-primary-600 hover:bg-primary-500 disabled:opacity-40 text-white text-xs font-black rounded-lg transition-all flex items-center gap-1.5">
                    <Plus size={13} /> Create Task
                  </button>
                ) : (
                  <>
                    <button onClick={handleShare}
                      className="p-1.5 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg transition-all" title="Copy link">
                      <ClipboardCopy size={15} />
                    </button>

                    {/* More menu */}
                    <div className="relative" onClick={e => e.stopPropagation()}>
                      <button onClick={() => setShowMoreMenu(v => !v)}
                        className="p-1.5 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg transition-all">
                        <MoreHorizontal size={16} />
                      </button>
                      <AnimatePresence>
                        {showMoreMenu && (
                          <motion.div initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="absolute right-0 top-full mt-1.5 w-48 bg-dark-800 border border-white/10 rounded-xl shadow-2xl z-50 py-1.5 overflow-hidden">
                            <button onClick={() => { navigator.clipboard.writeText(task.id || ''); setShowMoreMenu(false); setToast('ID copied!'); }}
                              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-colors text-left">
                              <Copy size={13} /> Copy Task ID
                            </button>
                            <button onClick={() => { handleShare(); setShowMoreMenu(false); }}
                              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-colors text-left">
                              <ClipboardCopy size={13} /> Share Link
                            </button>
                            <div className="border-t border-white/5 my-1" />
                            {confirmDelete ? (
                              <div className="px-3 py-2 space-y-1.5">
                                <p className="text-xs text-red-300 font-semibold">Delete this task?</p>
                                <div className="flex gap-2">
                                  <button onClick={() => setConfirmDelete(false)}
                                    className="flex-1 py-1 text-xs bg-dark-700 hover:bg-dark-600 text-slate-300 rounded-lg transition-colors">
                                    Cancel
                                  </button>
                                  <button onClick={() => { setShowMoreMenu(false); handleDeleteTask(); }}
                                    disabled={deleting}
                                    className="flex-1 py-1 text-xs bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors flex items-center justify-center gap-1 disabled:opacity-50">
                                    {deleting ? <Loader2 size={11} className="animate-spin" /> : 'Delete'}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button onClick={() => setConfirmDelete(true)}
                                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors text-left">
                                <Trash2 size={13} /> Delete Task
                              </button>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* ── Scrollable content ── */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="px-8 py-7 flex flex-col gap-7 max-w-3xl">

                {/* Title */}
                <textarea
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  onBlur={() => saveField('title', title)}
                  rows={1}
                  placeholder="Task title…"
                  className="w-full bg-transparent text-[28px] font-extrabold text-white tracking-tight resize-none outline-none placeholder:text-slate-700 leading-snug"
                  style={{ minHeight: '40px' }}
                  onInput={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                />

                {/* ── Properties strip ── */}
                <div className="flex flex-wrap gap-1.5 -mx-1.5" onClick={e => e.stopPropagation()}>

                  {/* Assignees */}
                  <div className="relative">
                    <button onClick={() => setShowAssigneeMenu(v => !v)}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/8 transition-all text-xs text-slate-400 hover:text-white">
                      <Users size={13} className="text-slate-500" />
                      {assignees.length === 0 ? (
                        <span>Assign</span>
                      ) : (
                        <div className="flex items-center -space-x-1.5">
                          {assignees.slice(0, 3).map(a => <Avatar key={a.id} name={a.name} photoURL={a.photoURL} size={5} />)}
                          {assignees.length > 3 && <span className="text-[10px] text-slate-400 pl-2">+{assignees.length - 3}</span>}
                        </div>
                      )}
                    </button>
                    <AnimatePresence>
                      {showAssigneeMenu && (
                        <motion.div initial={{ opacity: 0, y: -4, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="absolute top-full left-0 mt-1.5 w-60 bg-dark-800 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
                          <div className="p-2 border-b border-white/5">
                            <div className="flex items-center gap-2 bg-dark-900/60 rounded-lg px-2.5 py-1.5">
                              <Search size={12} className="text-slate-500" />
                              <input autoFocus value={assigneeSearch} onChange={e => setAssigneeSearch(e.target.value)}
                                placeholder="Search member…" className="w-full bg-transparent text-xs text-white outline-none placeholder:text-slate-500" />
                            </div>
                          </div>
                          <div className="max-h-44 overflow-y-auto custom-scrollbar p-1">
                            {filteredMembers.length === 0
                              ? <p className="text-xs text-slate-600 text-center py-3">No members found</p>
                              : filteredMembers.map(m => {
                                const isAssigned = assignees.some(a => a.id === m.id);
                                return (
                                  <button key={m.id} onClick={() => toggleAssignee(m)}
                                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-white/5 transition-colors text-left">
                                    <Avatar name={m.name} photoURL={m.photoURL} size={6} />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-semibold text-white truncate">{m.name}</p>
                                      <p className="text-[10px] text-slate-500 truncate">{m.email}</p>
                                    </div>
                                    {isAssigned && <Check size={12} className="text-primary-400 shrink-0" />}
                                  </button>
                                );
                              })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Due date */}
                  <div className="relative flex items-center">
                    <Calendar size={13} className="text-slate-600 absolute left-2.5 pointer-events-none" />
                    <input type="date" value={dueDate}
                      onChange={e => {
                        setDueDate(e.target.value);
                        saveField('dueDate', e.target.value, { type: 'due_date_set', to: e.target.value });
                      }}
                      className={`pl-8 pr-3 py-1.5 rounded-lg border bg-transparent text-xs outline-none cursor-pointer transition-all
                        [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer
                        hover:bg-white/5 hover:border-white/8
                        ${isOverdue ? 'border-red-500/40 text-red-300' : 'border-transparent text-slate-400 hover:text-white'}`}
                      title="Due date"
                    />
                    {!dueDate && <span className="absolute left-8 text-xs text-slate-600 pointer-events-none">Due date</span>}
                  </div>

                  {/* Start date */}
                  <div className="relative flex items-center">
                    <Clock size={13} className="text-slate-600 absolute left-2.5 pointer-events-none" />
                    <input type="date" value={startDate}
                      onChange={e => { setStartDate(e.target.value); saveField('startDate', e.target.value); }}
                      className="pl-8 pr-3 py-1.5 rounded-lg border border-transparent hover:border-white/8 bg-transparent text-xs text-slate-400 hover:text-white outline-none cursor-pointer transition-all hover:bg-white/5 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                      title="Start date"
                    />
                    {!startDate && <span className="absolute left-8 text-xs text-slate-600 pointer-events-none">Start date</span>}
                  </div>

                  {/* Time estimate */}
                  <div className="relative flex items-center">
                    <Timer size={13} className="text-slate-600 absolute left-2.5 pointer-events-none z-10" />
                    <input
                      value={timeEst}
                      onChange={e => setTimeEst(e.target.value)}
                      onBlur={() => saveField('timeEstimate', timeEst)}
                      placeholder="Estimate"
                      className="pl-8 pr-3 py-1.5 w-28 rounded-lg border border-transparent hover:border-white/8 bg-transparent text-xs text-slate-400 hover:text-white outline-none transition-all hover:bg-white/5 placeholder:text-slate-600 focus:border-white/10 focus:bg-white/5"
                      title="e.g. 2h, 3d, 1w"
                    />
                  </div>

                  {/* Tags */}
                  <div className="relative" onClick={e => e.stopPropagation()}>
                    <button onClick={() => setShowTagMenu(v => !v)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-transparent hover:border-white/8 hover:bg-white/5 transition-all">
                      {tags.length === 0 ? (
                        <><Tag size={12} className="text-slate-600" /><span className="text-xs text-slate-600">Add label</span></>
                      ) : (
                        <div className="flex items-center gap-1 flex-wrap">
                          {tags.map(t => {
                            const cfg = tagCfg(t);
                            return (
                              <span key={t} className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                                {t}
                              </span>
                            );
                          })}
                          <Tag size={11} className="text-slate-600 ml-0.5" />
                        </div>
                      )}
                    </button>
                    <AnimatePresence>
                      {showTagMenu && (
                        <motion.div initial={{ opacity: 0, y: -4, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="absolute top-full left-0 mt-1.5 w-52 bg-dark-800 border border-white/10 rounded-xl shadow-2xl z-50 p-2">
                          <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest px-1.5 pb-1.5">Labels</p>
                          <div className="grid grid-cols-2 gap-1">
                            {TAG_OPTIONS.map(t => {
                              const active = tags.includes(t.label);
                              return (
                                <button key={t.label} onClick={() => toggleTag(t.label)}
                                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-bold border transition-all text-left ${
                                    active ? `${t.bg} ${t.text} ${t.border}` : 'bg-transparent text-slate-500 border-transparent hover:bg-white/5 hover:text-slate-300'
                                  }`}>
                                  {active && <Check size={10} className="shrink-0" />}
                                  {t.label}
                                </button>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* ── Description ── */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-1.5">
                      <AlignLeft size={12} /> Description
                    </span>
                    <button onClick={() => {
                      const prompt = encodeURIComponent(`Write a clear task description for: "${title || 'this task'}". Include goal, steps, and acceptance criteria.`);
                      window.open(`https://chat.openai.com/?q=${prompt}`, '_blank');
                    }} className="flex items-center gap-1 text-[10px] font-bold text-primary-400/70 hover:text-primary-300 transition-colors">
                      <Sparkles size={11} /> AI Draft
                    </button>
                  </div>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    onBlur={() => saveField('description', description)}
                    rows={5}
                    placeholder="Add context, goals, or acceptance criteria…"
                    className="w-full bg-dark-800/30 hover:bg-dark-800/50 border border-white/5 hover:border-white/8 focus:border-primary-500/40 focus:bg-dark-800/60 rounded-xl px-4 py-3 text-sm text-slate-300 outline-none resize-none placeholder:text-slate-700 transition-all"
                  />
                </div>

                {/* ── Subtasks ── */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-1.5">
                      <CheckSquare size={12} /> Subtasks
                      {subtasks.length > 0 && (
                        <span className="normal-case tracking-normal font-medium text-slate-500 ml-1">
                          {doneCount}/{subtasks.length}
                        </span>
                      )}
                    </span>
                    {subtasks.length > 0 && (
                      <span className={`text-[10px] font-bold ${progress === 100 ? 'text-emerald-400' : 'text-slate-600'}`}>
                        {progress}%
                      </span>
                    )}
                  </div>

                  {/* Progress bar */}
                  {subtasks.length > 0 && (
                    <div className="h-1 w-full bg-dark-700 rounded-full overflow-hidden">
                      <motion.div animate={{ width: `${progress}%` }} transition={{ type: 'spring', damping: 20 }}
                        className={`h-full rounded-full ${progress === 100 ? 'bg-emerald-500' : 'bg-primary-500'}`} />
                    </div>
                  )}

                  {/* List */}
                  {subtasks.length > 0 && (
                    <div className="space-y-0.5">
                      {subtasks.map(st => (
                        <SubtaskRow key={st.id} subtask={st} taskPath={taskPath} onDelete={handleDeleteSubtask} />
                      ))}
                    </div>
                  )}

                  {/* Add input */}
                  {!isNewTask ? (
                    <div className="flex items-center gap-2 pl-1">
                      <button onClick={() => subtaskInputRef.current?.focus()}
                        className="w-[18px] h-[18px] rounded-[5px] border-2 border-dashed border-white/15 hover:border-primary-400/50 flex items-center justify-center transition-all shrink-0">
                        <Plus size={10} className="text-slate-500" />
                      </button>
                      <input
                        ref={subtaskInputRef}
                        value={newSubtask}
                        onChange={e => setNewSubtask(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleAddSubtask();
                          if (e.key === 'Escape') setNewSubtask('');
                        }}
                        placeholder="Add a subtask…"
                        className="flex-1 bg-transparent text-sm text-slate-400 placeholder:text-slate-700 outline-none focus:text-white transition-colors"
                      />
                      {newSubtask.trim() && (
                        <button onClick={handleAddSubtask} disabled={addingSubtask}
                          className="text-[10px] text-primary-400 hover:text-primary-300 font-bold transition-colors shrink-0">
                          {addingSubtask ? <Loader2 size={12} className="animate-spin" /> : 'Add'}
                        </button>
                      )}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-700 pl-6 italic">Save task to add subtasks</p>
                  )}
                </div>

                {/* ── Attachments ── */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-1.5">
                      <Paperclip size={12} /> Attachments
                      {attachments.length > 0 && <span className="normal-case tracking-normal font-medium text-slate-500">{attachments.length}</span>}
                    </span>
                    {!isNewTask && (
                      <button onClick={() => setShowAttachForm(v => !v)}
                        className="text-[10px] font-bold text-slate-600 hover:text-primary-400 transition-colors flex items-center gap-1">
                        <Plus size={11} /> Add link
                      </button>
                    )}
                  </div>

                  {/* List */}
                  {attachments.map(att => (
                    <div key={att.id} className="flex items-center gap-2.5 p-2.5 bg-dark-800/30 border border-white/5 rounded-xl group hover:border-white/8 transition-all">
                      <Link2 size={13} className="text-slate-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-200 truncate">{att.name}</p>
                        <p className="text-[10px] text-slate-600 truncate">{att.url}</p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <a href={att.url} target="_blank" rel="noreferrer"
                          className="p-1 text-slate-500 hover:text-primary-400 rounded transition-colors"><ExternalLink size={12} /></a>
                        <button onClick={() => handleDeleteAttachment(att.id)}
                          className="p-1 text-slate-500 hover:text-red-400 rounded transition-colors"><Trash2 size={12} /></button>
                      </div>
                    </div>
                  ))}

                  {/* Add form */}
                  <AnimatePresence>
                    {showAttachForm && !isNewTask && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }} className="space-y-2">
                        <input autoFocus value={attachUrl} onChange={e => setAttachUrl(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleAddAttachment(); if (e.key === 'Escape') setShowAttachForm(false); }}
                          placeholder="Paste URL (https://…)"
                          className="w-full bg-dark-800/40 border border-white/8 focus:border-primary-500/40 rounded-lg px-3 py-2 text-sm text-white outline-none placeholder:text-slate-600 transition-all" />
                        <div className="flex gap-2">
                          <input value={attachName} onChange={e => setAttachName(e.target.value)}
                            placeholder="Label (optional)"
                            className="flex-1 bg-dark-800/40 border border-white/8 rounded-lg px-3 py-2 text-sm text-white outline-none placeholder:text-slate-600 transition-all" />
                          <button onClick={handleAddAttachment} disabled={!attachUrl.trim()}
                            className="px-3 py-2 bg-primary-600 hover:bg-primary-500 disabled:opacity-40 text-white text-xs font-bold rounded-lg transition-all">
                            Attach
                          </button>
                          <button onClick={() => setShowAttachForm(false)}
                            className="px-3 py-2 bg-dark-700 hover:bg-dark-600 text-slate-400 text-xs rounded-lg transition-all">
                            Cancel
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {attachments.length === 0 && !showAttachForm && (
                    <p className="text-[11px] text-slate-700 italic">No attachments yet</p>
                  )}
                </div>

              </div>
            </div>
          </div>

          {/* ═══ RIGHT PANE ════════════════════════════════════════════════ */}
          <div className="w-[400px] shrink-0 flex flex-col bg-[#0b0d13] overflow-hidden">

            {/* Tab bar */}
            <div className="shrink-0 flex border-b border-white/5">
              {[
                { id: 'comments', label: 'Comments', icon: <MessageSquare size={13} />, count: comments.length },
                { id: 'activity', label: 'Activity',  icon: <Zap size={13} />,            count: activityLog.length },
              ].map(tab => (
                <button key={tab.id} onClick={() => setRightTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-3.5 text-xs font-bold transition-all border-b-2 ${
                    rightTab === tab.id
                      ? 'border-primary-500 text-white'
                      : 'border-transparent text-slate-600 hover:text-slate-400'
                  }`}>
                  {tab.icon} {tab.label}
                  {tab.count > 0 && (
                    <span className={`text-[9px] px-1 rounded-full font-black ${rightTab === tab.id ? 'bg-primary-500/20 text-primary-300' : 'bg-dark-700 text-slate-500'}`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* ── Comments tab ── */}
            {rightTab === 'comments' && (
              <>
                <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-5 space-y-5">
                  {comments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-slate-700">
                      <MessageSquare size={28} className="mb-2 opacity-30" />
                      <p className="text-sm font-semibold">No comments yet</p>
                      <p className="text-xs mt-1">Start the conversation below</p>
                    </div>
                  ) : (
                    comments.map((c, i) => {
                      const isMe = c.authorId === user?.uid;
                      const time = c.createdAt?.toDate
                        ? formatDistanceToNow(c.createdAt.toDate(), { addSuffix: true })
                        : '…';
                      return (
                        <motion.div key={c.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i < 10 ? i * 0.03 : 0 }}
                          className="group flex gap-3">
                          <Avatar name={c.authorName} photoURL={c.authorPhoto} size={7} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2 mb-1">
                              <span className="text-xs font-bold text-white">{isMe ? 'You' : c.authorName}</span>
                              <span className="text-[10px] text-slate-600">{time}</span>
                            </div>
                            <div className="text-sm text-slate-300 leading-relaxed break-words">{c.text}</div>

                            {/* Reactions */}
                            {c.reactions && Object.entries(c.reactions).some(([, uids]) => uids?.length > 0) && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {Object.entries(c.reactions).filter(([, uids]) => uids?.length > 0).map(([emoji, uids]) => (
                                  <button key={emoji} onClick={() => toggleReaction(c.id, emoji)}
                                    className={`text-xs px-1.5 py-0.5 rounded-full border transition-all ${
                                      uids.includes(user?.uid)
                                        ? 'bg-primary-500/20 border-primary-500/40 text-primary-300'
                                        : 'bg-dark-700 border-dark-600 text-slate-400 hover:border-dark-500'
                                    }`}>
                                    {emoji} {uids.length}
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* Hover actions */}
                            <div className="flex items-center gap-1.5 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              {EMOJI_SET.slice(0, 5).map(e => (
                                <button key={e} onClick={() => toggleReaction(c.id, e)}
                                  className="text-sm hover:scale-125 transition-transform opacity-50 hover:opacity-100">
                                  {e}
                                </button>
                              ))}
                              {isMe && (
                                <button onClick={() => handleDeleteComment(c.id)}
                                  className="ml-1 p-1 text-slate-700 hover:text-red-400 transition-colors rounded">
                                  <Trash2 size={11} />
                                </button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                  <div ref={feedEndRef} />
                </div>

                {/* Comment input */}
                <div className="shrink-0 p-4 border-t border-white/5">
                  <div className="relative">
                    <AnimatePresence>
                      {showMentions && mentionCandidates.length > 0 && (
                        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
                          className="absolute bottom-full left-0 w-52 mb-2 bg-dark-800 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden p-1">
                          {mentionCandidates.map(m => (
                            <button key={m.id} onClick={() => insertMention(m)}
                              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/5 rounded-lg text-xs text-white transition-colors text-left">
                              <Avatar name={m.name} photoURL={m.photoURL} size={6} /> {m.name}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="bg-dark-800/60 border border-white/8 rounded-xl focus-within:border-primary-500/40 transition-all overflow-hidden">
                      <textarea
                        ref={commentInputRef}
                        value={commentText}
                        onChange={handleCommentInput}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendComment(); } }}
                        placeholder={isNewTask ? 'Save task to comment…' : 'Comment… (@ mention, ↵ send)'}
                        disabled={isNewTask}
                        rows={2}
                        className="w-full bg-transparent px-4 pt-3 pb-1 text-sm text-white outline-none resize-none placeholder:text-slate-700 custom-scrollbar disabled:opacity-40"
                      />
                      <div className="flex items-center justify-between px-3 pb-2 pt-1">
                        <div className="flex items-center gap-0.5">
                          {/* Emoji */}
                          <div className="relative">
                            <button onClick={() => !isNewTask && setShowEmojiPicker(v => !v)}
                              className="p-1.5 text-slate-600 hover:text-slate-300 rounded-lg transition-colors">
                              <Smile size={15} />
                            </button>
                            <AnimatePresence>
                              {showEmojiPicker && (
                                <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.92 }}
                                  className="absolute bottom-10 left-0 flex flex-wrap gap-1.5 p-2.5 bg-dark-800 border border-white/10 rounded-xl shadow-2xl z-50 w-[200px]">
                                  {EMOJI_SET.map(e => (
                                    <button key={e} onClick={() => { setCommentText(v => v + e); setShowEmojiPicker(false); }}
                                      className="text-lg hover:scale-125 transition-transform p-1 hover:bg-white/5 rounded-lg">{e}</button>
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                          {/* Mention trigger */}
                          <button onClick={() => { if (!isNewTask) { setCommentText(v => v + '@'); commentInputRef.current?.focus(); } }}
                            className="p-1.5 text-slate-600 hover:text-slate-300 rounded-lg transition-colors text-xs font-black">
                            @
                          </button>
                        </div>
                        <button onClick={handleSendComment} disabled={isNewTask || !commentText.trim() || sending}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-500 disabled:opacity-30 text-white text-xs font-bold rounded-lg transition-all">
                          {sending ? <Loader2 size={12} className="animate-spin" /> : <><Send size={12} /> Send</>}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ── Activity tab ── */}
            {rightTab === 'activity' && (
              <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-5 space-y-3">
                {activityLog.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-slate-700">
                    <Activity size={28} className="mb-2 opacity-30" />
                    <p className="text-sm font-semibold">No activity yet</p>
                    <p className="text-xs mt-1">Changes will appear here</p>
                  </div>
                ) : (
                  activityLog.map(log => {
                    const time = log.at?.toDate
                      ? formatDistanceToNow(log.at.toDate(), { addSuffix: true })
                      : '…';
                    return (
                      <div key={log.id} className="flex gap-3 items-start">
                        <div className="w-6 h-6 rounded-full bg-dark-700 border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                          <Zap size={10} className="text-primary-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-400 leading-relaxed">{activityLabel(log)}</p>
                          <p className="text-[10px] text-slate-700 mt-0.5">{time}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
