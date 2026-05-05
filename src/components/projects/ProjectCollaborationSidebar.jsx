import { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, limit } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase';
import useStore from '../../store/useStore';
import {
    Send, FileText, Image as ImageIcon, HelpCircle, X,
    MessageSquare, Paperclip, Settings, Anchor, Users,
    AlertTriangle, UploadCloud, ExternalLink, Trash2, Loader2
} from 'lucide-react';
import { format } from 'date-fns';

// ── File type icon / color ─────────────────────────────────────────────────
function fileColor(ext = '') {
    const e = ext.toLowerCase();
    if (['pdf'].includes(e))                        return 'text-red-400 bg-red-500/10';
    if (['doc', 'docx'].includes(e))               return 'text-blue-400 bg-blue-500/10';
    if (['xls', 'xlsx', 'csv'].includes(e))        return 'text-emerald-400 bg-emerald-500/10';
    if (['png', 'jpg', 'jpeg', 'gif', 'svg'].includes(e)) return 'text-pink-400 bg-pink-500/10';
    if (['js', 'ts', 'jsx', 'tsx', 'json'].includes(e)) return 'text-amber-400 bg-amber-500/10';
    if (['zip', 'rar', 'tar'].includes(e))         return 'text-purple-400 bg-purple-500/10';
    return 'text-slate-400 bg-slate-500/10';
}

