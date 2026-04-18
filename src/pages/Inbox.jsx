import { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, limit } from 'firebase/firestore';
import { db } from '../firebase';
import useStore from '../store/useStore';
import { useProjects } from '../hooks/useProjects';
import { 
    Send, 
    Hash, 
    FileText, 
    MessageSquare, 
    Paperclip, 
    Search, 
    MoreVertical, 
    Users, 
    Folder, 
    Shield, 
    Bell,
    Upload,
    ChevronRight,
    Loader2,
    Calendar,
    Activity
} from 'lucide-react';
import { format } from 'date-fns';

export default function Inbox() {
    const { user, activeCompany } = useStore();
    const { projects, loading: projectsLoading } = useProjects();
    const [activeChannel, setActiveChannel] = useState({ id: 'global', name: 'Global Workspace', type: 'company' });
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [activeTab, setActiveTab] = useState('chat'); // 'chat', 'files'
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Derived Room ID
    const getRoomId = (channel) => {
        if (channel.type === 'company') return `company-${activeCompany?.id}`;
        return channel.id; // project ID
    };

    const roomId = getRoomId(activeChannel);

    useEffect(() => {
        if (!user?.uid || !activeCompany?.id) return;

        setLoading(true);
        // Correct path logic:
        // Global: chats/company-ID/messages
        // Project: companies/company-ID/projects/project-ID/chat
        const messagesRef = activeChannel.type === 'company' 
            ? collection(db, 'chats', roomId, 'messages')
            : collection(db, 'companies', activeCompany.id, 'projects', activeChannel.id, 'chat');

        const q = query(messagesRef, orderBy('createdAt', 'asc'), limit(50));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedMessages = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setMessages(fetchedMessages);
            setLoading(false);
        }, (error) => {
            console.error("Inbox sync error:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [roomId, activeChannel.id, activeCompany?.id, user]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !user?.uid) return;

        const text = newMessage;
        setNewMessage('');

        try {
            const messagesRef = activeChannel.type === 'company' 
                ? collection(db, 'chats', roomId, 'messages')
                : collection(db, 'companies', activeCompany.id, 'projects', activeChannel.id, 'chat');
                
            await addDoc(messagesRef, {
                text,
                senderId: user.uid,
                senderName: user.name || 'Team Member',
                createdAt: serverTimestamp(),
                type: 'text'
            });
        } catch (error) {
            console.error("Error sending message:", error);
        }
    };

    const filteredProjects = projects.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <div className="h-full flex overflow-hidden bg-dark-950">
            {/* Inbox Sidebar */}
            <div className="w-80 border-r border-dark-800 flex flex-col bg-dark-900/50 backdrop-blur-xl shrink-0">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-black text-white tracking-widest uppercase">Inbox</h2>
                        <button className="p-2 text-slate-500 hover:text-white transition-colors">
                            <Bell size={20} />
                        </button>
                    </div>

                    <div className="relative mb-6">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                        <input 
                            type="text"
                            placeholder="Find channels..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-dark-800/50 border border-dark-700/50 rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-primary-500 transition-all"
                        />
                    </div>

                    <div className="space-y-8 overflow-y-auto max-h-[calc(100vh-250px)] custom-scrollbar pr-2">
                        {/* Workspace Section */}
                        <section>
                            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 px-2">Workspaces</h3>
                            <button 
                                onClick={() => setActiveChannel({ id: 'global', name: 'Global Workspace', type: 'company' })}
                                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all group ${activeChannel.id === 'global' ? 'bg-primary-600/20 text-primary-400 border border-primary-500/20' : 'text-slate-400 hover:bg-dark-800'}`}
                            >
                                <div className={`p-2 rounded-lg transition-colors ${activeChannel.id === 'global' ? 'bg-primary-500 text-white' : 'bg-dark-800 text-slate-500 group-hover:text-white'}`}>
                                    <Shield size={16} />
                                </div>
                                <span className="text-sm font-bold flex-1 text-left">General</span>
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                            </button>
                        </section>

                        {/* project Channels Section */}
                        <section>
                            <div className="flex items-center justify-between mb-3 px-2">
                                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Project Channels</h3>
                                <span className="text-[10px] font-bold text-slate-600 bg-dark-800 px-2 py-0.5 rounded-full">{projects.length}</span>
                            </div>
                            <div className="space-y-1">
                                {projectsLoading ? (
                                    <div className="py-4 flex justify-center"><Loader2 className="animate-spin text-slate-700" size={20} /></div>
                                ) : (
                                    filteredProjects.map(proj => (
                                        <button 
                                            key={proj.id}
                                            onClick={() => setActiveChannel({ id: proj.id, name: proj.name, type: 'project' })}
                                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${activeChannel.id === proj.id ? 'bg-primary-600/20 text-primary-400 border border-primary-500/20' : 'text-slate-400 hover:bg-dark-800'}`}
                                        >
                                            <Hash size={16} className={activeChannel.id === proj.id ? 'text-primary-500' : 'text-slate-600 group-hover:text-slate-400'} />
                                            <span className="text-sm font-medium flex-1 text-left truncate">{proj.name}</span>
                                            {proj.status === 'urgent' && <div className="w-4 h-4 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center text-[8px] font-black">!</div>}
                                        </button>
                                    ))
                                )}
                            </div>
                        </section>
                    </div>
                </div>

                {/* Bottom Profile Mini */}
                <div className="mt-auto p-4 border-t border-dark-800 bg-dark-900/80 backdrop-blur">
                    <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-dark-800 transition-colors cursor-pointer group">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-lg">
                           {user?.name?.[0] || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-white truncate">{user?.name || 'User'}</p>
                            <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
                        </div>
                        <MoreVertical size={16} className="text-slate-600 group-hover:text-slate-400" />
                    </div>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col bg-dark-900 min-w-0 overflow-hidden relative">
                {/* Channel Header */}
                <header className="h-20 px-8 flex items-center justify-between border-b border-dark-800 bg-dark-900/50 backdrop-blur-md z-10">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary-600/10 rounded-2xl flex items-center justify-center">
                            {activeChannel.type === 'company' ? <Shield className="text-primary-400" size={20} /> : <Hash className="text-primary-400" size={20} />}
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-white tracking-tight">{activeChannel.name}</h3>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                <span className="flex items-center gap-1"><Users size={12} /> 5 Active Members</span>
                                <span className="w-1 h-1 rounded-full bg-dark-700 text-slate-700"></span>
                                <span className="flex items-center gap-1"><Calendar size={12} /> Created Dec 2023</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex bg-dark-800 p-1 rounded-xl border border-dark-700">
                            <button 
                                onClick={() => setActiveTab('chat')}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'chat' ? 'bg-primary-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                            >
                                Chat
                            </button>
                            <button 
                                onClick={() => setActiveTab('files')}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'files' ? 'bg-primary-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                            >
                                Files
                            </button>
                        </div>
                        <span className="w-px h-6 bg-dark-700 mx-2"></span>
                        <button className="p-2 text-slate-500 hover:text-white hover:bg-dark-800 rounded-lg transition-all">
                            <Activity size={20} />
                        </button>
                    </div>
                </header>

                {/* Content */}
                <div className="flex-1 overflow-hidden flex flex-col relative">
                    {activeTab === 'chat' ? (
                        <>
                            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-opacity-5">
                                {loading && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-dark-900/50 backdrop-blur-sm z-20">
                                        <Loader2 className="animate-spin text-primary-500" size={32} />
                                    </div>
                                )}
                                
                                {messages.map((msg, idx) => {
                                    const isMe = msg.senderId === user?.uid;
                                    const showHeader = idx === 0 || messages[idx-1].senderId !== msg.senderId;

                                    return (
                                        <div key={msg.id} className={`flex gap-4 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                            {!isMe && (
                                                <div className="w-10 h-10 rounded-2xl bg-dark-800 flex items-center justify-center shrink-0 border border-dark-700 text-white font-bold text-xs ring-2 ring-primary-500/10">
                                                    {msg.senderName?.[0]}
                                                </div>
                                            )}
                                            <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[70%]`}>
                                                {showHeader && (
                                                    <div className="flex items-center gap-2 mb-2 px-1">
                                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">{isMe ? 'You' : msg.senderName}</span>
                                                        <span className="text-[9px] text-slate-600">{msg.createdAt ? format(msg.createdAt.toDate(), 'HH:mm') : 'Syncing...'}</span>
                                                    </div>
                                                )}
                                                <div className={`px-5 py-3.5 rounded-3xl text-sm leading-relaxed shadow-2xl border ${
                                                    isMe ? 'bg-primary-600 text-white border-primary-500/50 rounded-tr-none' : 
                                                    'bg-dark-800 text-slate-200 border-dark-700/50 rounded-tl-none'
                                                }`}>
                                                    {msg.text}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />

                                {messages.length === 0 && !loading && (
                                    <div className="flex flex-col items-center justify-center h-full text-slate-500 opacity-50">
                                        <MessageSquare size={48} className="mb-4" />
                                        <p className="font-bold">No messages here yet</p>
                                        <p className="text-xs">Be the first to say hello!</p>
                                    </div>
                                )}
                            </div>

                            {/* Input Field */}
                            <div className="p-8 bg-dark-900 border-t border-dark-800 relative">
                                <form onSubmit={handleSendMessage} className="relative group">
                                    <div className="absolute inset-0 bg-primary-500/5 blur-2xl group-focus-within:bg-primary-500/10 transition-all rounded-3xl"></div>
                                    <div className="relative bg-dark-800/80 border border-dark-700 p-2 rounded-3xl flex items-center shadow-inner backdrop-blur-sm group-focus-within:border-primary-500/50 transition-all">
                                        <button type="button" className="p-3 text-slate-500 hover:text-primary-400 transition-colors">
                                            <Paperclip size={20} />
                                        </button>
                                        <input 
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            placeholder={`Message in #${activeChannel.name}...`}
                                            className="flex-1 bg-transparent border-none px-2 text-sm text-white focus:outline-none placeholder:text-slate-600"
                                        />
                                        <button 
                                            type="submit"
                                            disabled={!newMessage.trim()}
                                            className="ml-2 w-12 h-12 bg-primary-600 hover:bg-primary-500 text-white rounded-2xl flex items-center justify-center transition-all disabled:opacity-50 disabled:grayscale shadow-xl shadow-primary-600/20 active:scale-95"
                                        >
                                            <Send size={20} />
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto custom-scrollbar">
                            {/* File Management View */}
                            {[1,2,3,4].map(i => (
                                <div key={i} className="p-6 bg-dark-800/50 border border-dark-700 rounded-3xl hover:bg-dark-800 transition-all group cursor-pointer border-dashed">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="p-3 bg-dark-900 rounded-2xl text-primary-500">
                                            <FileText size={24} />
                                        </div>
                                        <button className="text-slate-500 hover:text-white"><MoreVertical size={16} /></button>
                                    </div>
                                    <h4 className="text-sm font-bold text-white mb-2 truncate">Project_Assets_v{i}.zip</h4>
                                    <div className="flex items-center gap-3 text-[10px] text-slate-500 font-bold uppercase">
                                        <span>4.2 MB</span>
                                        <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                                        <span>2 hours ago</span>
                                    </div>
                                </div>
                            ))}
                            <div className="border-2 border-dashed border-dark-800 rounded-3xl flex flex-col items-center justify-center p-8 text-slate-500 hover:border-primary-500/50 hover:text-primary-400 transition-all cursor-pointer group">
                                <Upload size={32} className="mb-4 opacity-20 group-hover:opacity-100 transition-opacity" />
                                <span className="text-xs font-black uppercase tracking-widest">Upload Resource</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Activity Sidebar (Optional but makes it feel "best") */}
            <div className="w-64 border-l border-dark-800 bg-dark-900/30 backdrop-blur flex flex-col shrink-0 hidden xl:flex">
                <div className="p-6 border-b border-dark-800">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Channel Details</h4>
                    <div className="aspect-video bg-dark-800 rounded-2xl overflow-hidden mb-4 border border-dark-700 flex items-center justify-center">
                        <Folder className="text-slate-700" size={32} />
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                        Collective communication hub for {activeChannel.name}. Use this channel for real-time updates and file sharing.
                    </p>
                </div>
                <div className="p-6">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Shared Resources</h4>
                    <div className="space-y-4">
                        {[1,2].map(i => (
                            <div key={i} className="flex items-center gap-3 group">
                                <div className="w-8 h-8 rounded-lg bg-dark-800 border border-dark-700 flex items-center justify-center text-slate-500 group-hover:text-primary-500 transition-colors">
                                    <FileText size={14} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-bold text-slate-300 truncate">Handover_Notes.pdf</p>
                                    <p className="text-[8px] text-slate-600 font-bold uppercase">Shared by Jane • Yesterday</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
