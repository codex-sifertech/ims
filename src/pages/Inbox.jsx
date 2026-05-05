import { useState, useEffect, useRef, useCallback } from 'react';
import {
    collection, query, orderBy, onSnapshot, addDoc, updateDoc,
    doc, serverTimestamp, limit, setDoc, arrayUnion, arrayRemove, getDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import useStore from '../store/useStore';
import { useProjects } from '../hooks/useProjects';
import {
    Send, Hash, Paperclip, Search, Shield, Smile, Plus, Users,
    X, Link2, ChevronDown, ChevronRight, MessageSquare
} from 'lucide-react';
import { format, differenceInMinutes } from 'date-fns';

const QUICK_EMOJIS = ['👍','❤️','😂','🎉','🔥','😮'];
const EMOJI_SET    = ['👍','❤️','😂','🎉','👀','🔥','✅','🚀','😮','🙏'];

// ── Avatar ─────────────────────────────────────────────────────────────────
function Avatar({ name, size = 8, photoURL }) {
    const initials = (name || '?').charAt(0).toUpperCase();
    const colors = [
        'bg-violet-600','bg-blue-600','bg-emerald-600',
        'bg-amber-600','bg-pink-600','bg-cyan-600','bg-rose-600','bg-indigo-600'
    ];
    const idx = name ? name.charCodeAt(0) % colors.length : 0;
    if (photoURL) return (
        <img src={photoURL} alt={name}
            className={`w-${size} h-${size} rounded-full object-cover shrink-0`} />
    );
    return (
        <div className={`w-${size} h-${size} rounded-full ${colors[idx]} flex items-center justify-center text-white font-black text-xs shrink-0 select-none`}>
            {initials}
        </div>
    );
}

// ── Channel button ─────────────────────────────────────────────────────────
function ChannelBtn({ active, onClick, icon, label, badge, sub }) {
    return (
        <button onClick={onClick}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[13px] transition-colors ${
                active ? 'bg-primary-600/20 text-primary-300' : 'text-slate-400 hover:bg-dark-800 hover:text-white'
            }`}>
            <span className="shrink-0">{icon}</span>
            <span className="truncate flex-1 text-left">{label}</span>
            {badge !== undefined && (
                <span className="text-[10px] text-slate-600 shrink-0">{badge}</span>
            )}
        </button>
    );
}

// ── Message bubble ─────────────────────────────────────────────────────────
function MessageBubble({ msg, showHeader, isMe, onReact, currentUserId }) {
    const [hover, setHover] = useState(false);
    const time = msg.createdAt?.toDate ? format(msg.createdAt.toDate(), 'HH:mm') : '';

    return (
        <div
            className={`flex gap-3 px-4 group ${showHeader ? 'mt-4' : 'mt-0.5'}`}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
        >
            <div className="w-8 shrink-0 mt-0.5">
                {showHeader && <Avatar name={msg.senderName} size={8} photoURL={msg.senderPhoto} />}
            </div>

            <div className="flex-1 min-w-0">
                {showHeader && (
                    <div className="flex items-baseline gap-2 mb-0.5">
                        <span className="text-xs font-black text-white">{isMe ? 'You' : msg.senderName}</span>
                        <span className="text-[10px] text-slate-600">{time}</span>
                    </div>
                )}

                {/* Link attachment */}
                {msg.type === 'link' ? (
                    <a href={msg.url} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-2 bg-dark-800 hover:bg-dark-700 border border-dark-600 hover:border-dark-500 rounded-xl text-sm text-primary-400 hover:text-primary-300 transition-all max-w-sm group/link">
                        <Link2 size={14} className="shrink-0" />
                        <span className="truncate">{msg.label || msg.url}</span>
                    </a>
                ) : (
                    <div className={`text-sm text-slate-200 leading-relaxed px-3 py-1.5 rounded-xl w-fit max-w-[520px] transition-colors ${
                        showHeader ? 'rounded-tl-sm' : ''
                    } ${hover ? 'bg-dark-800' : 'bg-transparent'}`}>
                        {msg.text}
                    </div>
                )}

                {/* Reactions */}
                {msg.reactions && Object.keys(msg.reactions).some(e => msg.reactions[e]?.length > 0) && (
                    <div className="flex flex-wrap gap-1 mt-1">
                        {Object.entries(msg.reactions).filter(([, uids]) => uids?.length > 0).map(([emoji, uids]) => (
                            <button key={emoji} onClick={() => onReact(msg.id, emoji)}
                                className={`text-xs px-2 py-0.5 rounded-full border transition-all ${
                                    uids.includes(currentUserId)
                                        ? 'bg-primary-500/20 border-primary-500/40 text-primary-300'
                                        : 'bg-dark-700 border-dark-600 text-slate-400 hover:border-dark-500'
                                }`}>
                                {emoji} {uids.length}
                            </button>
                        ))}
                    </div>
                )}

                {/* Hover emoji bar */}
                {hover && (
                    <div className="flex gap-1 mt-1">
                        {QUICK_EMOJIS.map(e => (
                            <button key={e} onClick={() => onReact(msg.id, e)}
                                className="text-sm hover:scale-125 transition-transform opacity-60 hover:opacity-100">
                                {e}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function Inbox() {
    const { user, activeCompany, globalTasks } = useStore();
    const { projects } = useProjects();

    const [activeChannel, setActiveChannel] = useState({ id: 'global', name: 'General', type: 'company' });
    const [messages, setMessages]     = useState([]);
    const [members, setMembers]       = useState([]);
    const [groups, setGroups]         = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading]       = useState(true);
    const [typingUsers, setTypingUsers]   = useState([]);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showMentions, setShowMentions]   = useState(false);
    const [mentionSearch, setMentionSearch] = useState('');
    const [showTaskMentions, setShowTaskMentions]   = useState(false);
    const [taskMentionSearch, setTaskMentionSearch] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // Sections collapse state
    const [projectsOpen, setProjectsOpen] = useState(true);
    const [groupsOpen, setGroupsOpen]     = useState(true);
    const [dmsOpen, setDmsOpen]           = useState(true);

    // Group create
    const [showCreateGroup, setShowCreateGroup] = useState(false);
    const [groupName, setGroupName]   = useState('');
    const [groupMembers, setGroupMembers] = useState([]);

    // Link share
    const [showLinkShare, setShowLinkShare] = useState(false);
    const [linkUrl, setLinkUrl]   = useState('');
    const [linkLabel, setLinkLabel] = useState('');

    const messagesEndRef   = useRef(null);
    const typingTimeoutRef = useRef(null);
    const inputRef         = useRef(null);

    // ── Room ID ──────────────────────────────────────────────────────────────
    const getRoomId = (ch) => {
        if (ch.type === 'company') return `company-${activeCompany?.id}`;
        if (ch.type === 'dm')      return ch.id;
        if (ch.type === 'group')   return ch.id;
        return ch.id;
    };
    const roomId = getRoomId(activeChannel);

    // ── Members subscription ──────────────────────────────────────────────────
    useEffect(() => {
        if (!activeCompany?.id) return;
        return onSnapshot(
            collection(db, 'companies', activeCompany.id, 'members'),
            snap => setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        );
    }, [activeCompany?.id]);

    // ── Groups subscription ────────────────────────────────────────────────────
    useEffect(() => {
        if (!activeCompany?.id) return;
        return onSnapshot(
            collection(db, 'companies', activeCompany.id, 'groups'),
            snap => setGroups(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        );
    }, [activeCompany?.id]);

    // ── Messages subscription ─────────────────────────────────────────────────
    useEffect(() => {
        if (!user?.uid || !activeCompany?.id) return;
        setLoading(true);
        const ref = activeChannel.type === 'project'
            ? collection(db, 'companies', activeCompany.id, 'projects', activeChannel.id, 'chat')
            : collection(db, 'chats', roomId, 'messages');
        const q = query(ref, orderBy('createdAt', 'asc'), limit(150));
        return onSnapshot(q,
            snap => { setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); },
            () => setLoading(false)
        );
    }, [roomId, activeChannel.id, activeChannel.type, activeCompany?.id, user?.uid]);

    // ── Auto-scroll ──────────────────────────────────────────────────────────
    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    // ── Typing indicator subscription ─────────────────────────────────────────
    useEffect(() => {
        if (!activeCompany?.id || activeChannel.type !== 'company') return;
        return onSnapshot(doc(db, 'chats', roomId), snap => {
            const others = (snap.data()?.typingUsers || []).filter(uid => uid !== user?.uid);
            setTypingUsers(others.map(uid => members.find(m => m.id === uid)?.name || 'Someone'));
        });
    }, [roomId, activeChannel.type, members, user?.uid]);

    // ── Message ref helpers ───────────────────────────────────────────────────
    const getMessagesRef = () =>
        activeChannel.type === 'project'
            ? collection(db, 'companies', activeCompany.id, 'projects', activeChannel.id, 'chat')
            : collection(db, 'chats', roomId, 'messages');

    const getMessageDocRef = (msgId) =>
        activeChannel.type === 'project'
            ? doc(db, 'companies', activeCompany.id, 'projects', activeChannel.id, 'chat', msgId)
            : doc(db, 'chats', roomId, 'messages', msgId);

    // ── Send text message ─────────────────────────────────────────────────────
    const handleSend = async (e) => {
        e?.preventDefault();
        if (!newMessage.trim() || !user?.uid) return;
        const text = newMessage.trim();
        setNewMessage('');
        setShowTaskMentions(false);
        setShowMentions(false);
        stopTyping();
        try {
            await addDoc(getMessagesRef(), {
                text, senderId: user.uid,
                senderName: user.name || user.email || 'Team Member',
                senderPhoto: user.photoURL || null,
                createdAt: serverTimestamp(),
                type: 'text', reactions: {},
            });
        } catch (err) { console.error('Send failed:', err); }
    };

    // ── Send link ─────────────────────────────────────────────────────────────
    const handleSendLink = async () => {
        if (!linkUrl.trim() || !user?.uid) return;
        try {
            await addDoc(getMessagesRef(), {
                url: linkUrl.trim(),
                label: linkLabel.trim() || linkUrl.trim(),
                senderId: user.uid,
                senderName: user.name || user.email || 'Team Member',
                senderPhoto: user.photoURL || null,
                createdAt: serverTimestamp(),
                type: 'link', reactions: {},
            });
            setLinkUrl(''); setLinkLabel(''); setShowLinkShare(false);
        } catch (err) { console.error('Send link failed:', err); }
    };

    // ── React to message ──────────────────────────────────────────────────────
    const handleReact = async (msgId, emoji) => {
        const ref = getMessageDocRef(msgId);
        const snap = await getDoc(ref);
        const current = snap.data()?.reactions?.[emoji] || [];
        const updated = current.includes(user.uid)
            ? current.filter(id => id !== user.uid)
            : [...current, user.uid];
        await updateDoc(ref, { [`reactions.${emoji}`]: updated });
    };

    // ── Typing ────────────────────────────────────────────────────────────────
    const startTyping = async () => {
        if (activeChannel.type !== 'company') return;
        try { await setDoc(doc(db, 'chats', roomId), { typingUsers: arrayUnion(user.uid) }, { merge: true }); } catch {}
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(stopTyping, 3000);
    };
    const stopTyping = async () => {
        if (activeChannel.type !== 'company') return;
        try { await setDoc(doc(db, 'chats', roomId), { typingUsers: arrayRemove(user.uid) }, { merge: true }); } catch {}
    };

    const handleInput = (e) => {
        const val = e.target.value;
        setNewMessage(val);
        startTyping();
        const lastAt   = val.lastIndexOf('@');
        const lastHash = val.lastIndexOf('#');
        if (lastAt !== -1 && !val.slice(lastAt + 1).includes(' ')) {
            setMentionSearch(val.slice(lastAt + 1)); setShowMentions(true);
        } else { setShowMentions(false); }
        if (lastHash !== -1 && !val.slice(lastHash + 1).includes(' ')) {
            setTaskMentionSearch(val.slice(lastHash + 1)); setShowTaskMentions(true);
        } else { setShowTaskMentions(false); }
    };

    const insertMention = (member) => {
        const lastAt = newMessage.lastIndexOf('@');
        setNewMessage(newMessage.slice(0, lastAt) + `@${member.name} `);
        setShowMentions(false); inputRef.current?.focus();
    };
    const insertTaskMention = (task) => {
        const lastHash = newMessage.lastIndexOf('#');
        setNewMessage(newMessage.slice(0, lastHash) + `#${task.title} `);
        setShowTaskMentions(false); inputRef.current?.focus();
    };

    // ── DM helper ─────────────────────────────────────────────────────────────
    const openDM = (member) => {
        const dmId = `dm-${[user.uid, member.id].sort().join('-')}`;
        setActiveChannel({ id: dmId, name: member.name, type: 'dm', memberId: member.id });
    };

    // ── Create group ──────────────────────────────────────────────────────────
    const handleCreateGroup = async () => {
        if (!groupName.trim() || !activeCompany?.id) return;
        try {
            const ref = await addDoc(collection(db, 'companies', activeCompany.id, 'groups'), {
                name: groupName.trim(),
                members: [user.uid, ...groupMembers.map(m => m.id)],
                memberNames: [user.name, ...groupMembers.map(m => m.name)],
                createdBy: user.uid,
                createdAt: serverTimestamp(),
            });
            setGroupName(''); setGroupMembers([]); setShowCreateGroup(false);
            setActiveChannel({ id: `group-${ref.id}`, name: groupName.trim(), type: 'group' });
        } catch (err) { console.error('Group creation failed:', err); }
    };

    // ── Derived ───────────────────────────────────────────────────────────────
    const sq = searchQuery.toLowerCase();
    const filteredProjects = projects.filter(p => !sq || p.title?.toLowerCase().includes(sq));
    const filteredMembers  = members.filter(m => m.id !== user?.uid && (!sq || m.name?.toLowerCase().includes(sq)));
    const filteredGroups   = groups.filter(g => !sq || g.name?.toLowerCase().includes(sq));
    const onlineMembers  = members.filter(m => m.id !== user?.uid && m.isOnline);
    const offlineMembers = members.filter(m => m.id !== user?.uid && !m.isOnline);
    const matchingTasks  = (globalTasks || []).filter(t =>
        t.title?.toLowerCase().includes(taskMentionSearch.toLowerCase())
    ).slice(0, 6);

    const groupedMessages = messages.map((msg, idx) => {
        const prev = messages[idx - 1];
        const showHeader = !prev || prev.senderId !== msg.senderId ||
            (msg.createdAt?.toDate && prev.createdAt?.toDate &&
             differenceInMinutes(msg.createdAt.toDate(), prev.createdAt.toDate()) > 5);
        return { ...msg, showHeader };
    });

    const channelMemberCount = activeChannel.type === 'company'
        ? members.length
        : activeChannel.type === 'group'
            ? groups.find(g => `group-${g.id}` === activeChannel.id)?.members?.length ?? 0
            : activeChannel.type === 'project' ? members.length : 2;

    return (
        <div className="h-full flex overflow-hidden bg-dark-950">

            {/* ── LEFT SIDEBAR — Channels ── */}
            <div className="w-56 border-r border-dark-800 flex flex-col bg-dark-900 shrink-0">
                {/* Header */}
                <div className="h-12 px-4 flex items-center border-b border-dark-800 shrink-0 gap-2">
                    <MessageSquare size={14} className="text-primary-400 shrink-0" />
                    <span className="font-black text-white text-sm truncate">{activeCompany?.name || 'Workspace'}</span>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar py-2">
                    {/* Search */}
                    <div className="px-3 mb-2">
                        <div className="flex items-center gap-2 bg-dark-800 rounded-lg px-2 py-1.5">
                            <Search size={12} className="text-slate-600" />
                            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Search channels…"
                                className="bg-transparent text-[11px] text-white outline-none flex-1 placeholder:text-slate-600" />
                        </div>
                    </div>

                    {/* General */}
                    <div className="px-2 mb-1">
                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest px-2 mb-1">Channels</p>
                        <ChannelBtn
                            active={activeChannel.id === 'global'}
                            onClick={() => setActiveChannel({ id: 'global', name: 'General', type: 'company' })}
                            icon={<Shield size={13} className="text-primary-500" />}
                            label="general"
                        />
                    </div>

                    {/* Projects */}
                    {filteredProjects.length > 0 && (
                        <div className="px-2 mt-2">
                            <button onClick={() => setProjectsOpen(v => !v)}
                                className="w-full flex items-center justify-between px-2 mb-1 text-[9px] font-black text-slate-600 uppercase tracking-widest hover:text-slate-400 transition-colors">
                                <span>Projects</span>
                                {projectsOpen ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                            </button>
                            {projectsOpen && filteredProjects.map(proj => (
                                <ChannelBtn key={proj.id}
                                    active={activeChannel.id === proj.id}
                                    onClick={() => setActiveChannel({ id: proj.id, name: proj.title, type: 'project' })}
                                    icon={<Hash size={13} className="text-slate-500" />}
                                    label={proj.title}
                                />
                            ))}
                        </div>
                    )}

                    {/* Groups */}
                    <div className="px-2 mt-2">
                        <button onClick={() => setGroupsOpen(v => !v)}
                            className="w-full flex items-center justify-between px-2 mb-1 text-[9px] font-black text-slate-600 uppercase tracking-widest hover:text-slate-400 transition-colors">
                            <span>Groups</span>
                            <div className="flex items-center gap-1">
                                <button onClick={e => { e.stopPropagation(); setShowCreateGroup(v => !v); }}
                                    className="text-slate-600 hover:text-primary-400 transition-colors p-0.5">
                                    <Plus size={10} />
                                </button>
                                {groupsOpen ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                            </div>
                        </button>

                        {groupsOpen && filteredGroups.map(g => (
                            <ChannelBtn key={g.id}
                                active={activeChannel.id === `group-${g.id}`}
                                onClick={() => setActiveChannel({ id: `group-${g.id}`, name: g.name, type: 'group' })}
                                icon={<Users size={13} className="text-slate-500" />}
                                label={g.name}
                                badge={g.members?.length}
                            />
                        ))}

                        {groupsOpen && filteredGroups.length === 0 && !showCreateGroup && (
                            <button onClick={() => setShowCreateGroup(true)}
                                className="w-full text-left text-[10px] text-slate-600 hover:text-primary-400 px-2 py-1 transition-colors">
                                + Create a group
                            </button>
                        )}

                        {/* Create group inline */}
                        {showCreateGroup && (
                            <div className="bg-dark-800 rounded-lg p-2.5 border border-dark-700 space-y-2 mt-1">
                                <input value={groupName} onChange={e => setGroupName(e.target.value)}
                                    placeholder="Group name…" autoFocus
                                    onKeyDown={e => { if (e.key === 'Enter') handleCreateGroup(); if (e.key === 'Escape') setShowCreateGroup(false); }}
                                    className="w-full bg-dark-900 rounded-md px-2 py-1.5 text-[11px] text-white outline-none border border-dark-600 focus:border-primary-500 placeholder:text-slate-600" />
                                <div className="max-h-24 overflow-y-auto space-y-0.5">
                                    {members.filter(m => m.id !== user?.uid).map(m => {
                                        const sel = groupMembers.find(g => g.id === m.id);
                                        return (
                                            <button key={m.id} type="button"
                                                onClick={() => setGroupMembers(prev => sel ? prev.filter(x => x.id !== m.id) : [...prev, m])}
                                                className={`w-full flex items-center gap-2 px-2 py-1 rounded text-[10px] transition-colors ${
                                                    sel ? 'bg-primary-500/10 text-primary-300' : 'text-slate-400 hover:bg-dark-700'
                                                }`}>
                                                <Avatar name={m.name} size={4} />
                                                <span className="truncate">{m.name}</span>
                                                {sel && <span className="ml-auto text-primary-400">✓</span>}
                                            </button>
                                        );
                                    })}
                                </div>
                                <div className="flex gap-1.5">
                                    <button onClick={() => setShowCreateGroup(false)}
                                        className="flex-1 py-1 text-[10px] text-slate-500 hover:text-white bg-dark-900 rounded-md transition-colors">
                                        Cancel
                                    </button>
                                    <button onClick={handleCreateGroup} disabled={!groupName.trim()}
                                        className="flex-1 py-1 text-[10px] text-white bg-primary-600 hover:bg-primary-500 rounded-md disabled:opacity-40 transition-colors">
                                        Create
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* DMs */}
                    <div className="px-2 mt-2">
                        <button onClick={() => setDmsOpen(v => !v)}
                            className="w-full flex items-center justify-between px-2 mb-1 text-[9px] font-black text-slate-600 uppercase tracking-widest hover:text-slate-400 transition-colors">
                            <span>Direct Messages</span>
                            {dmsOpen ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                        </button>

                        {dmsOpen && filteredMembers.length === 0 && (
                            <p className="text-[10px] text-slate-600 px-2 py-1">No other members yet</p>
                        )}

                        {dmsOpen && filteredMembers.map(m => {
                            const dmId = `dm-${[user?.uid, m.id].sort().join('-')}`;
                            return (
                                <button key={m.id} onClick={() => openDM(m)}
                                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[13px] transition-colors ${
                                        activeChannel.id === dmId ? 'bg-primary-600/20 text-primary-300' : 'text-slate-400 hover:bg-dark-800 hover:text-white'
                                    }`}>
                                    <div className="relative">
                                        <Avatar name={m.name} size={6} photoURL={m.photoURL} />
                                        <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-dark-900 ${m.isOnline ? 'bg-emerald-500' : 'bg-slate-600'}`} />
                                    </div>
                                    <span className="truncate flex-1 text-left">{m.name}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Current user footer */}
                <div className="h-12 px-3 border-t border-dark-800 flex items-center gap-2.5 shrink-0">
                    <div className="relative">
                        <Avatar name={user?.name} size={7} photoURL={user?.photoURL} />
                        <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-dark-900" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-white truncate">{user?.name || user?.email}</p>
                        <p className="text-[9px] text-emerald-500 font-bold">Online</p>
                    </div>
                </div>
            </div>

            {/* ── CENTER — Messages ── */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Channel header */}
                <div className="h-12 px-5 flex items-center gap-3 border-b border-dark-800 shrink-0 bg-dark-900/50">
                    {activeChannel.type === 'company'
                        ? <Shield size={16} className="text-primary-400 shrink-0" />
                        : activeChannel.type === 'dm'
                            ? <div className="w-4 h-4 rounded-full bg-emerald-600 flex items-center justify-center text-white text-[8px] font-black shrink-0">{activeChannel.name?.charAt(0)}</div>
                            : <Hash size={16} className="text-slate-400 shrink-0" />}
                    <span className="font-black text-white truncate">{activeChannel.name}</span>
                    {channelMemberCount > 0 && (
                        <span className="text-[10px] text-slate-600 ml-1 shrink-0">{channelMemberCount} members</span>
                    )}
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto custom-scrollbar py-2">
                    {loading ? (
                        <div className="flex justify-center py-12 text-slate-600 text-sm">Loading…</div>
                    ) : groupedMessages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-2">
                            <Hash size={28} />
                            <p className="font-bold text-sm">No messages yet</p>
                            <p className="text-xs">Be the first to say something!</p>
                        </div>
                    ) : (
                        groupedMessages.map(msg => (
                            <MessageBubble key={msg.id} msg={msg} showHeader={msg.showHeader}
                                isMe={msg.senderId === user?.uid} onReact={handleReact} currentUserId={user?.uid} />
                        ))
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Typing indicator */}
                {typingUsers.length > 0 && (
                    <div className="px-6 pb-1 text-xs text-slate-500 italic flex items-center gap-1">
                        {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing
                        <span className="inline-flex gap-0.5 ml-1">
                            {[0, 1, 2].map(i => (
                                <span key={i} className="w-1 h-1 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                            ))}
                        </span>
                    </div>
                )}

                {/* Link share panel */}
                {showLinkShare && (
                    <div className="px-4 pb-2">
                        <div className="bg-dark-800 border border-dark-600 rounded-xl p-3 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                                    <Link2 size={12} className="text-primary-400" /> Share a Link
                                </span>
                                <button onClick={() => setShowLinkShare(false)} className="text-slate-600 hover:text-white transition-colors">
                                    <X size={14} />
                                </button>
                            </div>
                            <input value={linkUrl} onChange={e => setLinkUrl(e.target.value)}
                                placeholder="https://…" autoFocus
                                onKeyDown={e => { if (e.key === 'Enter') handleSendLink(); if (e.key === 'Escape') setShowLinkShare(false); }}
                                className="w-full bg-dark-900 border border-dark-600 focus:border-primary-500 rounded-lg px-3 py-1.5 text-sm text-white outline-none placeholder:text-slate-600" />
                            <div className="flex gap-2">
                                <input value={linkLabel} onChange={e => setLinkLabel(e.target.value)}
                                    placeholder="Label (optional)"
                                    className="flex-1 bg-dark-900 border border-dark-600 rounded-lg px-3 py-1.5 text-sm text-white outline-none placeholder:text-slate-600" />
                                <button onClick={handleSendLink} disabled={!linkUrl.trim()}
                                    className="px-4 py-1.5 bg-primary-600 hover:bg-primary-500 disabled:opacity-40 text-white text-xs font-bold rounded-lg transition-colors">
                                    Share
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Input row */}
                <div className="px-4 pb-4 shrink-0">
                    <div className="relative">
                        {/* @mention dropdown */}
                        {showMentions && (
                            <div className="absolute bottom-full left-0 w-52 mb-2 bg-dark-800 border border-dark-600 rounded-xl shadow-2xl overflow-hidden z-50">
                                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest px-3 pt-2 pb-1">Members</p>
                                {members.filter(m => m.name?.toLowerCase().includes(mentionSearch.toLowerCase())).map(m => (
                                    <button key={m.id} onClick={() => insertMention(m)}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-dark-700 text-xs text-white transition-colors text-left">
                                        <Avatar name={m.name} size={6} photoURL={m.photoURL} />
                                        <span>{m.name}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* #task mention dropdown */}
                        {showTaskMentions && matchingTasks.length > 0 && (
                            <div className="absolute bottom-full left-0 w-64 mb-2 bg-dark-800 border border-dark-600 rounded-xl shadow-2xl overflow-hidden z-50">
                                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest px-3 pt-2 pb-1">Tasks</p>
                                {matchingTasks.map(t => (
                                    <button key={t.id} onClick={() => insertTaskMention(t)}
                                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-dark-700 text-xs text-white transition-colors text-left">
                                        <Hash size={11} className="text-primary-400 shrink-0" />
                                        <span className="truncate">{t.title}</span>
                                        {t.status && <span className="text-[8px] text-slate-600 shrink-0 uppercase ml-auto">{t.status}</span>}
                                    </button>
                                ))}
                            </div>
                        )}

                        <form onSubmit={handleSend}
                            className="flex items-center gap-2 bg-dark-800 border border-dark-700 focus-within:border-dark-500 rounded-xl px-3 py-2 transition-colors">
                            {/* Link share button */}
                            <button type="button" onClick={() => setShowLinkShare(v => !v)}
                                title="Share a link"
                                className={`transition-colors ${showLinkShare ? 'text-primary-400' : 'text-slate-500 hover:text-slate-300'}`}>
                                <Paperclip size={16} />
                            </button>

                            {/* Text input */}
                            <input ref={inputRef} value={newMessage} onChange={handleInput}
                                onBlur={stopTyping}
                                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                                placeholder={`Message #${activeChannel.name}… (@ mention, # task)`}
                                className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-600" />

                            {/* Emoji picker */}
                            <div className="relative">
                                <button type="button" onClick={() => setShowEmojiPicker(v => !v)}
                                    className="text-slate-500 hover:text-slate-300 transition-colors">
                                    <Smile size={16} />
                                </button>
                                {showEmojiPicker && (
                                    <div className="absolute bottom-8 right-0 flex flex-wrap gap-1.5 p-2.5 bg-dark-700 border border-dark-600 rounded-xl shadow-2xl z-50 w-[220px]">
                                        {EMOJI_SET.map(e => (
                                            <button type="button" key={e}
                                                onClick={() => { setNewMessage(v => v + e); setShowEmojiPicker(false); }}
                                                className="text-lg hover:scale-125 transition-transform p-1 hover:bg-dark-600 rounded-lg">{e}</button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Send */}
                            <button type="submit" disabled={!newMessage.trim()}
                                className="w-8 h-8 flex items-center justify-center bg-primary-600 hover:bg-primary-500 disabled:opacity-40 text-white rounded-lg transition-all shrink-0">
                                <Send size={14} />
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            {/* ── RIGHT SIDEBAR — Members ── */}
            <div className="w-48 border-l border-dark-800 flex-col bg-dark-900 shrink-0 hidden xl:flex">
                <div className="h-12 px-4 flex items-center border-b border-dark-800 shrink-0">
                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                        Members · {members.length}
                    </span>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar py-3 px-2 space-y-3">
                    {onlineMembers.length > 0 && (
                        <div>
                            <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest px-2 mb-1">
                                Online · {onlineMembers.length}
                            </p>
                            {onlineMembers.map(m => (
                                <button key={m.id} onClick={() => openDM(m)}
                                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-dark-800 transition-colors text-left">
                                    <div className="relative">
                                        <Avatar name={m.name} size={6} photoURL={m.photoURL} />
                                        <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-dark-900" />
                                    </div>
                                    <span className="text-xs text-slate-300 truncate">{m.name}</span>
                                </button>
                            ))}
                        </div>
                    )}
                    {offlineMembers.length > 0 && (
                        <div>
                            <p className="text-[9px] font-black text-slate-700 uppercase tracking-widest px-2 mb-1">
                                Offline · {offlineMembers.length}
                            </p>
                            {offlineMembers.map(m => (
                                <button key={m.id} onClick={() => openDM(m)}
                                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-dark-800 transition-colors text-left opacity-50">
                                    <div className="relative">
                                        <Avatar name={m.name} size={6} photoURL={m.photoURL} />
                                        <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-slate-600 border border-dark-900" />
                                    </div>
                                    <span className="text-xs text-slate-500 truncate">{m.name}</span>
                                </button>
                            ))}
                        </div>
                    )}
                    {members.length === 1 && (
                        <p className="text-[10px] text-slate-600 text-center px-2 py-4">
                            Invite teammates to start chatting
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
