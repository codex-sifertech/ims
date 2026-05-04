import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ChevronDown, Plus, Paperclip, Smile, Send, Download,
  Clock, Flag, Tag, AlignLeft, CheckSquare, Link2, List,
  Calendar, Users, User, Trash2, ArrowLeft, Share, MoreHorizontal,
  Copy, Maximize2, Sparkles, Search, Bell, Filter, Mic, Type, FileUp,
  Activity, ArrowRight, MessageSquare
} from 'lucide-react';
import {
  doc, collection, addDoc, updateDoc, onSnapshot,
  serverTimestamp, query, orderBy
} from 'firebase/firestore';
import { db } from '../../firebase';
import useStore from '../../store/useStore';
import { format, isPast } from 'date-fns';

const PRIORITIES = [
  { label: 'Low',    color: 'bg-emerald-500/20', dot: 'bg-emerald-400', text: 'text-emerald-300', border: 'border-emerald-500/30', hover: 'hover:border-emerald-500/50' },
  { label: 'Medium', color: 'bg-blue-500/20',    dot: 'bg-blue-400',    text: 'text-blue-300',    border: 'border-blue-500/30',    hover: 'hover:border-blue-500/50' },
  { label: 'High',   color: 'bg-amber-500/20',   dot: 'bg-amber-400',   text: 'text-amber-300',   border: 'border-amber-500/30',   hover: 'hover:border-amber-500/50' },
  { label: 'Urgent', color: 'bg-red-500/20',     dot: 'bg-red-400',     text: 'text-red-300',     border: 'border-red-500/30',     hover: 'hover:border-red-500/50' },
];

const STATUSES = [
  { id: 'todo', label: 'To Do', icon: '⚪' },
  { id: 'in-progress', label: 'In Progress', icon: '🟡' },
  { id: 'review', label: 'In Review', icon: '🔵' },
  { id: 'done', label: 'Done', icon: '🟢' }
];

const EMOJI_SET = ['👍','❤️','😂','🎉','👀','🔥','✅','🚀'];

