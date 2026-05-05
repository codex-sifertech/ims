import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ChevronDown, Plus, Paperclip, Smile, Send, Download,
  Clock, Flag, Tag, AlignLeft, CheckSquare, Link2, List,
  Calendar, Users, User, Trash2, ArrowLeft, Share, MoreHorizontal,
  Copy, Sparkles, Search, Bell, Filter, Mic, FileUp,
  Activity, ArrowRight, MessageSquare, Check, ExternalLink,
  CheckCircle2, Circle, MoreVertical, ClipboardCopy, Loader2,
  FileText, StickyNote, Globe, BookOpen, UploadCloud
} from 'lucide-react';
import {
  doc, collection, addDoc, updateDoc, deleteDoc, onSnapshot,
  serverTimestamp, query, orderBy, arrayUnion, arrayRemove, getDoc
} from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase';
import useStore from '../../store/useStore';
import { format, isPast } from 'date-fns';
import { sendNotification } from '../../utils/notifications';
import { syncTaskToGoogleCalendar } from '../../utils/calendarSync';

const PRIORITIES = [
  { label: 'Low',    color: 'bg-emerald-500/20', dot: 'bg-emerald-400', text: 'text-emerald-300', border: 'border-emerald-500/30', hover: 'hover:border-emerald-500/50' },
  { label: 'Medium', color: 'bg-blue-500/20',    dot: 'bg-blue-400',    text: 'text-blue-300',    border: 'border-blue-500/30',    hover: 'hover:border-blue-500/50' },
  { label: 'High',   color: 'bg-amber-500/20',   dot: 'bg-amber-400',   text: 'text-amber-300',   border: 'border-amber-500/30',   hover: 'hover:border-amber-500/50' },
  { label: 'Urgent', color: 'bg-red-500/20',     dot: 'bg-red-400',     text: 'text-red-300',     border: 'border-red-500/30',     hover: 'hover:border-red-500/50' },
];

const STATUSES = [
  { id: 'todo',        label: 'To Do',       icon: '⚪' },
  { id: 'in-progress', label: 'In Progress', icon: '🟡' },
  { id: 'review',      label: 'In Review',   icon: '🔵' },
  { id: 'done',        label: 'Done',        icon: '🟢' },
];

const EMOJI_SET = ['👍','❤️','😂','🎉','👀','🔥','✅','🚀'];

// ── Link type detector ─────────────────────────────────────────────────────

