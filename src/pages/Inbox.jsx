import { useState, useEffect, useRef, useCallback } from 'react';
import {
    collection, query, orderBy, onSnapshot, addDoc, updateDoc,
    doc, serverTimestamp, limit, setDoc, arrayUnion, arrayRemove, getDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import useStore from '../store/useStore';
import { useProjects } from '../hooks/useProjects';
import { Send, Hash, Paperclip, Search, Shield, Smile, Plus } from 'lucide-react';
import { format, differenceInMinutes } from 'date-fns';

const EMOJI_SET = ['👍','❤️','😂','🎉','👀','🔥'];
const QUICK_EMOJIS = ['👍','❤️','😂','🎉','🔥','😮'];

function Avatar({ name, size = 8 }) {
    const initials = (name || '?').charAt(0).toUpperCase();
    const colors = ['bg-violet-600','bg-blue-600','bg-emerald-600','bg-amber-600','bg-pink-600','bg-cyan-600'];
    const idx = name ? name.charCodeAt(0) % colors.length : 0;
    return (
        <div className={`w-${size} h-${size} rounded-full ${colors[idx]} flex items-center justify-center text-white font-black text-xs shrink-0`}>
            {initials}
        </div>
    );
}

function MessageBubble({ msg, showHeader, isMe, onReact, taskPath }) {
    const [hover, setHover] = useState(false);
    const time = msg.createdAt?.toDate ? format(msg.createdAt.toDate(), 'HH:mm') : '...';
    return (
        <div
            className={`flex gap-3 px-4 group ${showHeader ? 'mt-4' : 'mt-0.5'}`}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
        >
            {/* Avatar — only show on first of group */}
            <div className="w-8 shrink-0 mt-0.5">
                {showHeader && <Avatar name={msg.senderName} size={8} />}
            </div>

            <div className="flex-1 min-w-0">
                {showHeader && (
                    <div className="flex items-baseline gap-2 mb-0.5">
                        <span className="text-xs font-black text-white">{isMe ? 'You' : msg.senderName}</span>
                        <span className="text-[10px] text-slate-600">{time}</span>
                    </div>
                )}
                <div className={`text-sm text-slate-200 leading-relaxed px-3 py-1.5 rounded-xl w-fit max-w-[480px] ${
                    showHeader ? 'rounded-tl-sm' : ''
                } ${hover ? 'bg-dark-800' : 'bg-transparent'} transition-colors`}>
                    {msg.text}
                </div>

                {/* Reactions display */}
                {msg.reactions && Object.keys(msg.reactions).some(e => msg.reactions[e]?.length > 0) && (
                    <div className="flex flex-wrap gap-1 mt-1">
                        {Object.entries(msg.reactions).filter(([,uids]) => uids?.length > 0).map(([emoji, uids]) => (
                            <button key={emoji} onClick={() => onReact(msg.id, emoji)}
                                className={`text-xs px-2 py-0.5 rounded-full border transition-all ${
                                    uids.includes(useStore.getState().user?.uid)
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
                                className="text-base hover:scale-125 transition-transform">
                                {e}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function Inbox() {
    const { user, activeCompany } = useStore();
    const { projects, loading: projectsLoading } = useProjects();
    const [activeChannel, setActiveChannel] = useState({ id: 'global', name: 'General', type: 'company' });
    const [messages, setMessages] = useState([]);
    const [members, setMembers] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [typingUsers, setTypingUsers] = useState([]);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [unreadCounts, setUnreadCounts] = useState({});
    const [mentionSearch, setMentionSearch] = useState('');
    const [showMentions, setShowMentions] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const inputRef = useRef(null);

    const getRoomId = (ch) => ch.type === 'company' ? `company-${activeCompany?.id}` : ch.id;
    const roomId = getRoomId(activeChannel);

    // Members subscription
    useEffect(() => {
        if (!activeCompany?.id) return;
        const ref = collection(db, 'companies', activeCompany.id, 'members');
        return onSnapshot(ref, snap => setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    }, [activeCompany?.id]);

    // Messages subscription
    useEffect(() => {
        if (!user?.uid || !activeCompany?.id) return;
        setLoading(true);
        const messagesRef = activeChannel.type === 'company'
            ? collection(db, 'chats', roomId, 'messages')
            : collection(db, 'companies', activeCompany.id, 'projects', activeChannel.id, 'chat');
        const q = query(messagesRef, orderBy('createdAt', 'asc'), limit(20));
        return onSnapshot(q, snap => {
            setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        }, () => setLoading(false));
    }, [roomId, activeChannel.id, activeCompany?.id, user]);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Typing indicator subscription
    useEffect(() => {
        if (!activeCompany?.id || activeChannel.type !== 'company') return;
        const channelRef = doc(db, 'chats', roomId);
        return onSnapshot(channelRef, snap => {
            const data = snap.data();
            const others = (data?.typingUsers || []).filter(uid => uid !== user?.uid);
            const names = others.map(uid => members.find(m => m.id === uid)?.name || 'Someone');
            setTypingUsers(names);
        });
    }, [roomId, activeChannel.type, members, user?.uid]);

    const handleSend = async (e) => {
        e?.preventDefault();
        if (!newMessage.trim() || !user?.uid) return;
        const text = newMessage.trim();
        setNewMessage('');
        stopTyping();
        try {
            const ref = activeChannel.type === 'company'
                ? collection(db, 'chats', roomId, 'messages')
                : collection(db, 'companies', activeCompany.id, 'projects', activeChannel.id, 'chat');
            await addDoc(ref, {
                text, senderId: user.uid,
                senderName: user.name || 'Team Member',
                createdAt: serverTimestamp(), type: 'text', reactions: {}
            });
        } catch (e) { console.error(e); }
    };

    const handleReact = async (msgId, emoji) => {
        const ref = activeChannel.type === 'company'
            ? doc(db, 'chats', roomId, 'messages', msgId)
            : doc(db, 'companies', activeCompany.id, 'projects', activeChannel.id, 'chat', msgId);
        const snap = await getDoc(ref);
        const current = snap.data()?.reactions?.[emoji] || [];
        const updated = current.includes(user.uid)
            ? current.filter(id => id !== user.uid)
            : [...current, user.uid];
        await updateDoc(ref, { [`reactions.${emoji}`]: updated });
    };

    const startTyping = async () => {
        if (activeChannel.type !== 'company') return;
        const channelRef = doc(db, 'chats', roomId);
        try { await setDoc(channelRef, { typingUsers: arrayUnion(user.uid) }, { merge: true }); } catch {}
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(stopTyping, 3000);
    };

    const stopTyping = async () => {
        if (activeChannel.type !== 'company') return;
        const channelRef = doc(db, 'chats', roomId);
        try { await setDoc(channelRef, { typingUsers: arrayRemove(user.uid) }, { merge: true }); } catch {}
    };

    const handleInput = (e) => {
        const val = e.target.value;
        setNewMessage(val);
        startTyping();
        const lastAt = val.lastIndexOf('@');
        if (lastAt !== -1 && !val.slice(lastAt + 1).includes(' ')) {
            setMentionSearch(val.slice(lastAt + 1));
            setShowMentions(true);
        } else { setShowMentions(false); }
    };

    const insertMention = (member) => {
        const lastAt = newMessage.lastIndexOf('@');
        setNewMessage(newMessage.slice(0, lastAt) + `@${member.name} `);
        setShowMentions(false);
        inputRef.current?.focus();
    };

    const onlineMembers = members.filter(m => m.isOnline);
    const offlineMembers = members.filter(m => !m.isOnline);
    const filteredProjects = projects.filter(p => p.title?.toLowerCase().includes(searchQuery.toLowerCase()));

    // Group consecutive messages from same sender within 5 min
    const groupedMessages = messages.map((msg, idx) => {
        const prev = messages[idx - 1];
        const showHeader = !prev || prev.senderId !== msg.senderId ||
            (msg.createdAt?.toDate && prev.createdAt?.toDate &&
             differenceInMinutes(msg.createdAt.toDate(), prev.createdAt.toDate()) > 5);
        return { ...msg, showHeader };
    });

    return (
        <div className="h-full flex overflow-hidden bg-dark-950">

            {/* ── LEFT COLUMN — Channels ── */}
            <div className="w-56 border-r border-dark-800 flex flex-col bg-dark-900 shrink-0">
                {/* Workspace header */}
                <div className="h-12 px-4 flex items-center border-b border-dark-800 shrink-0">
                    <span className="font-black text-white text-sm truncate">{activeCompany?.name || 'Workspace'}</span>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar py-3">
                    {/* Search */}
                    <div className="px-3 mb-3">
                        <div className="flex items-center gap-2 bg-dark-800 rounded-lg px-2 py-1.5">
                            <Search size={12} className="text-slate-500" />
                            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Find channel…"
                                className="bg-transparent text-[11px] text-white outline-none flex-1 placeholder:text-slate-600" />
                        </div>
                    </div>

                    {/* General */}
                    <div className="px-2 mb-1">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-2 mb-1">Channels</p>
                        <button onClick={() => setActiveChannel({ id: 'global', name: 'General', type: 'company' })}
                            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors ${
                                activeChannel.id === 'global' ? 'bg-primary-600/20 text-primary-300' : 'text-slate-400 hover:bg-dark-800 hover:text-white'
                            }`}>
                            <Shield size={14} className="shrink-0" />
                            <span className="truncate">general</span>
                        </button>
                    </div>

                    {/* Project channels */}
                    <div className="px-2 mt-3">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-2 mb-1">Projects</p>
                        {filteredProjects.map(proj => (
                            <button key={proj.id}
                                onClick={() => setActiveChannel({ id: proj.id, name: proj.title, type: 'project' })}
                                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors ${
                                    activeChannel.id === proj.id ? 'bg-primary-600/20 text-primary-300' : 'text-slate-400 hover:bg-dark-800 hover:text-white'
                                }`}>
                                <Hash size={13} className="shrink-0 text-slate-500" />
                                <span className="truncate flex-1 text-left">{proj.title}</span>
                            </button>
                        ))}
                    </div>

                    {/* DMs placeholder */}
                    <div className="px-2 mt-4">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-2 mb-1">Direct Messages</p>
                        {members.filter(m => m.id !== user?.uid).slice(0, 5).map(m => (
                            <div key={m.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-slate-500 text-sm cursor-default">
                                <div className="relative">
                                    <Avatar name={m.name} size={6} />
                                    <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-dark-900 ${m.isOnline ? 'bg-emerald-500' : 'bg-slate-600'}`} />
                                </div>
                                <span className="truncate text-xs">{m.name}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* User footer */}
                <div className="h-12 px-3 border-t border-dark-800 flex items-center gap-2 shrink-0">
                    <div className="relative">
                        <Avatar name={user?.name} size={7} />
                        <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-dark-900" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">{user?.name || 'You'}</p>
                        <p className="text-[9px] text-emerald-500 font-bold">Online</p>
                    </div>
                </div>
            </div>

            {/* ── CENTER COLUMN — Messages ── */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Channel header */}
                <div className="h-12 px-5 flex items-center gap-3 border-b border-dark-800 shrink-0 bg-dark-900/50">
                    {activeChannel.type === 'company' ? <Shield size={16} className="text-primary-400" /> : <Hash size={16} className="text-slate-400" />}
                    <span className="font-black text-white">{activeChannel.name}</span>
                    <span className="text-[10px] text-slate-500 ml-2">{members.length} members</span>
                </div>

                {/* Message feed */}
                <div className="flex-1 overflow-y-auto custom-scrollbar py-2">
                    {loading ? (
                        <div className="flex justify-center py-12 text-slate-600 text-sm">Loading messages…</div>
                    ) : groupedMessages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-600">
                            <Hash size={32} className="mb-2" />
                            <p className="font-bold text-sm">No messages yet</p>
                            <p className="text-xs">Be the first to say something!</p>
                        </div>
                    ) : (
                        groupedMessages.map(msg => (
                            <MessageBubble key={msg.id} msg={msg} showHeader={msg.showHeader}
                                isMe={msg.senderId === user?.uid} onReact={handleReact} />
                        ))
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Typing indicator */}
                {typingUsers.length > 0 && (
                    <div className="px-6 pb-1 text-xs text-slate-500 italic">
                        {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing…
                        <span className="inline-flex gap-0.5 ml-1">
                            {[0,1,2].map(i => <span key={i} className="w-1 h-1 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: `${i*150}ms` }} />)}
                        </span>
                    </div>
                )}

                {/* Input */}
                <div className="px-4 pb-4 shrink-0">
                    <div className="relative">
                        {/* @mention dropdown */}
                        {showMentions && members.filter(m => m.name?.toLowerCase().includes(mentionSearch.toLowerCase())).length > 0 && (
                            <div className="absolute bottom-full left-0 w-52 mb-2 bg-dark-800 border border-dark-600 rounded-xl shadow-2xl overflow-hidden z-50">
                                {members.filter(m => m.name?.toLowerCase().includes(mentionSearch.toLowerCase())).map(m => (
                                    <button key={m.id} onClick={() => insertMention(m)}
                                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-dark-700 text-xs text-white transition-colors text-left">
                                        <Avatar name={m.name} size={6} /> {m.name}
                                    </button>
                                ))}
                            </div>
                        )}

                        <form onSubmit={handleSend} className="flex items-center gap-2 bg-dark-800 border border-dark-700 focus-within:border-dark-500 rounded-xl px-3 py-2 transition-colors">
                            <button type="button" className="text-slate-500 hover:text-slate-300 transition-colors"><Paperclip size={16} /></button>
                            <input ref={inputRef} value={newMessage} onChange={handleInput}
                                onBlur={stopTyping}
                                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                                placeholder={`Message #${activeChannel.name}…`}
                                className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-600" />
                            <div className="relative">
                                <button type="button" onClick={() => setShowEmojiPicker(v => !v)} className="text-slate-500 hover:text-slate-300 transition-colors">
                                    <Smile size={16} />
                                </button>
                                {showEmojiPicker && (
                                    <div className="absolute bottom-8 right-0 flex gap-2 p-2 bg-dark-700 border border-dark-600 rounded-xl shadow-2xl z-50">
                                        {EMOJI_SET.map(e => (
                                            <button type="button" key={e} onClick={() => { setNewMessage(v => v + e); setShowEmojiPicker(false); }}
                                                className="text-base hover:scale-125 transition-transform">{e}</button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <button type="submit" disabled={!newMessage.trim()}
                                className="w-8 h-8 flex items-center justify-center bg-primary-600 hover:bg-primary-500 disabled:opacity-40 text-white rounded-lg transition-all">
                                <Send size={14} />
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            {/* ── RIGHT COLUMN — Members ── */}
            <div className="w-48 border-l border-dark-800 flex flex-col bg-dark-900 shrink-0 hidden xl:flex">
                <div className="h-12 px-4 flex items-center border-b border-dark-800 shrink-0">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Members — {members.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar py-3 px-2 space-y-3">
                    {/* Online */}
                    {onlineMembers.length > 0 && (
                        <div>
                            <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest px-2 mb-1">Online — {onlineMembers.length}</p>
                            {onlineMembers.map(m => (
                                <div key={m.id} className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-dark-800 transition-colors">
                                    <div className="relative">
                                        <Avatar name={m.name} size={6} />
                                        <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-dark-900" />
                                    </div>
                                    <span className="text-xs text-slate-300 truncate">{m.name}</span>
                                </div>
                            ))}
                        </div>
                    )}
                    {/* Offline */}
                    {offlineMembers.length > 0 && (
                        <div>
                            <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest px-2 mb-1">Offline — {offlineMembers.length}</p>
                            {offlineMembers.map(m => (
                                <div key={m.id} className="flex items-center gap-2 px-2 py-1 rounded-lg">
                                    <div className="relative opacity-50">
                                        <Avatar name={m.name} size={6} />
                                        <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-slate-600 border border-dark-900" />
                                    </div>
                                    <span className="text-xs text-slate-600 truncate">{m.name}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
