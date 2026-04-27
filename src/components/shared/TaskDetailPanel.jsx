import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ChevronDown, Plus, Paperclip, Smile, Send, Download,
  Clock, Flag, Tag, AlignLeft, CheckSquare, Link2, List,
  Calendar, Users, User, Trash2
} from 'lucide-react';
import {
  doc, collection, addDoc, updateDoc, onSnapshot,
  serverTimestamp, query, orderBy
} from 'firebase/firestore';
import { db } from '../../firebase';
import useStore from '../../store/useStore';
import { format, isPast } from 'date-fns';

const PRIORITIES = [
  { label: 'Low',    color: 'bg-emerald-500', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  { label: 'Medium', color: 'bg-blue-500',    text: 'text-blue-400',    border: 'border-blue-500/30' },
  { label: 'High',   color: 'bg-amber-500',   text: 'text-amber-400',   border: 'border-amber-500/30' },
  { label: 'Urgent', color: 'bg-red-500',     text: 'text-red-400',     border: 'border-red-500/30' },
];

const STATUSES = ['todo', 'in-progress', 'review', 'done'];
const EMOJI_SET = ['👍','❤️','😂','🎉','👀','🔥','✅','🚀'];

function MemberChip({ member, onRemove }) {
  return (
    <span className="flex items-center gap-1 px-2 py-1 bg-dark-700 border border-white/10 rounded-lg text-xs text-white font-medium">
      <span className="w-5 h-5 rounded-full bg-primary-600 flex items-center justify-center text-[9px] font-black uppercase shrink-0">
        {member.name?.charAt(0) || '?'}
      </span>
      {member.name}
      {onRemove && (
        <button onClick={() => onRemove(member.id)} className="text-slate-500 hover:text-red-400 ml-1">
          <X size={10} />
        </button>
      )}
    </span>
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
    <div className="flex flex-wrap gap-1 mt-1">
      {Object.entries(reactions).filter(([,uids]) => uids.length > 0).map(([emoji, uids]) => (
        <button
          key={emoji}
          onClick={() => toggleReaction(emoji)}
          className={`text-xs px-2 py-0.5 rounded-full border transition-all ${
            uids.includes(user?.uid)
              ? 'bg-primary-500/20 border-primary-500/40 text-primary-300'
              : 'bg-dark-700 border-white/10 text-slate-400 hover:border-white/20'
          }`}
        >
          {emoji} {uids.length}
        </button>
      ))}
    </div>
  );
}

export default function TaskDetailPanel({ task, onClose, onUpdate, members = [] }) {
  const { user, activeCompany } = useStore();

  // Editable fields
  const [title, setTitle] = useState(task?.title || '');
  const [status, setStatus] = useState(task?.status || 'todo');
  const [priority, setPriority] = useState(task?.priority || 'Medium');
  const [startDate, setStartDate] = useState(task?.startDate || '');
  const [dueDate, setDueDate] = useState(task?.dueDate || '');
  const [timeEstimate, setTimeEstimate] = useState(task?.timeEstimate || '');
  const [description, setDescription] = useState(task?.description || '');
  const [assignees, setAssignees] = useState(task?.assignedTo || []);
  const [tags, setTags] = useState(task?.tags || []);
  const [newTag, setNewTag] = useState('');
  const [showAssigneeSearch, setShowAssigneeSearch] = useState(false);
  const [assigneeSearch, setAssigneeSearch] = useState('');

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

  // Subscribe to comments
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
    const lastAt = val.lastIndexOf('@');
    if (lastAt !== -1 && lastAt === val.length - 1 || (lastAt !== -1 && !val.slice(lastAt + 1).includes(' '))) {
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

  const addTag = () => {
    if (!newTag.trim()) return;
    const updated = [...tags, newTag.trim().toUpperCase()];
    setTags(updated);
    saveField('tags', updated);
    setNewTag('');
  };

  const removeTag = (tag) => {
    const updated = tags.filter(t => t !== tag);
    setTags(updated);
    saveField('tags', updated);
  };

  const isOverdue = dueDate && isPast(new Date(dueDate)) && status !== 'done';
  const priorityCfg = PRIORITIES.find(p => p.label === priority) || PRIORITIES[1];
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
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Panel */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="relative z-10 w-full max-w-5xl bg-dark-900 border-l border-dark-700 flex flex-col h-full shadow-2xl"
        >
          {/* Header */}
          <div className="h-14 px-6 border-b border-dark-700 flex items-center justify-between shrink-0 bg-dark-800/60">
            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Task Detail</span>
            <button onClick={onClose} className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-dark-700 transition-all">
              <X size={18} />
            </button>
          </div>

          {/* Body — split */}
          <div className="flex flex-1 min-h-0">

            {/* ── LEFT PANE ── */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar border-r border-dark-700 min-w-0">

              {/* Title */}
              <textarea
                value={title}
                onChange={e => setTitle(e.target.value)}
                onBlur={() => saveField('title', title)}
                rows={2}
                className="w-full bg-transparent text-2xl font-black text-white resize-none outline-none placeholder:text-slate-600 border-b border-transparent focus:border-dark-600 transition-colors pb-1"
                placeholder="Task title…"
              />

              {/* Status */}
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest w-24 shrink-0">Status</span>
                <select
                  value={status}
                  onChange={e => { setStatus(e.target.value); saveField('status', e.target.value); }}
                  className="bg-dark-800 border border-dark-600 rounded-lg px-3 py-1.5 text-xs text-white font-bold outline-none focus:border-primary-500 transition-colors appearance-none cursor-pointer"
                >
                  {STATUSES.map(s => <option key={s} value={s}>{s.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
                </select>
              </div>

              {/* Assignees */}
              <div className="flex items-start gap-3">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest w-24 shrink-0 mt-1">Assignees</span>
                <div className="flex flex-wrap gap-2 flex-1">
                  {Array.isArray(assignees) && assignees.map(a => (
                    <MemberChip key={a.id} member={a} onRemove={id => {
                      const updated = assignees.filter(x => x.id !== id);
                      setAssignees(updated);
                      saveField('assignedTo', updated);
                    }} />
                  ))}
                  <div className="relative">
                    <button
                      onClick={() => setShowAssigneeSearch(v => !v)}
                      className="w-7 h-7 rounded-full border border-dashed border-dark-500 hover:border-primary-500 flex items-center justify-center text-slate-500 hover:text-primary-400 transition-all"
                    >
                      <Plus size={12} />
                    </button>
                    {showAssigneeSearch && (
                      <div className="absolute top-9 left-0 w-56 bg-dark-800 border border-dark-600 rounded-xl shadow-2xl z-50 overflow-hidden">
                        <input
                          autoFocus
                          value={assigneeSearch}
                          onChange={e => setAssigneeSearch(e.target.value)}
                          placeholder="Search member…"
                          className="w-full px-3 py-2 text-xs bg-dark-900 text-white outline-none border-b border-dark-700"
                        />
                        <div className="max-h-40 overflow-y-auto">
                          {filteredMembers.map(m => (
                            <button key={m.id} onClick={() => { toggleAssignee(m); setShowAssigneeSearch(false); setAssigneeSearch(''); }}
                              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-dark-700 text-xs text-white transition-colors text-left">
                              <span className="w-6 h-6 rounded-full bg-primary-600 flex items-center justify-center text-[9px] font-black uppercase">{m.name?.charAt(0)}</span>
                              {m.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Priority */}
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest w-24 shrink-0">Priority</span>
                <div className="flex gap-2">
                  {PRIORITIES.map(p => (
                    <button
                      key={p.label}
                      onClick={() => { setPriority(p.label); saveField('priority', p.label); }}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold transition-all ${
                        priority === p.label
                          ? `${p.color} bg-opacity-20 ${p.text} ${p.border}`
                          : 'bg-dark-800 border-dark-600 text-slate-500 hover:border-dark-500'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${priority === p.label ? p.color : 'bg-slate-600'}`} />
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dates */}
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest w-24 shrink-0">Start Date</span>
                <input type="date" value={startDate}
                  onChange={e => { setStartDate(e.target.value); saveField('startDate', e.target.value); }}
                  className="bg-dark-800 border border-dark-600 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-primary-500 transition-colors" />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest w-24 shrink-0">Due Date</span>
                <input type="date" value={dueDate}
                  onChange={e => { setDueDate(e.target.value); saveField('dueDate', e.target.value); }}
                  className={`bg-dark-800 border rounded-lg px-3 py-1.5 text-xs outline-none transition-colors ${
                    isOverdue ? 'border-red-500/60 text-red-400 focus:border-red-500' : 'border-dark-600 text-white focus:border-primary-500'
                  }`} />
                {isOverdue && <span className="text-[10px] text-red-500 font-black uppercase">Overdue</span>}
              </div>

              {/* Time Estimate */}
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest w-24 shrink-0">Est. Hours</span>
                <input type="number" min="0" step="0.5" value={timeEstimate}
                  onChange={e => setTimeEstimate(e.target.value)}
                  onBlur={() => saveField('timeEstimate', timeEstimate)}
                  placeholder="0.0"
                  className="w-24 bg-dark-800 border border-dark-600 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-primary-500 transition-colors" />
                <span className="text-xs text-slate-500">hrs</span>
              </div>

              {/* Labels/Tags */}
              <div className="flex items-start gap-3">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest w-24 shrink-0 mt-1">Labels</span>
                <div className="flex flex-wrap gap-2 flex-1">
                  {tags.map(tag => (
                    <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-dark-700 border border-dark-600 rounded-full text-[10px] font-black text-slate-300 uppercase tracking-widest">
                      {tag}
                      <button onClick={() => removeTag(tag)} className="text-slate-600 hover:text-red-400"><X size={9} /></button>
                    </span>
                  ))}
                  <input
                    value={newTag}
                    onChange={e => setNewTag(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    placeholder="+ add tag"
                    className="bg-transparent text-[10px] text-slate-400 outline-none placeholder:text-slate-600 w-16"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Description</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  onBlur={() => saveField('description', description)}
                  rows={5}
                  placeholder="Add a description…"
                  className="w-full bg-dark-800 border border-dark-600 rounded-xl px-4 py-3 text-sm text-slate-300 outline-none focus:border-primary-500 transition-colors resize-none placeholder:text-slate-600"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-dark-700">
                {[
                  { icon: CheckSquare, label: 'Add subtask' },
                  { icon: Plus, label: 'Add fields' },
                  { icon: Link2, label: 'Relate items' },
                  { icon: List, label: 'Create checklist' },
                  { icon: Paperclip, label: 'Attach file' },
                ].map(({ icon: Icon, label }) => (
                  <button key={label}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-dark-800 border border-dark-600 hover:border-dark-500 rounded-lg text-[10px] font-bold text-slate-400 hover:text-white transition-all uppercase tracking-widest">
                    <Icon size={11} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── RIGHT PANE — Activity ── */}
            <div className="w-96 flex flex-col min-h-0 shrink-0">
              <div className="px-5 py-4 border-b border-dark-700 shrink-0">
                <h3 className="text-sm font-black text-white uppercase tracking-widest">Activity</h3>
              </div>

              {/* Comment feed */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {comments.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-32 text-slate-600 text-xs font-bold text-center">
                    No activity yet. Be the first to comment!
                  </div>
                )}
                {comments.map(c => {
                  const isMe = c.authorId === user?.uid;
                  const time = c.createdAt?.toDate ? format(c.createdAt.toDate(), 'MMM d, HH:mm') : '...';
                  return (
                    <div key={c.id} className="group">
                      {/* Attachment card */}
                      {c.type === 'file' ? (
                        <div className="flex items-center gap-3 p-3 bg-dark-800 border border-dark-600 rounded-xl">
                          <Paperclip size={14} className="text-primary-400 shrink-0" />
                          <span className="text-xs text-slate-300 flex-1 truncate">{c.fileName}</span>
                          <a href={c.fileUrl} download target="_blank" rel="noreferrer"
                            className="p-1.5 text-slate-500 hover:text-white hover:bg-dark-700 rounded-lg transition-all">
                            <Download size={12} />
                          </a>
                        </div>
                      ) : (
                        <div className={`flex gap-2.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                          <div className="w-7 h-7 rounded-full bg-primary-600/20 border border-primary-500/20 flex items-center justify-center text-[10px] font-black text-primary-300 uppercase shrink-0">
                            {c.authorName?.charAt(0) || '?'}
                          </div>
                          <div className={`flex flex-col flex-1 ${isMe ? 'items-end' : 'items-start'}`}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-black text-slate-500">{isMe ? 'You' : c.authorName}</span>
                              <span className="text-[9px] text-slate-600">{time}</span>
                            </div>
                            <div className={`px-3 py-2 rounded-2xl text-xs text-slate-200 leading-relaxed max-w-[260px] ${
                              isMe ? 'bg-primary-600/20 border border-primary-500/20 rounded-tr-sm' : 'bg-dark-800 border border-dark-600 rounded-tl-sm'
                            }`}>
                              {c.text}
                            </div>
                            <EmojiReactions reactions={c.reactions} messageId={c.id} taskPath={taskPath} />
                            {/* Emoji add row on hover */}
                            <div className="flex gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {EMOJI_SET.slice(0, 6).map(e => (
                                <button key={e} onClick={async () => {
                                  const msgRef = doc(db, taskPath, 'comments', c.id);
                                  const current = (c.reactions || {})[e] || [];
                                  const updated = current.includes(user.uid)
                                    ? current.filter(id => id !== user.uid)
                                    : [...current, user.uid];
                                  await updateDoc(msgRef, { [`reactions.${e}`]: updated });
                                }} className="text-sm hover:scale-125 transition-transform">{e}</button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                <div ref={commentsEndRef} />
              </div>

              {/* Comment input */}
              <div className="p-4 border-t border-dark-700 shrink-0">
                <div className="relative">
                  {/* @mention dropdown */}
                  {showMentions && mentionCandidates.length > 0 && (
                    <div className="absolute bottom-full left-0 w-48 mb-2 bg-dark-800 border border-dark-600 rounded-xl shadow-2xl overflow-hidden z-50">
                      {mentionCandidates.map(m => (
                        <button key={m.id} onClick={() => insertMention(m)}
                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-dark-700 text-xs text-white transition-colors text-left">
                          <span className="w-5 h-5 rounded-full bg-primary-600 flex items-center justify-center text-[9px] uppercase">{m.name?.charAt(0)}</span>
                          {m.name}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="bg-dark-800 border border-dark-600 rounded-xl focus-within:border-primary-500 transition-colors">
                    <textarea
                      ref={commentInputRef}
                      value={commentText}
                      onChange={handleCommentInput}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendComment(); } }}
                      placeholder="Write a comment… (@mention)"
                      rows={2}
                      className="w-full bg-transparent px-3 pt-3 text-xs text-white outline-none resize-none placeholder:text-slate-600"
                    />
                    <div className="flex items-center justify-between px-3 pb-2">
                      <div className="flex items-center gap-2">
                        <button className="text-slate-500 hover:text-white transition-colors p-1"><Paperclip size={14} /></button>
                        <div className="relative">
                          <button onClick={() => setShowEmojiPicker(v => !v)} className="text-slate-500 hover:text-white transition-colors p-1">
                            <Smile size={14} />
                          </button>
                          {showEmojiPicker && (
                            <div className="absolute bottom-8 left-0 flex gap-2 p-2 bg-dark-700 border border-dark-600 rounded-xl shadow-2xl z-50">
                              {EMOJI_SET.map(e => (
                                <button key={e} onClick={() => { setCommentText(v => v + e); setShowEmojiPicker(false); }}
                                  className="text-base hover:scale-125 transition-transform">{e}</button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={handleSendComment}
                        disabled={!commentText.trim() || sending}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-500 disabled:opacity-40 text-white text-[10px] font-black rounded-lg transition-all uppercase tracking-widest"
                      >
                        <Send size={11} /> Send
                      </button>
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