function detectLinkType(url = '') {
  const u = url.toLowerCase();
  if (u.includes('figma.com'))             return { label: 'Figma',         emoji: '🎨', color: 'bg-purple-500/10 border-purple-500/20 text-purple-300' };
  if (u.includes('notion.so'))             return { label: 'Notion',        emoji: '📝', color: 'bg-white/5 border-white/10 text-slate-300' };
  if (u.includes('github.com'))            return { label: 'GitHub',        emoji: '💻', color: 'bg-slate-500/10 border-slate-500/20 text-slate-300' };
  if (u.includes('docs.google.com'))       return { label: 'Google Docs',   emoji: '📄', color: 'bg-blue-500/10 border-blue-500/20 text-blue-300' };
  if (u.includes('sheets.google.com'))     return { label: 'Google Sheets', emoji: '📊', color: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' };
  if (u.includes('drive.google.com'))      return { label: 'Google Drive',  emoji: '☁️', color: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-300' };
  if (u.includes('loom.com'))              return { label: 'Loom',          emoji: '🎥', color: 'bg-pink-500/10 border-pink-500/20 text-pink-300' };
  if (u.includes('linear.app'))            return { label: 'Linear',        emoji: '⚡', color: 'bg-violet-500/10 border-violet-500/20 text-violet-300' };
  if (u.includes('atlassian.net') || u.includes('jira.com')) return { label: 'Jira', emoji: '🔷', color: 'bg-blue-500/10 border-blue-500/20 text-blue-300' };
  if (u.includes('miro.com'))              return { label: 'Miro',          emoji: '🖼️', color: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-300' };
  if (u.includes('slack.com'))             return { label: 'Slack',         emoji: '💬', color: 'bg-amber-500/10 border-amber-500/20 text-amber-300' };
  if (u.includes('meet.google.com'))       return { label: 'Google Meet',   emoji: '📹', color: 'bg-green-500/10 border-green-500/20 text-green-300' };
  if (u.includes('calendar.google.com'))   return { label: 'Calendar',      emoji: '📅', color: 'bg-green-500/10 border-green-500/20 text-green-300' };
  return { label: 'Link', emoji: '🔗', color: 'bg-white/[0.03] border-white/5 text-slate-400' };
}

// ── Small reusable components ──────────────────────────────────────────────

function MemberChip({ member, onRemove }) {
  return (
    <motion.span
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="flex items-center gap-1.5 px-2 py-1 bg-dark-700/50 border border-white/5 hover:border-white/10 rounded-full text-xs text-white font-medium transition-all"
    >
      {member.photoURL ? (
        <img src={member.photoURL} alt={member.name} className="w-5 h-5 rounded-full object-cover" />
      ) : (
        <span className="w-5 h-5 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-[9px] font-black uppercase shrink-0">
          {member.name?.charAt(0) || '?'}
        </span>
      )}
      <span className="pr-1">{member.name}</span>
      {onRemove && (
        <button onClick={() => onRemove(member.id)} className="text-slate-400 hover:text-red-400 transition-colors ml-0.5">
          <X size={12} />
        </button>
      )}
    </motion.span>
  );
}

function EmojiReactions({ reactions = {}, messageId, taskPath }) {
  const { user } = useStore();
  const toggleReaction = async (emoji) => {
    if (!taskPath) return;
    const msgRef = doc(db, taskPath, 'comments', messageId);
    const current = reactions[emoji] || [];
    const updated = current.includes(user.uid)
      ? current.filter(id => id !== user.uid)
      : [...current, user.uid];
    await updateDoc(msgRef, { [`reactions.${emoji}`]: updated });
  };
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {Object.entries(reactions).filter(([, uids]) => uids.length > 0).map(([emoji, uids]) => (
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} key={emoji}
          onClick={() => toggleReaction(emoji)}
          className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-all ${
            uids.includes(user?.uid)
              ? 'bg-primary-500/20 border-primary-500/40 text-primary-300'
              : 'bg-dark-800/80 border-white/5 text-slate-300 hover:border-white/20'
          }`}
        >
          <span>{emoji}</span>
          <span className="font-semibold">{uids.length}</span>
        </motion.button>
      ))}
    </div>
  );
}

// ── Subtask row ────────────────────────────────────────────────────────────

function SubtaskRow({ subtask, taskPath, onDelete }) {
  const toggle = async () => {
    if (!taskPath) return;
    await updateDoc(doc(db, taskPath, 'subtasks', subtask.id), {
      done: !subtask.done,
      updatedAt: serverTimestamp(),
    });
  };

  return (
    <div className="flex items-center gap-2.5 group py-1.5">
      <button onClick={toggle}
        className={`shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-all ${
          subtask.done
            ? 'bg-emerald-500 border-emerald-500 text-white'
            : 'border-white/20 hover:border-primary-400 bg-transparent'
        }`}>
        {subtask.done && <Check size={10} />}
      </button>
      <span className={`flex-1 text-sm transition-colors ${subtask.done ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
        {subtask.title}
      </span>
      <button onClick={() => onDelete(subtask.id)}
        className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all">
        <Trash2 size={12} />
      </button>
    </div>
  );
}

// ── Attachment card ────────────────────────────────────────────────────────

function AttachmentCard({ att, onDelete }) {
  const type = detectLinkType(att.url);
  return (
    <div className={`flex items-center gap-3 p-3 border rounded-xl group hover:border-white/20 transition-all ${type.color}`}>
      <span className="text-xl shrink-0">{type.emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-slate-100 truncate">{att.name || att.url}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[9px] font-bold uppercase tracking-widest opacity-60">{type.label}</span>
          <span className="text-[9px] text-slate-600">·</span>
          <p className="text-[9px] text-slate-500 truncate max-w-[180px]">{att.url}</p>
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <a href={att.url} target="_blank" rel="noreferrer"
          className="p-1.5 text-slate-400 hover:text-primary-400 hover:bg-primary-500/10 rounded-lg transition-all">
          <ExternalLink size={12} />
        </a>
        <button onClick={() => onDelete(att.id)}
          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all">
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

// ── Toast ──────────────────────────────────────────────────────────────────

function Toast({ msg, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2000);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
      className="fixed bottom-6 right-6 z-[300] bg-dark-800 border border-white/10 shadow-2xl rounded-xl px-4 py-2.5 flex items-center gap-2 text-sm text-white font-semibold">
      <CheckCircle2 size={16} className="text-emerald-400" /> {msg}
    </motion.div>
  );
}

// ── Main panel ─────────────────────────────────────────────────────────────

export default function TaskDetailPanel({ task, onClose, onUpdate, onCreate, onDelete, members = [] }) {
  const { user } = useStore();
  const isNewTask = !task?.id;
  const taskPath = task?._path;

  // ── Editable fields ──────────────────────────────────
  const [title, setTitle] = useState(task?.title || '');
  const [status, setStatus] = useState(task?.status || 'todo');
  const [priority, setPriority] = useState(task?.priority || 'Medium');
  const [startDate, setStartDate] = useState(task?.startDate || (isNewTask ? new Date().toISOString().split('T')[0] : ''));
  const [dueDate, setDueDate] = useState(task?.dueDate || '');
  const [description, setDescription] = useState(task?.description || '');
  const [notes, setNotes] = useState(task?.notes || '');
  const [assignees, setAssignees] = useState(
    task?.assignedTo || (isNewTask && user ? [{ id: user.uid, name: user.name, photoURL: user.photoURL, email: user.email }] : [])
  );

  // ── UI state ─────────────────────────────────────────
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);
  const [showAssigneeSearch, setShowAssigneeSearch] = useState(false);
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [toast, setToast] = useState('');
  const [deleting, setDeleting] = useState(false);

  // ── Subtasks ─────────────────────────────────────────
  const [subtasks, setSubtasks] = useState([]);
  const [localSubtasks, setLocalSubtasks] = useState([]); // For new tasks before saving
  const [showSubtasks, setShowSubtasks] = useState(true);
  const [newSubtask, setNewSubtask] = useState('');
  const [addingSubtask, setAddingSubtask] = useState(false);
  const subtaskInputRef = useRef(null);

  // ── Attachments ───────────────────────────────────────
  const [attachments, setAttachments] = useState(task?.attachments || []);
  const [attachUrl, setAttachUrl] = useState('');
  const [attachName, setAttachName] = useState('');
  const [addingAttachment, setAddingAttachment] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef(null);

  // ── Notes auto-save ────────────────────────────────────
  const [savingNotes, setSavingNotes] = useState(false);
  const notesTimer = useRef(null);

  // ── Comments ─────────────────────────────────────────
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [sending, setSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const commentInputRef = useRef(null);
  const commentsEndRef = useRef(null);

  // ── Subscribe to subtasks ─────────────────────────────
  useEffect(() => {
    if (!taskPath) return;
    const q = query(collection(db, taskPath, 'subtasks'), orderBy('createdAt', 'asc'));
    return onSnapshot(q, snap => {
      setSubtasks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [taskPath]);

  // ── Subscribe to comments ─────────────────────────────
  useEffect(() => {
    if (!taskPath) return;
    const q = query(collection(db, taskPath, 'comments'), orderBy('createdAt', 'asc'));
    return onSnapshot(q, snap => setComments(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [taskPath]);

  useEffect(() => { commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [comments]);

  // Keep local attachments in sync when task prop changes
  useEffect(() => { setAttachments(task?.attachments || []); }, [task?.attachments]);

  // ── Auto-save helpers ──────────────────────────────────
  const saveField = async (field, value) => {
    if (isNewTask) { onUpdate?.({ [field]: value }); return; }
    if (!taskPath) return;
    try {
      await updateDoc(doc(db, taskPath), { [field]: value, updatedAt: new Date().toISOString() });
      if (field === 'status' && value === 'done') {
        (Array.isArray(task.assignedTo) ? task.assignedTo : []).forEach(m =>
          sendNotification(m.id, user, 'completed', `completed task "${task.title}"`, task.id)
        );
      }
      const updated = { ...task, [field]: value };
      if (!isNewTask && updated.dueDate && ['title', 'description', 'dueDate', 'assignedTo'].includes(field)) {
        syncTaskToGoogleCalendar(user.uid, updated);
      }
      onUpdate?.({ [field]: value });
    } catch (e) { console.error('Save failed:', e); }
  };

  // ── Notes auto-save (debounced 800ms) ─────────────────
  const handleNotesChange = (val) => {
    setNotes(val);
    if (notesTimer.current) clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(async () => {
      setSavingNotes(true);
      await saveField('notes', val);
      setSavingNotes(false);
    }, 800);
  };

  // ── Subtask actions ────────────────────────────────────
  const handleAddSubtask = async () => {
    if (!newSubtask.trim()) return;
    if (isNewTask) {
      // Store locally for new tasks
      setLocalSubtasks(prev => [...prev, { id: `local-${Date.now()}`, title: newSubtask.trim(), done: false }]);
      setNewSubtask('');
      subtaskInputRef.current?.focus();
      return;
    }
    if (!taskPath) { setToast('Save the task first to add subtasks'); return; }
    setAddingSubtask(true);
    try {
      await addDoc(collection(db, taskPath, 'subtasks'), {
        title: newSubtask.trim(),
        done: false,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setNewSubtask('');
      subtaskInputRef.current?.focus();
    } catch (e) { console.error(e); }
    setAddingSubtask(false);
  };

  const handleDeleteSubtask = async (subtaskId) => {
    if (isNewTask) {
      setLocalSubtasks(prev => prev.filter(s => s.id !== subtaskId));
      return;
    }
    if (!taskPath) return;
    await deleteDoc(doc(db, taskPath, 'subtasks', subtaskId));
  };

  const displaySubtasks = isNewTask ? localSubtasks : subtasks;
  const doneCount = displaySubtasks.filter(s => s.done).length;
  const subtaskProgress = displaySubtasks.length > 0 ? Math.round((doneCount / displaySubtasks.length) * 100) : 0;

  // ── Attachment actions ─────────────────────────────────
  const handleAddAttachment = async () => {
    if (!attachUrl.trim()) return;
    if (!taskPath && !isNewTask) { setToast('Save the task first to add attachments'); return; }
    setAddingAttachment(true);
    try {
      const newAtt = {
        id: Date.now().toString(),
        url: attachUrl.trim(),
        name: attachName.trim() || attachUrl.trim(),
        addedBy: user.uid,
        addedAt: new Date().toISOString(),
      };
      const updated = [...attachments, newAtt];
      if (!isNewTask && taskPath) {
        await updateDoc(doc(db, taskPath), { attachments: updated, updatedAt: new Date().toISOString() });
      }
      setAttachments(updated);
      setAttachUrl('');
      setAttachName('');
    } catch (e) { console.error(e); }
    setAddingAttachment(false);
  };

  // ── File upload ─────────────────────────────────────────
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!taskPath && !isNewTask) { setToast('Save the task first'); return; }
    setUploadingFile(true);
    try {
      const filePath = `tasks/${task?.id || 'draft'}/${Date.now()}_${file.name}`;
      const fileRef = storageRef(storage, filePath);
      await uploadBytes(fileRef, file);
      const downloadURL = await getDownloadURL(fileRef);
      const newAtt = {
        id: Date.now().toString(),
        url: downloadURL,
        name: file.name,
        addedBy: user.uid,
        addedAt: new Date().toISOString(),
      };
      const updated = [...attachments, newAtt];
      if (!isNewTask && taskPath) {
        await updateDoc(doc(db, taskPath), { attachments: updated, updatedAt: new Date().toISOString() });
      }
      setAttachments(updated);
      setToast('File uploaded!');
    } catch (err) {
      console.error('Upload failed:', err);
      setToast('Upload failed');
    }
    setUploadingFile(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDeleteAttachment = async (attId) => {
    if (!taskPath) return;
    const updated = attachments.filter(a => a.id !== attId);
    await updateDoc(doc(db, taskPath), { attachments: updated, updatedAt: new Date().toISOString() });
    setAttachments(updated);
  };

  // ── Share ───────────────────────────────────────────────
  const handleShare = async () => {
    const url = `${window.location.origin}${window.location.pathname}?task=${task?.id || ''}`;
    try { await navigator.clipboard.writeText(url); } catch { }
    setToast('Link copied to clipboard!');
  };

  // ── Delete task ─────────────────────────────────────────
  const handleDeleteTask = async () => {
    if (!taskPath) return;
    if (!window.confirm('Delete this task? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, taskPath));
      onDelete?.();
      onClose();
    } catch (e) {
      console.error('Delete failed:', e);
      setDeleting(false);
    }
  };

  // ── Create new task ─────────────────────────────────────
  const handleCreate = () => {
    if (!title.trim()) { alert('Task title is required.'); return; }
    if (onCreate) {
      const newTaskData = {
        title: title.trim(), status, priority, description, notes,
        assignedTo: assignees, startDate, dueDate,
        pendingSubtasks: localSubtasks.map(s => ({ title: s.title, done: s.done })),
        attachments,
      };
      onCreate(newTaskData);
      if (dueDate) syncTaskToGoogleCalendar(user.uid, newTaskData);
      onClose();
    }
  };

  // ── Assignees ────────────────────────────────────────────
  const toggleAssignee = (member) => {
    const existing = assignees.find(a => a.id === member.id);
    const updated = existing
      ? assignees.filter(a => a.id !== member.id)
      : [...assignees, { id: member.id, name: member.name, photoURL: member.photoURL, email: member.email }];
    setAssignees(updated);
    saveField('assignedTo', updated);
    if (!existing) sendNotification(member.id, user, 'assignment', `assigned you to "${task?.title || 'a new task'}"`, task?.id);
  };

  // ── Comments ────────────────────────────────────────────
  const handleSendComment = async () => {
    if (!commentText.trim() || !taskPath || sending) return;
    setSending(true);
    try {
      await addDoc(collection(db, taskPath, 'comments'), {
        text: commentText.trim(),
        authorId: user.uid,
        authorName: user.name || user.email,
        createdAt: serverTimestamp(),
        reactions: {},
        type: 'text',
      });
      const words = commentText.trim().split(/\s+/);
      words.filter(w => w.startsWith('@')).forEach(w => {
        const mentionName = w.substring(1);
        const member = members.find(m => m.name?.toLowerCase() === mentionName.toLowerCase());
        if (member) sendNotification(member.id, user, 'mention', `mentioned you in "${task?.title || 'a task'}"`, task?.id);
      });
      setCommentText('');
    } finally { setSending(false); }
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

  // ── Derived ─────────────────────────────────────────────
  const isOverdue = dueDate && isPast(new Date(dueDate)) && status !== 'done';
  const priorityCfg = PRIORITIES.find(p => p.label === priority) || PRIORITIES[1];
  const statusCfg = STATUSES.find(s => s.id === status) || STATUSES[0];
  const filteredMembers = members.filter(m =>
    m.name?.toLowerCase().includes(assigneeSearch.toLowerCase()) ||
    m.email?.toLowerCase().includes(assigneeSearch.toLowerCase())
  );
  const mentionCandidates = members.filter(m => m.name?.toLowerCase().includes(mentionSearch.toLowerCase()));

  if (!task) return null;

  return (
    <AnimatePresence>
      {/* Toast notification */}
      <AnimatePresence>
        {toast && <Toast msg={toast} onDone={() => setToast('')} />}
      </AnimatePresence>

      <div className="fixed inset-0 z-[200] flex items-stretch justify-end">
        {/* Backdrop */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }} onClick={onClose}
          className="absolute inset-0 bg-dark-900/60 backdrop-blur-md" />

        {/* Panel */}
        <motion.div
          initial={{ x: '100%', opacity: 0.5 }} animate={{ x: 0, opacity: 1 }} exit={{ x: '100%', opacity: 0.5 }}
          transition={{ type: 'spring', damping: 30, stiffness: 300, mass: 0.8 }}
          className="relative z-10 w-full max-w-[90vw] xl:max-w-[1300px] bg-dark-900/95 border-l border-white/10 flex flex-col h-full shadow-[0_0_40px_rgba(0,0,0,0.5)] overflow-hidden"
        >
          <div className="flex flex-1 min-h-0 bg-gradient-to-br from-dark-900 to-dark-850">

            {/* ── LEFT PANE ── */}
            <div className="flex-[5.5] flex flex-col overflow-y-auto custom-scrollbar border-r border-white/5 min-w-0 relative">

              {/* Sticky Header */}
              <div className="sticky top-0 z-20 bg-dark-900/80 backdrop-blur-xl px-10 py-5 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm text-slate-400">
                  <motion.button whileHover={{ x: -2 }} whileTap={{ scale: 0.9 }}
                    onClick={onClose}
                    className="p-1.5 hover:bg-white/5 rounded-lg transition-colors text-slate-300 border border-transparent hover:border-white/10">
                    <ArrowLeft size={18} />
                  </motion.button>
                  <div className="flex items-center gap-2.5 font-medium">
                    <span className="text-slate-500">Task</span>
                    <ChevronDown size={14} className="text-slate-600 -rotate-90" />
                    <span className="px-2 py-1 bg-white/5 rounded-md text-slate-200 border border-white/5">
                      {task.id ? `#${task.id.slice(-6).toUpperCase()}` : 'Draft'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isNewTask ? (
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      onClick={handleCreate}
                      className="px-5 py-2 flex items-center gap-2 text-xs font-black text-white bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 rounded-xl transition-all shadow-[0_0_15px_rgba(99,102,241,0.4)] uppercase tracking-widest">
                      <Plus size={14} /> Create Task
                    </motion.button>
                  ) : (
                    <>
                      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={handleShare}
                        className="px-3 py-1.5 flex items-center gap-2 text-xs font-bold text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors">
                        <ClipboardCopy size={13} /> Copy Link
                      </motion.button>

                      <div className="relative">
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                          onClick={() => setShowMoreMenu(v => !v)}
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg border border-transparent hover:border-white/10 transition-colors">
                          <MoreHorizontal size={18} />
                        </motion.button>
                        <AnimatePresence>
                          {showMoreMenu && (
                            <motion.div initial={{ opacity: 0, scale: 0.95, y: -5 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: -5 }}
                              className="absolute right-0 top-full mt-1 w-44 bg-dark-800 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden py-1">
                              <button onClick={() => { navigator.clipboard.writeText(task.id || ''); setShowMoreMenu(false); setToast('Task ID copied!'); }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/5 text-sm text-slate-300 hover:text-white transition-colors text-left">
                                <Copy size={13} /> Copy Task ID
                              </button>
                              <button onClick={() => { handleShare(); setShowMoreMenu(false); }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/5 text-sm text-slate-300 hover:text-white transition-colors text-left">
                                <Share size={13} /> Share Link
                              </button>
                              <div className="border-t border-white/5 my-1" />
                              <button onClick={() => { setShowMoreMenu(false); handleDeleteTask(); }}
                                disabled={deleting}
                                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-red-500/10 text-sm text-red-400 hover:text-red-300 transition-colors text-left disabled:opacity-50">
                                {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                                Delete Task
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Task Content */}
              <div className="px-10 py-8 flex flex-col gap-8 max-w-4xl mx-auto w-full">

                {/* Title */}
                <div className="group relative">
                  <div className="absolute -left-6 top-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-1.5 h-6 bg-primary-500 rounded-r-full" />
                  </div>
                  <textarea
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    onBlur={() => saveField('title', title)}
                    rows={1}
                    className="w-full bg-transparent text-4xl font-extrabold text-white tracking-tight resize-none outline-none placeholder:text-slate-600 focus:bg-white/[0.02] rounded-2xl transition-all p-2 -ml-2 border border-transparent focus:border-white/10"
                    placeholder="Task Title..."
                    style={{ minHeight: '64px', lineHeight: '1.2' }}
                    onInput={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                  />
                </div>

                {/* Properties Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 bg-white/[0.02] rounded-2xl border border-white/5">

                  {/* Status */}
                  <div className="flex flex-col gap-2 relative">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                      <Activity size={12} /> Status
                    </span>
                    <button onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                      className="flex items-center justify-between w-full px-3 py-2 bg-dark-800/50 hover:bg-dark-700/50 border border-white/5 rounded-xl text-sm font-medium text-white transition-all text-left group">
                      <span className="flex items-center gap-2">{statusCfg.icon} {statusCfg.label}</span>
                      <ChevronDown size={14} className="text-slate-500 group-hover:text-white transition-colors" />
                    </button>
                    {showStatusDropdown && (
                      <div className="absolute top-full left-0 mt-1 w-full bg-dark-800 border border-white/10 rounded-xl shadow-xl z-50 py-1">
                        {STATUSES.map(s => (
                          <button key={s.id} onClick={() => { setStatus(s.id); saveField('status', s.id); setShowStatusDropdown(false); }}
                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/5 text-sm text-white transition-colors text-left">
                            {s.icon} {s.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Priority */}
                  <div className="flex flex-col gap-2 relative">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                      <Flag size={12} /> Priority
                    </span>
                    <button onClick={() => setShowPriorityDropdown(!showPriorityDropdown)}
                      className={`flex items-center justify-between w-full px-3 py-2 ${priorityCfg.color} border ${priorityCfg.border} ${priorityCfg.hover} rounded-xl text-sm font-bold ${priorityCfg.text} transition-all text-left group`}>
                      <span className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${priorityCfg.dot}`} /> {priorityCfg.label}
                      </span>
                      <ChevronDown size={14} className="opacity-50 group-hover:opacity-100 transition-opacity" />
                    </button>
                    {showPriorityDropdown && (
                      <div className="absolute top-full left-0 mt-1 w-full bg-dark-800 border border-white/10 rounded-xl shadow-xl z-50 py-1">
                        {PRIORITIES.map(p => (
                          <button key={p.label} onClick={() => { setPriority(p.label); saveField('priority', p.label); setShowPriorityDropdown(false); }}
                            className={`w-full flex items-center gap-2 px-3 py-2 hover:bg-white/5 text-sm font-bold ${p.text} transition-colors text-left`}>
                            <span className={`w-2 h-2 rounded-full ${p.dot}`} /> {p.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Start Date */}
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                      <Calendar size={12} /> Start Date
                    </span>
                    <input type="date" value={startDate}
                      onChange={e => { setStartDate(e.target.value); saveField('startDate', e.target.value); }}
                      className="w-full bg-dark-800/50 hover:bg-dark-700/50 border border-white/5 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/50 transition-all cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-50 [&::-webkit-calendar-picker-indicator]:hover:opacity-100" />
                  </div>

                  {/* Due Date */}
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                      <Clock size={12} /> Due Date
                    </span>
                    <div className="relative">
                      <input type="date" value={dueDate}
                        onChange={e => { setDueDate(e.target.value); saveField('dueDate', e.target.value); }}
                        className={`w-full bg-dark-800/50 hover:bg-dark-700/50 border rounded-xl px-3 py-2 text-sm outline-none transition-all cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-50 [&::-webkit-calendar-picker-indicator]:hover:opacity-100 ${
                          isOverdue ? 'border-red-500/50 text-red-300 focus:border-red-500' : 'border-white/5 text-slate-200 focus:border-primary-500'
                        }`} />
                      {isOverdue && (
                        <span className="absolute -top-2 -right-2 text-[9px] text-red-200 font-black uppercase bg-red-500 px-1.5 py-0.5 rounded">
                          Overdue
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Assignees */}
                  <div className="flex flex-col gap-2 col-span-2 relative mt-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                      <Users size={12} /> Assignees
                    </span>
                    <div className="flex flex-wrap gap-2 items-center min-h-[36px]">
                      <AnimatePresence>
                        {assignees.map(a => (
                          <MemberChip key={a.id} member={a} onRemove={id => {
                            const updated = assignees.filter(x => x.id !== id);
                            setAssignees(updated);
                            saveField('assignedTo', updated);
                          }} />
                        ))}
                      </AnimatePresence>
                      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={() => setShowAssigneeSearch(v => !v)}
                        className="h-7 px-2.5 rounded-full border border-dashed border-white/20 hover:border-primary-400 flex items-center gap-1 text-slate-400 hover:text-primary-300 transition-all text-xs font-medium">
                        <Plus size={12} /> Add
                      </motion.button>

                      {showAssigneeSearch && (
                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                          className="absolute top-full left-0 mt-2 w-64 bg-dark-800/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] z-50 overflow-hidden">
                          <div className="p-2 border-b border-white/5">
                            <div className="flex items-center gap-2 bg-dark-900/50 rounded-xl px-3 py-1.5 border border-white/5">
                              <Search size={14} className="text-slate-500" />
                              <input autoFocus value={assigneeSearch} onChange={e => setAssigneeSearch(e.target.value)}
                                placeholder="Search member…"
                                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500" />
                            </div>
                          </div>
                          <div className="max-h-48 overflow-y-auto custom-scrollbar p-1">
                            {filteredMembers.length === 0 ? (
                              <p className="text-xs text-slate-500 text-center py-3">No members found</p>
                            ) : filteredMembers.map(m => {
                              const isAssigned = assignees.some(a => a.id === m.id);
                              return (
                                <button key={m.id}
                                  onClick={() => { toggleAssignee(m); setShowAssigneeSearch(false); setAssigneeSearch(''); }}
                                  className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-white/5 rounded-xl text-sm transition-colors text-left ${isAssigned ? 'opacity-50' : ''}`}>
                                  <span className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-600 to-primary-700 flex items-center justify-center text-[10px] font-black uppercase">
                                    {m.name?.charAt(0)}
                                  </span>
                                  <div className="flex flex-col flex-1">
                                    <span className="font-medium text-white">{m.name}</span>
                                    <span className="text-[10px] text-slate-500">{m.email}</span>
                                  </div>
                                  {isAssigned && <Check size={12} className="text-primary-400" />}
                                </button>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-extrabold text-white flex items-center gap-2 uppercase tracking-wider">
                      <AlignLeft size={16} className="text-primary-400" /> Details
                    </h3>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        const prompt = encodeURIComponent(`Write a detailed task description for: "${title || 'a task'}". Include goals, acceptance criteria, and steps.`);
                        window.open(`https://chat.openai.com/?q=${prompt}`, '_blank');
                      }}
                      className="group flex items-center gap-2 text-xs font-bold text-white bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-500 hover:to-purple-500 px-4 py-1.5 rounded-full transition-all shadow-[0_0_15px_rgba(99,102,241,0.3)] border border-white/10">
                      <Sparkles size={14} className="group-hover:animate-pulse" /> AI Assist
                    </motion.button>
                  </div>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    onBlur={() => saveField('description', description)}
                    rows={5}
                    placeholder="Add a detailed description… or click AI Assist to generate one."
                    className="w-full bg-white/[0.01] hover:bg-white/[0.02] border border-white/5 hover:border-white/10 rounded-2xl px-5 py-4 text-base text-slate-300 outline-none focus:border-primary-500/50 transition-all resize-y placeholder:text-slate-600 min-h-[100px]"
                  />
                </div>

                {/* ── Action Modules ── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <motion.button whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}
                    onClick={() => { setShowSubtasks(true); setTimeout(() => subtaskInputRef.current?.focus(), 100); }}
                    className="flex items-start gap-3 p-3 bg-white/[0.02] hover:bg-blue-500/5 border border-blue-500/20 hover:border-blue-500/40 rounded-2xl transition-all text-left group">
                    <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400"><CheckSquare size={16} /></div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-200 group-hover:text-white">Subtasks</span>
                      <span className="text-[10px] font-medium text-slate-500">
                        {displaySubtasks.length > 0 ? `${doneCount}/${displaySubtasks.length} done` : 'Break it down'}
                      </span>
                    </div>
                  </motion.button>

                  <motion.button whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}
                    onClick={() => setTimeout(() => document.getElementById('attach-url-input')?.focus(), 100)}
                    className="flex items-start gap-3 p-3 bg-white/[0.02] hover:bg-pink-500/5 border border-pink-500/20 hover:border-pink-500/40 rounded-2xl transition-all text-left group">
                    <div className="p-2 rounded-xl bg-pink-500/10 text-pink-400"><Link2 size={16} /></div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-200 group-hover:text-white">Add Link</span>
                      <span className="text-[10px] font-medium text-slate-500">
                        {attachments.length > 0 ? `${attachments.length} doc${attachments.length > 1 ? 's' : ''}` : 'Figma, Notion…'}
                      </span>
                    </div>
                  </motion.button>

                  <motion.button whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}
                    onClick={handleShare}
                    className="flex items-start gap-3 p-3 bg-white/[0.02] hover:bg-amber-500/5 border border-amber-500/20 hover:border-amber-500/40 rounded-2xl transition-all text-left group">
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400"><Share size={16} /></div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-200 group-hover:text-white">Share Task</span>
                      <span className="text-[10px] font-medium text-slate-500">Copy link</span>
                    </div>
                  </motion.button>

                  <motion.button whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}
                    onClick={handleDeleteTask}
                    disabled={isNewTask || deleting}
                    className="flex items-start gap-3 p-3 bg-white/[0.02] hover:bg-red-500/5 border border-red-500/20 hover:border-red-500/40 rounded-2xl transition-all text-left group disabled:opacity-30">
                    <div className="p-2 rounded-xl bg-red-500/10 text-red-400">
                      {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-200 group-hover:text-red-300">Delete Task</span>
                      <span className="text-[10px] font-medium text-slate-500">Remove permanently</span>
                    </div>
                  </motion.button>
                </div>

                {/* ── Subtasks Section ── */}
                <AnimatePresence>
                  {showSubtasks && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-extrabold text-white flex items-center gap-2 uppercase tracking-wider">
                          <CheckSquare size={16} className="text-blue-400" />
                          Subtasks
                          {displaySubtasks.length > 0 && (
                            <span className="text-xs font-medium text-slate-500 normal-case tracking-normal">
                              {doneCount}/{displaySubtasks.length}
                            </span>
                          )}
                        </h3>
                        <button onClick={() => setShowSubtasks(false)} className="text-slate-600 hover:text-slate-400 transition-colors">
                          <X size={14} />
                        </button>
                      </div>

                      {displaySubtasks.length > 0 && (
                        <div className="w-full h-1.5 bg-dark-700 rounded-full overflow-hidden">
                          <motion.div animate={{ width: `${subtaskProgress}%` }} className="h-full bg-emerald-500 rounded-full transition-all" />
                        </div>
                      )}

                      <div className="space-y-0.5 bg-white/[0.01] rounded-xl border border-white/5 p-3">
                        {displaySubtasks.length === 0 ? (
                          <p className="text-xs text-slate-600 text-center py-2">No subtasks yet. Add one below.</p>
                        ) : displaySubtasks.map(st => (
                          <SubtaskRow key={st.id} subtask={st} taskPath={taskPath} onDelete={handleDeleteSubtask} />
                        ))}
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          ref={subtaskInputRef}
                          value={newSubtask}
                          onChange={e => setNewSubtask(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleAddSubtask(); }}
                          placeholder={'Add a subtask… (press Enter)'}
                          disabled={false}
                          className="flex-1 bg-dark-800/50 border border-white/5 focus:border-primary-500/50 rounded-xl px-3 py-2 text-sm text-white outline-none placeholder:text-slate-600 transition-all disabled:opacity-40"
                        />
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                          onClick={handleAddSubtask}
                          disabled={!newSubtask.trim() || addingSubtask}
                          className="px-4 py-2 bg-primary-600 hover:bg-primary-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5">
                          {addingSubtask ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Add
                        </motion.button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ── Documents & Links (always visible) ── */}
                <div className="space-y-3">
                  <h3 className="text-sm font-extrabold text-white flex items-center gap-2 uppercase tracking-wider">
                    <Paperclip size={16} className="text-pink-400" />
                    Documents &amp; Links
                    {attachments.length > 0 && (
                      <span className="text-xs font-medium text-slate-500 normal-case">{attachments.length}</span>
                    )}
                  </h3>

                  {attachments.length > 0 ? (
                    <div className="space-y-2">
                      {attachments.map(att => (
                        <AttachmentCard key={att.id} att={att} onDelete={handleDeleteAttachment} />
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-5 text-slate-600 text-xs text-center bg-white/[0.01] border border-dashed border-white/5 rounded-xl">
                      <Paperclip size={20} className="mb-1.5 opacity-40" />
                      No documents yet — paste a Figma, Notion, GitHub or Google Docs link below.
                    </div>
                  )}

                  <div className="p-3 bg-white/[0.02] rounded-xl border border-white/5 space-y-2">
                    {/* File upload button */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="task-file-upload-panel"
                    />
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingFile}
                      className="w-full flex items-center justify-center gap-2.5 py-3 bg-dark-800/50 hover:bg-dark-700/50 border border-dashed border-white/10 hover:border-pink-500/30 rounded-xl text-sm font-bold text-slate-400 hover:text-pink-300 transition-all cursor-pointer">
                      {uploadingFile ? (
                        <><Loader2 size={16} className="animate-spin text-pink-400" /> Uploading…</>
                      ) : (
                        <><UploadCloud size={16} /> Upload File</>
                      )}
                    </motion.button>

                    <div className="flex items-center gap-2 my-2">
                      <div className="flex-1 h-px bg-white/5" />
                      <span className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">or paste a link</span>
                      <div className="flex-1 h-px bg-white/5" />
                    </div>

                    <input
                      id="attach-url-input"
                      value={attachUrl}
                      onChange={e => setAttachUrl(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleAddAttachment(); }}
                      placeholder="Paste a URL — Figma, Notion, GitHub, Google Docs…"
                      className="w-full bg-dark-800/50 border border-white/5 focus:border-pink-500/50 rounded-xl px-3 py-2 text-sm text-white outline-none placeholder:text-slate-600 transition-all"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        value={attachName}
                        onChange={e => setAttachName(e.target.value)}
                        placeholder="Label (optional, e.g. 'Design File')"
                        className="flex-1 bg-dark-800/50 border border-white/5 focus:border-pink-500/50 rounded-xl px-3 py-2 text-sm text-white outline-none placeholder:text-slate-600 transition-all"
                      />
                      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={handleAddAttachment}
                        disabled={!attachUrl.trim() || addingAttachment}
                        className="px-4 py-2 bg-pink-600 hover:bg-pink-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shrink-0">
                        {addingAttachment ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Add
                      </motion.button>
                    </div>
                  </div>
                </div>

                {/* ── Quick Notes ── */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-extrabold text-white flex items-center gap-2 uppercase tracking-wider">
                      <StickyNote size={16} className="text-amber-400" /> Quick Notes
                    </h3>
                    {savingNotes && (
                      <span className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Loader2 size={10} className="animate-spin" /> Saving…
                      </span>
                    )}
                  </div>
                  <textarea
                    value={notes}
                    onChange={e => handleNotesChange(e.target.value)}
                    rows={4}
                    placeholder="Jot down quick notes, paste content snippets, or keep references here…"
                    className="w-full bg-white/[0.01] hover:bg-white/[0.02] border border-white/5 hover:border-amber-500/20 focus:border-amber-500/30 rounded-2xl px-5 py-4 text-sm text-slate-300 outline-none transition-all resize-y placeholder:text-slate-600 min-h-[80px]"
                  />
                </div>

              </div>
            </div>

            {/* ── RIGHT PANE: Activity ── */}
            <div className="flex-[4] min-w-[380px] max-w-[500px] flex flex-col bg-dark-900 border-l border-white/5 h-full relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary-600/5 rounded-full blur-3xl pointer-events-none" />

              {/* Header */}
              <div className="h-20 px-6 border-b border-white/5 flex items-center justify-between shrink-0 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary-500/10 rounded-xl text-primary-400"><Activity size={18} /></div>
                  <h3 className="text-sm font-black text-white uppercase tracking-widest">Activity</h3>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-slate-500 font-semibold">
                  {comments.length > 0 && `${comments.length} comment${comments.length > 1 ? 's' : ''}`}
                </div>
              </div>

              {/* Feed */}
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 custom-scrollbar relative z-10">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="flex gap-4 items-start opacity-60">
                  <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 shrink-0 mt-1">
                    <Sparkles size={12} />
                  </div>
                  <div className="flex-1 bg-white/[0.02] border border-white/5 p-3 rounded-2xl rounded-tl-sm">
                    <p className="text-sm text-slate-300">
                      <span className="font-bold text-white">System</span> generated this task space
                    </p>
                    <span className="text-xs text-slate-500 font-medium">
                      {task.createdAt ? format(new Date(task.createdAt), 'MMM d, h:mm a') : 'Just now'}
                    </span>
                  </div>
                </motion.div>

                {comments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-slate-500 text-sm font-medium text-center bg-white/[0.01] rounded-2xl border border-dashed border-white/5 mt-4">
                    <MessageSquare size={24} className="mb-2 opacity-50" />
                    No comments yet.<br />Start the conversation below!
                  </div>
                ) : (
                  comments.map((c, i) => {
                    const isMe = c.authorId === user?.uid;
                    const time = c.createdAt?.toDate ? format(c.createdAt.toDate(), 'MMM d, h:mm a') : '...';
                    return (
                      <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className={`group flex gap-4 ${isMe ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black uppercase shrink-0 mt-1 ${
                          isMe ? 'bg-gradient-to-br from-primary-500 to-primary-700 text-white border border-primary-400/30' : 'bg-dark-700 border border-white/10 text-slate-300'
                        }`}>
                          {c.authorName?.charAt(0) || '?'}
                        </div>
                        <div className={`flex flex-col flex-1 ${isMe ? 'items-end' : 'items-start'}`}>
                          <div className="flex items-center gap-2 mb-1.5 px-1">
                            <span className="text-sm font-bold text-slate-200">{isMe ? 'You' : c.authorName}</span>
                            <span className="text-[10px] font-medium text-slate-500">{time}</span>
                          </div>
                          <div className={`px-4 py-3 text-sm text-slate-100 leading-relaxed shadow-sm max-w-[90%] border ${
                            isMe
                              ? 'bg-gradient-to-br from-primary-600/20 to-primary-800/20 border-primary-500/30 rounded-2xl rounded-tr-sm'
                              : 'bg-white/[0.03] border-white/5 rounded-2xl rounded-tl-sm'
                          }`}>
                            {c.text}
                          </div>
                          <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            <EmojiReactions reactions={c.reactions} messageId={c.id} taskPath={taskPath} />
                            <div className="flex gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-dark-900/80 backdrop-blur border border-white/10 rounded-full px-2 py-1 shadow-xl">
                              {EMOJI_SET.slice(0, 5).map(e => (
                                <button key={e} onClick={async () => {
                                  if (!taskPath) return;
                                  const msgRef = doc(db, taskPath, 'comments', c.id);
                                  const snap = await getDoc(msgRef);
                                  const current = (snap.data()?.reactions || {})[e] || [];
                                  const updated = current.includes(user.uid) ? current.filter(id => id !== user.uid) : [...current, user.uid];
                                  await updateDoc(msgRef, { [`reactions.${e}`]: updated });
                                }} className="text-base hover:scale-125 transition-transform px-1">{e}</button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
                <div ref={commentsEndRef} />
              </div>

              {/* Comment Input */}
              <div className="p-5 bg-dark-900/80 backdrop-blur-xl border-t border-white/5 shrink-0 relative z-20">
                <div className="relative">
                  <AnimatePresence>
                    {showMentions && mentionCandidates.length > 0 && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                        className="absolute bottom-full left-0 w-56 mb-3 bg-dark-800/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] overflow-hidden z-50 p-1">
                        {mentionCandidates.map(m => (
                          <button key={m.id} onClick={() => insertMention(m)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 rounded-xl text-sm font-medium text-slate-200 transition-colors text-left">
                            <span className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-[10px] uppercase">
                              {m.name?.charAt(0)}
                            </span>
                            {m.name}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="bg-white/[0.02] border border-white/10 rounded-3xl focus-within:border-primary-500/50 focus-within:bg-white/[0.04] focus-within:shadow-[0_0_30px_rgba(99,102,241,0.1)] transition-all overflow-hidden">
                    <textarea
                      ref={commentInputRef}
                      value={commentText}
                      onChange={handleCommentInput}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendComment(); } }}
                      placeholder={isNewTask ? 'Save task to enable comments…' : 'Add a comment… (@ to mention)'}
                      disabled={isNewTask}
                      rows={2}
                      className="w-full bg-transparent px-5 pt-4 pb-2 text-sm text-white outline-none resize-none placeholder:text-slate-500 custom-scrollbar disabled:opacity-50"
                    />
                    <div className="flex items-center justify-between px-3 pb-3 pt-1">
                      <div className="flex items-center gap-1 bg-dark-900/50 rounded-full p-1 border border-white/5">
                        <div className="relative">
                          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                            onClick={() => !isNewTask && setShowEmojiPicker(v => !v)}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors" title="Emoji">
                            <Smile size={16} />
                          </motion.button>
                          <AnimatePresence>
                            {showEmojiPicker && (
                              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                                className="absolute bottom-12 left-0 flex flex-wrap gap-2 p-3 bg-dark-800/95 backdrop-blur border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] z-50 w-[220px]">
                                {EMOJI_SET.map(e => (
                                  <button key={e} onClick={() => { setCommentText(v => v + e); setShowEmojiPicker(false); }}
                                    className="text-xl hover:scale-125 transition-transform p-1.5 hover:bg-white/10 rounded-xl">{e}</button>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                          onClick={() => { if (!isNewTask) { setCommentText(v => v + '@'); commentInputRef.current?.focus(); } }}
                          disabled={isNewTask}
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors font-bold disabled:opacity-50" title="Mention">
                          @
                        </motion.button>
                      </div>
                      <motion.button
                        whileHover={(!isNewTask && commentText.trim() && !sending) ? { scale: 1.05 } : {}}
                        whileTap={(!isNewTask && commentText.trim() && !sending) ? { scale: 0.95 } : {}}
                        onClick={handleSendComment}
                        disabled={isNewTask || !commentText.trim() || sending}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 disabled:from-dark-700 disabled:to-dark-700 disabled:text-slate-500 text-white text-xs font-black rounded-full transition-all uppercase tracking-widest shadow-[0_0_15px_rgba(99,102,241,0.4)] disabled:shadow-none">
                        {sending ? <Loader2 size={14} className="animate-spin" /> : <><Send size={14} /> Send</>}
                      </motion.button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