export default function ProjectCollaborationSidebar({ projectId, projectTitle, isOpen, onClose }) {
    const { user, projectNodes, activeCompany } = useStore();
    const [activeTab, setActiveTab] = useState('chat');
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [mentionFilter, setMentionFilter] = useState('');
    const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);

    // Real files stored in Firestore
    const [files, setFiles] = useState([]);
    const [uploading, setUploading] = useState(false);

    const messagesEndRef = useRef(null);
    const fileInputRef   = useRef(null);
    const fileUploadRef  = useRef(null);

    // ── Messages subscription ─────────────────────────────────────────────
    useEffect(() => {
        if (!projectId || !user?.uid || !activeCompany?.id) return;
        const messagesRef = collection(db, 'companies', activeCompany.id, 'projects', projectId, 'chat');
        const q = query(messagesRef, orderBy('createdAt', 'asc'), limit(50));
        return onSnapshot(q, snap => {
            setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
    }, [projectId, user, activeCompany?.id]);

    // ── Files subscription ────────────────────────────────────────────────
    useEffect(() => {
        if (!projectId || !activeCompany?.id) return;
        const filesRef = collection(db, 'companies', activeCompany.id, 'projects', projectId, 'files');
        const q = query(filesRef, orderBy('uploadedAt', 'desc'));
        return onSnapshot(q, snap => {
            setFiles(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
    }, [projectId, activeCompany?.id]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isOpen]);

    // ── Send message ──────────────────────────────────────────────────────
    const handleSendMessage = async (textToSend = null) => {
        const text = textToSend || newMessage;
        if (!text.trim() || !user?.uid) return;
        if (!textToSend) setNewMessage('');
        try {
            const messagesRef = collection(db, 'companies', activeCompany.id, 'projects', projectId, 'chat');
            await addDoc(messagesRef, {
                text,
                senderId: user.uid,
                senderName: user.name || 'Team Member',
                senderPhoto: user.photoURL || null,
                createdAt: serverTimestamp(),
                type: 'text',
                reactions: {},
            });
        } catch (error) { console.error('Error sending message:', error); }
    };

    // ── Mention suggestions ───────────────────────────────────────────────
    const handleInputChange = (e) => {
        const value = e.target.value;
        setNewMessage(value);
        const lastHash = value.lastIndexOf('#');
        if (lastHash !== -1 && (lastHash === 0 || value[lastHash - 1] === ' ')) {
            setShowMentionSuggestions(true);
            setMentionFilter(value.substring(lastHash + 1).toLowerCase());
        } else {
            setShowMentionSuggestions(false);
        }
    };

    const insertMention = (node) => {
        const lastHash = newMessage.lastIndexOf('#');
        const before = newMessage.substring(0, lastHash);
        const after = newMessage.substring(newMessage.indexOf(' ', lastHash) !== -1 ? newMessage.indexOf(' ', lastHash) : newMessage.length);
        setNewMessage(`${before}#${node.label}${after} `);
        setShowMentionSuggestions(false);
    };

    const filteredNodes = (projectNodes || []).filter(n => n.label?.toLowerCase().includes(mentionFilter));

    // ── File upload (real Firebase Storage) ───────────────────────────────
    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !activeCompany?.id || !projectId) return;
        setUploading(true);
        try {
            const path = `companies/${activeCompany.id}/projects/${projectId}/files/${Date.now()}_${file.name}`;
            const sRef = storageRef(storage, path);
            await uploadBytes(sRef, file);
            const url = await getDownloadURL(sRef);

            await addDoc(collection(db, 'companies', activeCompany.id, 'projects', projectId, 'files'), {
                name: file.name,
                size: file.size,
                type: file.name.split('.').pop().toLowerCase(),
                url,
                storagePath: path,
                uploadedBy: user.uid,
                uploaderName: user.name || 'Team Member',
                uploadedAt: serverTimestamp(),
            });
        } catch (err) { console.error('Upload failed:', err); }
        setUploading(false);
        // Reset input
        if (fileUploadRef.current) fileUploadRef.current.value = '';
    };

    const formatSize = (bytes) => {
        if (!bytes) return '';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const sendHelpSignal = () => {
        handleSendMessage('🚨 HELP SIGNAL: Assistance requested in this project immediately!');
        setActiveTab('chat');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed right-0 top-0 h-full bg-dark-900 border-l border-dark-700 shadow-2xl z-[110] flex w-[450px]">

            {/* ── Icon rail ── */}
            <div className="w-14 h-full bg-dark-950 border-r border-dark-800 flex flex-col items-center py-5 gap-5 shrink-0">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-white font-black text-base">P</div>

                <button onClick={() => setActiveTab('chat')} title="Chat"
                    className={`p-2.5 rounded-xl transition-all relative ${activeTab === 'chat' ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/20' : 'text-slate-500 hover:text-white hover:bg-dark-800'}`}>
                    <MessageSquare size={18} />
                    {messages.length > 0 && <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full border-2 border-dark-950" />}
                </button>

                <button onClick={() => setActiveTab('files')} title="Files"
                    className={`p-2.5 rounded-xl transition-all ${activeTab === 'files' ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/20' : 'text-slate-500 hover:text-white hover:bg-dark-800'}`}>
                    <FileText size={18} />
                    {files.length > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 text-[8px] bg-primary-500 text-white rounded-full w-4 h-4 flex items-center justify-center font-bold">
                            {files.length > 9 ? '9+' : files.length}
                        </span>
                    )}
                </button>

                <button onClick={() => setActiveTab('help')} title="Help"
                    className={`p-2.5 rounded-xl transition-all ${activeTab === 'help' ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/20' : 'text-slate-500 hover:text-white hover:bg-dark-800'}`}>
                    <HelpCircle size={18} />
                </button>

                <div className="mt-auto flex flex-col gap-4 pb-4">
                    <button className="p-2.5 text-slate-500 hover:text-white transition-colors" title="Settings">
                        <Settings size={18} />
                    </button>
                    <button onClick={onClose} className="p-2.5 text-slate-500 hover:text-red-400 transition-colors" title="Close">
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* ── Main content ── */}
            <div className="flex-1 flex flex-col bg-dark-900 overflow-hidden">

                {/* Header */}
                <header className="px-5 py-4 border-b border-dark-700 bg-dark-800/50 backdrop-blur shrink-0">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                            {activeTab === 'chat'  && <><MessageSquare size={13} className="text-primary-400" /> {projectTitle || 'Project Chat'}</>}
                            {activeTab === 'files' && <><FileText size={13} className="text-primary-400" /> Project Files</>}
                            {activeTab === 'help'  && <><Anchor size={13} className="text-primary-400" /> Support</>}
                        </h3>
                        {activeTab === 'chat' && (
                            <span className="text-[10px] text-slate-500 font-medium">{messages.length} message{messages.length !== 1 ? 's' : ''}</span>
                        )}
                        {activeTab === 'files' && (
                            <span className="text-[10px] text-slate-500 font-medium">{files.length} file{files.length !== 1 ? 's' : ''}</span>
                        )}
                    </div>
                </header>

                {/* ── CHAT TAB ── */}
                {activeTab === 'chat' && (
                    <>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-dark-950/20">
                            {messages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-2 py-12">
                                    <MessageSquare size={28} className="opacity-40" />
                                    <p className="text-xs font-medium">No messages yet</p>
                                    <p className="text-[10px]">Start the conversation!</p>
                                </div>
                            ) : messages.map(msg => {
                                const isMe = msg.senderId === user?.uid;
                                const isSystem = msg.senderId === 'system';
                                const isAlert  = msg.text?.includes('🚨');
                                return (
                                    <div key={msg.id} className={`flex flex-col ${isMe && !isSystem ? 'items-end' : 'items-start'}`}>
                                        <div className="flex items-center gap-2 mb-1 px-1">
                                            <span className={`text-[10px] font-bold uppercase tracking-tighter ${isSystem ? 'text-primary-400' : 'text-slate-500'}`}>
                                                {isMe && !isSystem ? 'You' : msg.senderName}
                                            </span>
                                            {msg.createdAt?.toDate && (
                                                <span className="text-[9px] text-slate-600">{format(msg.createdAt.toDate(), 'HH:mm')}</span>
                                            )}
                                        </div>
                                        <div className={`px-4 py-2.5 rounded-2xl text-xs leading-relaxed max-w-[90%] shadow-sm border ${
                                            isAlert   ? 'bg-red-900/40 border-red-500/50 text-red-100 font-bold' :
                                            isSystem  ? 'bg-primary-600/10 border-primary-500/20 text-primary-200 rounded-tl-sm italic' :
                                            isMe      ? 'bg-primary-600 text-white border-primary-500 rounded-tr-none' :
                                                        'bg-dark-800 text-slate-200 border-dark-700 rounded-tl-none'
                                        }`}>
                                            {msg.text?.split(/(#\w+)/).map((part, i) =>
                                                part.startsWith('#')
                                                    ? <span key={i} className="text-indigo-300 font-black underline cursor-pointer hover:text-indigo-100">{part}</span>
                                                    : part
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="p-4 bg-dark-900 border-t border-dark-700 relative shrink-0">
                            {showMentionSuggestions && filteredNodes.length > 0 && (
                                <div className="absolute left-4 bottom-full mb-2 w-[calc(100%-32px)] bg-dark-800 border border-dark-600 rounded-xl shadow-2xl overflow-hidden z-20">
                                    <div className="p-2 border-b border-dark-700 bg-dark-900/50">
                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Link Project Nodes</span>
                                    </div>
                                    <div className="max-h-40 overflow-y-auto custom-scrollbar">
                                        {filteredNodes.map(node => (
                                            <button key={node.id} onClick={() => insertMention(node)}
                                                className="w-full px-4 py-2.5 text-left text-xs hover:bg-primary-600/20 flex items-center gap-3 group transition-colors border-b border-dark-700/50 last:border-0">
                                                <div className={`w-2 h-2 rounded-full ${node.type === 'mindmap' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                                                <span className="text-slate-300 group-hover:text-white font-medium">{node.label}</span>
                                                <span className="ml-auto text-[8px] text-slate-500 uppercase">{node.type}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="relative">
                                <textarea
                                    value={newMessage}
                                    onChange={handleInputChange}
                                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                                    placeholder="Type a message or # to link nodes…"
                                    rows={2}
                                    className="w-full bg-dark-800 border border-dark-700 rounded-2xl px-4 py-3 pb-12 text-sm text-white focus:outline-none focus:border-primary-500 transition-all resize-none shadow-inner custom-scrollbar"
                                />
                                <div className="absolute left-3 bottom-3 flex items-center gap-1">
                                    <button type="button" onClick={() => fileInputRef.current?.click()}
                                        className="p-2 text-slate-500 hover:text-primary-400 hover:bg-dark-700 rounded-lg transition-all" title="Attach file">
                                        <Paperclip size={15} />
                                    </button>
                                    <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => {
                                        // Send file as a chat message (quick share via file tab)
                                        setActiveTab('files');
                                        handleFileUpload(e);
                                    }} />
                                </div>
                                <button type="submit" disabled={!newMessage.trim()}
                                    className="absolute right-3 bottom-3 w-9 h-9 bg-primary-600 hover:bg-primary-500 text-white rounded-xl flex items-center justify-center transition-all disabled:opacity-40 shadow-lg shadow-primary-600/20">
                                    <Send size={16} />
                                </button>
                            </form>
                        </div>
                    </>
                )}

                {/* ── FILES TAB ── */}
                {activeTab === 'files' && (
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <div className="p-4 bg-dark-800/50 border-b border-dark-700 flex items-center justify-between shrink-0">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Shared Files</span>
                            <button
                                onClick={() => fileUploadRef.current?.click()}
                                disabled={uploading}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-[10px] font-bold transition-colors disabled:opacity-50">
                                {uploading ? <Loader2 size={12} className="animate-spin" /> : <UploadCloud size={12} />}
                                {uploading ? 'Uploading…' : 'Upload File'}
                            </button>
                            <input ref={fileUploadRef} type="file" className="hidden" onChange={handleFileUpload} />
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                            {files.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-3 py-12">
                                    <UploadCloud size={32} className="opacity-30" />
                                    <p className="text-xs font-medium text-center">No files uploaded yet</p>
                                    <p className="text-[10px] text-center">Click "Upload File" to share files with your team</p>
                                    <button
                                        onClick={() => fileUploadRef.current?.click()}
                                        disabled={uploading}
                                        className="mt-2 px-4 py-2 bg-primary-600/20 hover:bg-primary-600 text-primary-400 hover:text-white border border-primary-500/30 hover:border-primary-500 rounded-xl text-xs font-bold transition-all">
                                        Upload your first file
                                    </button>
                                </div>
                            ) : (
                                files.map(file => {
                                    const colorCls = fileColor(file.type);
                                    return (
                                        <div key={file.id} className="p-3 bg-dark-800 border border-dark-700 hover:border-dark-600 rounded-xl transition-all group cursor-pointer">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${colorCls}`}>
                                                    <FileText size={18} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-xs font-bold text-white truncate">{file.name}</h4>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-[9px] text-slate-500 uppercase font-bold">{file.type}</span>
                                                        {file.size && <><span className="w-1 h-1 rounded-full bg-slate-700" /><span className="text-[9px] text-slate-500">{formatSize(file.size)}</span></>}
                                                        {file.uploaderName && <><span className="w-1 h-1 rounded-full bg-slate-700" /><span className="text-[9px] text-slate-500">{file.uploaderName}</span></>}
                                                    </div>
                                                </div>
                                                {file.url && (
                                                    <a href={file.url} target="_blank" rel="noreferrer"
                                                        className="p-1.5 text-slate-500 hover:text-primary-400 hover:bg-dark-700 opacity-0 group-hover:opacity-100 rounded-lg transition-all" title="Open file">
                                                        <ExternalLink size={13} />
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}

                {/* ── HELP TAB ── */}
                {activeTab === 'help' && (
                    <div className="flex-1 p-5 space-y-5 overflow-y-auto custom-scrollbar">
                        {/* Help signal */}
                        <section className="bg-red-900/10 border border-red-500/20 p-5 rounded-2xl">
                            <h4 className="text-sm font-bold text-red-400 mb-2 flex items-center gap-2">
                                <AlertTriangle size={15} /> Urgent Assistance
                            </h4>
                            <p className="text-xs text-slate-400 leading-relaxed mb-5">
                                Send a help signal to notify all active members of this project immediately.
                            </p>
                            <button onClick={sendHelpSignal}
                                className="w-full py-3 bg-red-600 hover:bg-red-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-xl shadow-red-600/20 active:scale-[0.98]">
                                🚨 Broadcast Help Signal
                            </button>
                        </section>

                        {/* Team */}
                        <section className="bg-primary-900/10 border border-primary-500/20 p-5 rounded-2xl">
                            <h4 className="text-sm font-bold text-primary-400 mb-3 flex items-center gap-2">
                                <Users size={15} /> Team Collaboration
                            </h4>
                            <p className="text-xs text-slate-400 leading-relaxed mb-4">
                                Use the chat to coordinate with your team. Mention tasks with # and team members with @.
                            </p>
                            <button onClick={() => setActiveTab('chat')}
                                className="w-full py-2.5 bg-primary-600/20 hover:bg-primary-600 text-primary-400 hover:text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border border-primary-500/30">
                                Go to Chat
                            </button>
                        </section>

                        {/* File sharing */}
                        <section className="bg-dark-800/50 border border-dark-700 p-5 rounded-2xl">
                            <h4 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
                                <FileText size={15} className="text-slate-400" /> File Sharing
                            </h4>
                            <p className="text-xs text-slate-400 leading-relaxed mb-4">
                                Upload and share files directly with your team. All files are stored securely.
                            </p>
                            <button onClick={() => setActiveTab('files')}
                                className="w-full py-2.5 bg-dark-700 hover:bg-dark-600 text-slate-300 hover:text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border border-dark-600">
                                View Files
                            </button>
                        </section>
                    </div>
                )}
            </div>
        </div>
    );
}