function MemberChip({ member, onRemove }) {
  return (
    <motion.span 
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="flex items-center gap-1.5 px-2 py-1 bg-dark-700/50 backdrop-blur-sm border border-white/5 hover:border-white/10 rounded-full text-xs text-white font-medium transition-all shadow-sm"
    >
      {member.photoURL ? (
        <img src={member.photoURL} alt={member.name} className="w-5 h-5 rounded-full object-cover" />
      ) : (
        <span className="w-5 h-5 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-[9px] font-black uppercase shrink-0 shadow-inner">
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
      {Object.entries(reactions).filter(([,uids]) => uids.length > 0).map(([emoji, uids]) => (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          key={emoji}
          onClick={() => toggleReaction(emoji)}
          className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-all ${
            uids.includes(user?.uid)
              ? 'bg-primary-500/20 border-primary-500/40 text-primary-300 shadow-[0_0_10px_rgba(99,102,241,0.1)]'
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

export default function TaskDetailPanel({ task, onClose, onUpdate, onCreate, members = [] }) {
  const { user } = useStore();

  // Handle case where task is new (no id yet) or existing
  const isNewTask = !task?.id;

  const handleCreate = () => {
    if (!title.trim()) {
      alert('Task title is required.');
      return;
    }
    if (onCreate) {
      onCreate({
        title: title.trim(),
        status,
        priority,
        description,
        assignedTo: assignees,
        startDate,
        dueDate,
      });
      onClose();
    }
  };


  // Editable fields
  const [title, setTitle] = useState(task?.title || '');
  const [status, setStatus] = useState(task?.status || 'todo');
  const [priority, setPriority] = useState(task?.priority || 'Medium');
  const [startDate, setStartDate] = useState(task?.startDate || '');
  const [dueDate, setDueDate] = useState(task?.dueDate || '');
  const [description, setDescription] = useState(task?.description || '');
  const [assignees, setAssignees] = useState(task?.assignedTo || []);
  const [showAssigneeSearch, setShowAssigneeSearch] = useState(false);
  const [assigneeSearch, setAssigneeSearch] = useState('');
  
  // Custom Dropdowns
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);

  // Comments
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [sending, setSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const commentInputRef = useRef(null);
  const commentsEndRef = useRef(null);

  const taskPath = task?._path;

  // Subscribe to comments only if task exists in DB
  useEffect(() => {
    if (!taskPath) return;
    const commentsRef = collection(db, taskPath, 'comments');
    const q = query(commentsRef, orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, snap => {
      setComments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [taskPath]);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  // Auto-save field changes
  const saveField = async (field, value) => {
    if (isNewTask) {
      onUpdate?.({ [field]: value });
      return;
    }
    if (!taskPath) return;
    try {
      await updateDoc(doc(db, taskPath), { [field]: value, updatedAt: new Date().toISOString() });
      onUpdate?.({ [field]: value });
    } catch (e) { console.error('Save failed:', e); }
  };

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
        type: 'text'
      });
      setCommentText('');
    } finally { setSending(false); }
  };

  const handleCommentInput = (e) => {
    const val = e.target.value;
    setCommentText(val);
    // @member mentions
    const lastAt = val.lastIndexOf('@');
    if (lastAt !== -1 && !val.slice(lastAt + 1).includes(' ')) {
      setMentionSearch(val.slice(lastAt + 1));
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (member) => {
    const lastAt = commentText.lastIndexOf('@');
    setCommentText(commentText.slice(0, lastAt) + `@${member.name} `);
    setShowMentions(false);
    commentInputRef.current?.focus();
  };

  const toggleAssignee = (member) => {
    const existing = assignees.find(a => a.id === member.id);
    const updated = existing
      ? assignees.filter(a => a.id !== member.id)
      : [...assignees, { id: member.id, name: member.name, photoURL: member.photoURL }];
    setAssignees(updated);
    saveField('assignedTo', updated);
  };

  const isOverdue = dueDate && isPast(new Date(dueDate)) && status !== 'done';
  const priorityCfg = PRIORITIES.find(p => p.label === priority) || PRIORITIES[1];
  const statusCfg = STATUSES.find(s => s.id === status) || STATUSES[0];
  const filteredMembers = members.filter(m =>
    m.name?.toLowerCase().includes(assigneeSearch.toLowerCase()) ||
    m.email?.toLowerCase().includes(assigneeSearch.toLowerCase())
  );
  const mentionCandidates = members.filter(m =>
    m.name?.toLowerCase().includes(mentionSearch.toLowerCase())
  );

  if (!task) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-stretch justify-end">
        {/* Animated Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={onClose}
          className="absolute inset-0 bg-dark-900/60 backdrop-blur-md"
        />

        {/* Panel Container - Two Panel Layout with Glassmorphism */}
        <motion.div
          initial={{ x: '100%', opacity: 0.5 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0.5 }}
          transition={{ type: 'spring', damping: 30, stiffness: 300, mass: 0.8 }}
          className="relative z-10 w-full max-w-[90vw] xl:max-w-[1300px] bg-dark-900/95 border-l border-white/10 flex flex-col h-full shadow-[0_0_40px_rgba(0,0,0,0.5)] overflow-hidden"
        >
          {/* Main Body - Split into Left and Right */}
          <div className="flex flex-1 min-h-0 bg-gradient-to-br from-dark-900 to-dark-850">

            {/* ── LEFT PANE: Task Information ── */}
            <div className="flex-[5.5] flex flex-col overflow-y-auto custom-scrollbar border-r border-white/5 min-w-0 relative">
              
              {/* Premium Breadcrumb Navigation Header */}
              <div className="sticky top-0 z-20 bg-dark-900/80 backdrop-blur-xl px-10 py-5 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm text-slate-400">
                  <motion.button 
                    whileHover={{ x: -2 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={onClose} 
                    className="p-1.5 hover:bg-white/5 rounded-lg transition-colors text-slate-300 border border-transparent hover:border-white/10"
                  >
                    <ArrowLeft size={18} />
                  </motion.button>
                  <div className="flex items-center gap-2.5 font-medium">
                    <span className="hover:text-primary-400 cursor-pointer transition-colors">Workspace</span>
                    <ChevronDown size={14} className="text-slate-600 -rotate-90" />
                    <span className="hover:text-primary-400 cursor-pointer transition-colors">Project</span>
                    <ChevronDown size={14} className="text-slate-600 -rotate-90" />
                    <span className="hover:text-primary-400 cursor-pointer transition-colors">List</span>
                    <ChevronDown size={14} className="text-slate-600 -rotate-90" />
                    <span className="px-2 py-1 bg-white/5 rounded-md text-slate-200 border border-white/5 shadow-inner">
                      {task.id || 'Draft Task'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isNewTask ? (
                    <motion.button 
                      whileHover={{ scale: 1.05 }} 
                      whileTap={{ scale: 0.95 }} 
                      onClick={handleCreate}
                      className="px-5 py-2 flex items-center gap-2 text-xs font-black text-white bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 rounded-xl transition-all shadow-[0_0_15px_rgba(99,102,241,0.4)] uppercase tracking-widest"
                    >
                      <Plus size={14} /> Create Task
                    </motion.button>
                  ) : (
                    <>
                      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="px-3 py-1.5 flex items-center gap-2 text-xs font-bold text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors">
                        <Share size={14} /> Share
                      </motion.button>
                      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg border border-transparent hover:border-white/10 transition-colors">
                        <MoreHorizontal size={18} />
                      </motion.button>
                    </>
                  )}
                </div>
              </div>

              {/* Task Content Area */}
              <div className="px-10 py-8 flex flex-col gap-8 max-w-4xl mx-auto w-full">
                
                {/* Title Section */}
                <div className="group relative">
                  <div className="absolute -left-6 top-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-1.5 h-6 bg-primary-500 rounded-r-full"></div>
                  </div>
                  <textarea
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    onBlur={() => saveField('title', title)}
                    rows={1}
                    className="w-full bg-transparent text-4xl font-extrabold text-white tracking-tight resize-none outline-none placeholder:text-slate-600 focus:bg-white/[0.02] rounded-2xl transition-all p-2 -ml-2 border border-transparent focus:border-white/10 focus:shadow-[0_0_20px_rgba(255,255,255,0.02)]"
                    placeholder="Task Title..."
                    style={{ minHeight: '64px', lineHeight: '1.2' }}
                    onInput={(e) => {
                      e.target.style.height = 'auto';
                      e.target.style.height = e.target.scrollHeight + 'px';
                    }}
                  />
                </div>

                {/* Properties Grid - Premium Glassmorphism */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 bg-white/[0.02] backdrop-blur-sm rounded-2xl border border-white/5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)]">
                  
                  {/* Status Property */}
                  <div className="flex flex-col gap-2 relative">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                      <Activity size={12} /> Status
                    </span>
                    <button 
                      onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                      className="flex items-center justify-between w-full px-3 py-2 bg-dark-800/50 hover:bg-dark-700/50 border border-white/5 rounded-xl text-sm font-medium text-white transition-all text-left group"
                    >
                      <span className="flex items-center gap-2">
                        <span>{statusCfg.icon}</span> {statusCfg.label}
                      </span>
                      <ChevronDown size={14} className="text-slate-500 group-hover:text-white transition-colors" />
                    </button>
                    {showStatusDropdown && (
                      <div className="absolute top-full left-0 mt-1 w-full bg-dark-800 border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden py-1">
                        {STATUSES.map(s => (
                          <button key={s.id} onClick={() => { setStatus(s.id); saveField('status', s.id); setShowStatusDropdown(false); }}
                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/5 text-sm text-white transition-colors text-left">
                            <span>{s.icon}</span> {s.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Priority Property */}
                  <div className="flex flex-col gap-2 relative">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                      <Flag size={12} /> Priority
                    </span>
                    <button 
                      onClick={() => setShowPriorityDropdown(!showPriorityDropdown)}
                      className={`flex items-center justify-between w-full px-3 py-2 ${priorityCfg.color} border ${priorityCfg.border} ${priorityCfg.hover} rounded-xl text-sm font-bold ${priorityCfg.text} transition-all text-left group`}
                    >
                      <span className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${priorityCfg.dot} shadow-[0_0_8px_currentColor]`} />
                        {priorityCfg.label}
                      </span>
                      <ChevronDown size={14} className="opacity-50 group-hover:opacity-100 transition-opacity" />
                    </button>
                    {showPriorityDropdown && (
                      <div className="absolute top-full left-0 mt-1 w-full bg-dark-800 border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden py-1">
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
                    <div className="relative group">
                      <input type="date" value={startDate}
                        onChange={e => { setStartDate(e.target.value); saveField('startDate', e.target.value); }}
                        className="w-full bg-dark-800/50 hover:bg-dark-700/50 border border-white/5 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/50 transition-all cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-50 [&::-webkit-calendar-picker-indicator]:hover:opacity-100" />
                    </div>
                  </div>

                  {/* Due Date */}
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                      <Clock size={12} /> Due Date
                    </span>
                    <div className="relative group">
                      <input type="date" value={dueDate}
                        onChange={e => { setDueDate(e.target.value); saveField('dueDate', e.target.value); }}
                        className={`w-full bg-dark-800/50 hover:bg-dark-700/50 border rounded-xl px-3 py-2 text-sm outline-none transition-all cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-50 [&::-webkit-calendar-picker-indicator]:hover:opacity-100 ${
                          isOverdue ? 'border-red-500/50 text-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-500/50' : 'border-white/5 text-slate-200 focus:border-primary-500 focus:ring-1 focus:ring-primary-500/50'
                        }`} />
                      {isOverdue && (
                        <span className="absolute -top-2 -right-2 text-[9px] text-red-200 font-black uppercase bg-red-500 px-1.5 py-0.5 rounded shadow-[0_0_10px_rgba(239,68,68,0.4)]">
                          Overdue
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Assignees Field - Span 2 columns */}
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
                      <motion.button
                        whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.1)' }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowAssigneeSearch(v => !v)}
                        className="h-7 px-2.5 rounded-full border border-dashed border-white/20 hover:border-primary-400 flex items-center gap-1 text-slate-400 hover:text-primary-300 transition-all text-xs font-medium"
                      >
                        <Plus size={12} /> Add
                      </motion.button>
                      
                      {showAssigneeSearch && (
                        <motion.div 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="absolute top-full left-0 mt-2 w-64 bg-dark-800/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] z-50 overflow-hidden"
                        >
                          <div className="p-2 border-b border-white/5">
                            <div className="flex items-center gap-2 bg-dark-900/50 rounded-xl px-3 py-1.5 border border-white/5">
                              <Search size={14} className="text-slate-500" />
                              <input
                                autoFocus
                                value={assigneeSearch}
                                onChange={e => setAssigneeSearch(e.target.value)}
                                placeholder="Search member…"
                                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                              />
                            </div>
                          </div>
                          <div className="max-h-48 overflow-y-auto custom-scrollbar p-1">
                            {filteredMembers.map(m => (
                              <button key={m.id} onClick={() => { toggleAssignee(m); setShowAssigneeSearch(false); setAssigneeSearch(''); }}
                                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/5 rounded-xl text-sm text-slate-200 transition-colors text-left">
                                <span className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-600 to-primary-700 flex items-center justify-center text-[10px] font-black uppercase shadow-inner">{m.name?.charAt(0)}</span>
                                <div className="flex flex-col">
                                  <span className="font-medium text-white">{m.name}</span>
                                  <span className="text-[10px] text-slate-500">{m.email}</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </div>

                </div>

                {/* Description Area */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-extrabold text-white flex items-center gap-2 uppercase tracking-wider">
                      <AlignLeft size={16} className="text-primary-400" />
                      Details
                    </h3>
                    <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="group flex items-center gap-2 text-xs font-bold text-white bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-500 hover:to-purple-500 px-4 py-1.5 rounded-full transition-all shadow-[0_0_15px_rgba(99,102,241,0.3)] hover:shadow-[0_0_20px_rgba(99,102,241,0.5)] border border-white/10"
                    >
                      <Sparkles size={14} className="group-hover:animate-pulse" /> AI Assist
                    </motion.button>
                  </div>
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-dark-900/10 pointer-events-none rounded-2xl"></div>
                    <textarea
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      onBlur={() => saveField('description', description)}
                      rows={8}
                      placeholder="Add a detailed description, or press the AI Assist button to generate one..."
                      className="w-full bg-white/[0.01] hover:bg-white/[0.02] border border-white/5 hover:border-white/10 rounded-2xl px-5 py-4 text-base text-slate-300 outline-none focus:border-primary-500/50 focus:bg-white/[0.03] transition-all resize-y placeholder:text-slate-600 min-h-[160px] shadow-inner"
                    />
                  </div>
                </div>

                {/* Action Modules */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { icon: CheckSquare, label: 'Add Subtask', desc: 'Break it down', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
                    { icon: Link2, label: 'Relate Tasks', desc: 'Dependencies', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
                    { icon: FileUp, label: 'Add Attachment', desc: 'Files & Media', color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/20' },
                    { icon: Plus, label: 'Custom Field', desc: 'More info', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
                  ].map(({ icon: Icon, label, desc, color, bg, border }) => (
                    <motion.button 
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      key={label}
                      className={`flex items-start gap-3 p-3 bg-white/[0.02] hover:bg-white/[0.04] border ${border} rounded-2xl transition-all text-left group`}
                    >
                      <div className={`p-2 rounded-xl ${bg} ${color} shadow-inner`}>
                        <Icon size={16} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors">{label}</span>
                        <span className="text-[10px] font-medium text-slate-500">{desc}</span>
                      </div>
                    </motion.button>
                  ))}
                </div>

              </div>
            </div>

            {/* ── RIGHT PANE: Activity & Communication ── */}
            <div className="flex-[4] min-w-[380px] max-w-[500px] flex flex-col bg-dark-900 border-l border-white/5 h-full relative overflow-hidden">
              {/* Subtle background glow */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary-600/5 rounded-full blur-3xl pointer-events-none"></div>

              {/* Activity Header */}
              <div className="h-20 px-6 border-b border-white/5 flex items-center justify-between shrink-0 bg-transparent relative z-10">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary-500/10 rounded-xl text-primary-400">
                    <Activity size={18} />
                  </div>
                  <h3 className="text-sm font-black text-white uppercase tracking-widest">Activity</h3>
                </div>
                <div className="flex gap-1">
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors">
                    <Search size={16} />
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors relative">
                    <Bell size={16} />
                    <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors">
                    <Filter size={16} />
                  </motion.button>
                </div>
              </div>

              {/* Vertically Scrollable Activity Feed */}
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 custom-scrollbar relative z-10">
                
                {/* Initial Task Creation Event Example */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-4 items-start opacity-70">
                  <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 shrink-0 mt-1">
                    <Sparkles size={12} />
                  </div>
                  <div className="flex-1 bg-white/[0.02] border border-white/5 p-3 rounded-2xl rounded-tl-sm">
                    <p className="text-sm text-slate-300">
                      <span className="font-bold text-white">System</span> generated this space
                    </p>
                    <span className="text-xs text-slate-500 font-medium">Just now</span>
                  </div>
                </motion.div>

                {comments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-slate-500 text-sm font-medium text-center bg-white/[0.01] rounded-2xl border border-dashed border-white/5 mt-4">
                    <MessageSquare size={24} className="mb-2 opacity-50" />
                    No comments yet.<br/>Start the conversation below!
                  </div>
                ) : (
                  comments.map((c, i) => {
                    const isMe = c.authorId === user?.uid;
                    const time = c.createdAt?.toDate ? format(c.createdAt.toDate(), 'MMM d, h:mm a') : '...';
                    return (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        transition={{ delay: i * 0.05 }}
                        key={c.id} 
                        className={`group flex gap-4 ${isMe ? 'flex-row-reverse' : ''}`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black uppercase shrink-0 mt-1 shadow-inner ${
                          isMe 
                          ? 'bg-gradient-to-br from-primary-500 to-primary-700 text-white border border-primary-400/30' 
                          : 'bg-dark-700 border border-white/10 text-slate-300'
                        }`}>
                          {c.authorName?.charAt(0) || '?'}
                        </div>
                        
                        <div className={`flex flex-col flex-1 ${isMe ? 'items-end' : 'items-start'}`}>
                          <div className="flex items-center gap-2 mb-1.5 px-1">
                            <span className="text-sm font-bold text-slate-200">{isMe ? 'You' : c.authorName}</span>
                            <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">{time}</span>
                          </div>
                          
                          {c.type === 'file' ? (
                            <div className={`flex items-center gap-3 p-3 border rounded-2xl ${
                              isMe ? 'bg-primary-600/20 border-primary-500/30 rounded-tr-sm' : 'bg-white/[0.03] border-white/5 rounded-tl-sm'
                            }`}>
                              <div className="p-2 bg-dark-900/50 rounded-lg">
                                <FileUp size={16} className={isMe ? "text-primary-300" : "text-slate-400"} />
                              </div>
                              <span className="text-sm font-medium text-slate-200 flex-1 truncate">{c.fileName}</span>
                              <a href={c.fileUrl} download target="_blank" rel="noreferrer"
                                className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all border border-transparent hover:border-white/10">
                                <Download size={14} />
                              </a>
                            </div>
                          ) : (
                            <div className={`px-4 py-3 text-sm text-slate-100 leading-relaxed shadow-sm max-w-[90%] border ${
                              isMe 
                              ? 'bg-gradient-to-br from-primary-600/20 to-primary-800/20 border-primary-500/30 rounded-2xl rounded-tr-sm' 
                              : 'bg-white/[0.03] border-white/5 rounded-2xl rounded-tl-sm'
                            }`}>
                              {c.text}
                            </div>
                          )}
                          
                          <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            <EmojiReactions reactions={c.reactions} messageId={c.id} taskPath={taskPath} />
                            
                            {/* Inline hover actions */}
                            <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity bg-dark-900/80 backdrop-blur border border-white/10 rounded-full px-2 py-1 shadow-xl">
                              {EMOJI_SET.slice(0, 5).map(e => (
                                <button key={e} onClick={async () => {
                                  const msgRef = doc(db, taskPath, 'comments', c.id);
                                  const current = (c.reactions || {})[e] || [];
                                  const updated = current.includes(user.uid)
                                    ? current.filter(id => id !== user.uid)
                                    : [...current, user.uid];
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

              {/* Fixed Comment Input Box - Premium Glassmorphism */}
              <div className="p-5 bg-dark-900/80 backdrop-blur-xl border-t border-white/5 shrink-0 relative z-20">
                <div className="relative">
                  {/* Mention Dropdown */}
                  <AnimatePresence>
                    {showMentions && mentionCandidates.length > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                        className="absolute bottom-full left-0 w-64 mb-3 bg-dark-800/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] overflow-hidden z-50 p-1"
                      >
                        {mentionCandidates.map(m => (
                          <button key={m.id} onClick={() => insertMention(m)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 rounded-xl text-sm font-medium text-slate-200 transition-colors text-left">
                            <span className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-[10px] uppercase shadow-inner">{m.name?.charAt(0)}</span>
                            {m.name}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="bg-white/[0.02] border border-white/10 rounded-3xl focus-within:border-primary-500/50 focus-within:bg-white/[0.04] focus-within:shadow-[0_0_30px_rgba(99,102,241,0.1)] transition-all overflow-hidden relative">
                    <textarea
                      ref={commentInputRef}
                      value={commentText}
                      onChange={handleCommentInput}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendComment(); } }}
                      placeholder={isNewTask ? "Save task to enable comments..." : "Type a message... (Use @ to mention)"}
                      disabled={isNewTask}
                      rows={2}
                      className="w-full bg-transparent px-5 pt-4 pb-2 text-sm text-white outline-none resize-none placeholder:text-slate-500 custom-scrollbar disabled:opacity-50"
                    />
                    
                    {/* Toolbar */}
                    <div className="flex items-center justify-between px-3 pb-3 pt-1">
                      <div className="flex items-center gap-1 bg-dark-900/50 rounded-full p-1 border border-white/5">
                        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} disabled={isNewTask} className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors tooltip disabled:opacity-50" title="Attach file">
                          <Paperclip size={16} />
                        </motion.button>
                        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} disabled={isNewTask} className="p-1.5 text-primary-400 hover:text-primary-300 hover:bg-primary-500/20 rounded-full transition-colors tooltip disabled:opacity-50" title="AI Assist">
                          <Sparkles size={16} />
                        </motion.button>
                        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} disabled={isNewTask} className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors font-bold tooltip disabled:opacity-50" title="Mention">
                          @
                        </motion.button>
                        <div className="relative">
                          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => !isNewTask && setShowEmojiPicker(v => !v)} className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors tooltip disabled:opacity-50" title="Emoji">
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
                        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} disabled={isNewTask} className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors tooltip disabled:opacity-50" title="Voice Message">
                          <Mic size={16} />
                        </motion.button>
                      </div>
                      <motion.button
                        whileHover={(!isNewTask && commentText.trim() && !sending) ? { scale: 1.05 } : {}}
                        whileTap={(!isNewTask && commentText.trim() && !sending) ? { scale: 0.95 } : {}}
                        onClick={handleSendComment}
                        disabled={isNewTask || !commentText.trim() || sending}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 disabled:from-dark-700 disabled:to-dark-700 disabled:text-slate-500 text-white text-xs font-black rounded-full transition-all uppercase tracking-widest shadow-[0_0_15px_rgba(99,102,241,0.4)] disabled:shadow-none"
                      >
                        Send <ArrowRight size={14} />
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
