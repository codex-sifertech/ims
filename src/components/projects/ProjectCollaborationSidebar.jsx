import { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import useStore from '../../store/useStore';
import { Send, Hash, FileText, Image as ImageIcon, HelpCircle, Code, X, ChevronRight, MessageSquare, Paperclip, Loader2, Settings, Anchor } from 'lucide-react';
import { format } from 'date-fns';

export default function ProjectCollaborationSidebar({ projectId, isOpen, onClose }) {
    const { user, projectNodes, activeCompany } = useStore();
    const [activeTab, setActiveTab] = useState('chat'); // 'chat', 'code', 'help'
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [mentionFilter, setMentionFilter] = useState('');
    const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

    const [mockFiles, setMockFiles] = useState([
        { name: 'Architecture_Phase1.pdf', size: '2.4 MB', type: 'pdf', date: '2 days ago' },
        { name: 'Main_Workflow.json', size: '156 KB', type: 'json', date: '5 hours ago' },
        { name: 'Asset_Registry.xlsx', size: '1.1 MB', type: 'xlsx', date: 'Yesterday' },
        { name: 'Core_Logic.js', size: '45 KB', type: 'js', date: '10 mins ago' },
    ]);

    // Sync messages
    useEffect(() => {
        if (!projectId || !user?.uid) return;

        const messagesRef = collection(db, 'companies', activeCompany.id, 'projects', projectId, 'chat');
        const q = query(messagesRef, orderBy('createdAt', 'asc'), limit(50));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedMessages = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setMessages(fetchedMessages);
        });

        return () => unsubscribe();
    }, [projectId, user]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isOpen]);

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
                createdAt: serverTimestamp(),
                type: 'text'
            });
        } catch (error) {
            console.error("Error sending message:", error);
        }
    };

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

    const filteredNodes = projectNodes.filter(n => n.label.toLowerCase().includes(mentionFilter));

    const sendHelpSignal = () => {
        handleSendMessage("🚨 HELP SIGNAL: Assistance requested in this project immediately!");
        setActiveTab('chat');
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            setMockFiles(prev => [{
                name: file.name,
                size: (file.size / 1024).toFixed(1) + ' KB',
                type: file.name.split('.').pop(),
                date: 'Just now'
            }, ...prev]);
        }
    };

    return (
        <div className={`fixed right-0 top-0 h-full bg-dark-900 border-l border-dark-700 shadow-2xl transition-all duration-300 z-[110] flex ${isOpen ? 'w-[450px]' : 'w-0'}`}>
            {/* Sidebar Handle / Toggle when closed */}
            {!isOpen && (
                <div className="absolute -left-12 top-1/2 -translate-y-1/2 flex flex-col gap-2">
                    <button 
                        onClick={() => onClose()} // Parent should handle toggle
                        className="w-12 h-12 bg-dark-800 border border-dark-600 rounded-l-xl flex items-center justify-center text-slate-400 hover:text-white transition-all shadow-xl"
                    >
                        <MessageSquare size={20} />
                    </button>
                </div>
            )}

            {/* Inner Tabs Sidebar */}
            <div className="w-16 h-full bg-dark-950 border-r border-dark-800 flex flex-col items-center py-6 gap-6 shrink-0">
                <div className="mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-white font-black text-lg">I</div>
                </div>

                <button 
                    onClick={() => setActiveTab('chat')}
                    title="Collaboration Chat"
                    className={`p-3 rounded-xl transition-all relative ${activeTab === 'chat' ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/20' : 'text-slate-500 hover:text-white hover:bg-dark-800'}`}
                >
                    <MessageSquare size={20} />
                    <div className="absolute top-2 right-2 w-2 h-2 bg-emerald-500 rounded-full border-2 border-dark-950"></div>
                </button>
                <button 
                    onClick={() => setActiveTab('code')}
                    title="Project Repository"
                    className={`p-3 rounded-xl transition-all ${activeTab === 'code' ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/20' : 'text-slate-500 hover:text-white hover:bg-dark-800'}`}
                >
                    <FileText size={20} />
                </button>
                <button 
                    onClick={() => setActiveTab('help')}
                    title="Assistance & Sync"
                    className={`p-3 rounded-xl transition-all ${activeTab === 'help' ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/20' : 'text-slate-500 hover:text-white hover:bg-dark-800'}`}
                >
                    <HelpCircle size={20} />
                </button>
                
                <div className="mt-auto pb-4 flex flex-col gap-4">
                    <button className="p-3 text-slate-500 hover:text-white transition-colors">
                        <Settings size={20} />
                    </button>
                    <button onClick={() => onClose()} className="p-3 text-slate-500 hover:text-red-400 transition-colors">
                        <X size={20} />
                    </button>
                </div>
            </div>

            {/* Content Container */}
            <div className="flex-1 flex flex-col bg-dark-900 overflow-hidden">
                {/* Header */}
                <header className="px-6 py-5 border-b border-dark-700 bg-dark-800/50 backdrop-blur shrink-0">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                            {activeTab === 'chat' && <><MessageSquare size={14} className="text-primary-500" /> Collaboration</>}
                            {activeTab === 'code' && <><FileText size={14} className="text-primary-500" /> Repository</>}
                            {activeTab === 'help' && <><Anchor size={14} className="text-primary-500" /> Support</>}
                        </h3>
                        {activeTab === 'chat' && (
                            <div className="flex -space-x-2">
                                {[1,2,3].map(i => (
                                    <div key={i} className="w-6 h-6 rounded-full border-2 border-dark-900 bg-dark-700 overflow-hidden">
                                        <div className="w-full h-full bg-gradient-to-tr from-slate-600 to-slate-400"></div>
                                    </div>
                                ))}
                                <div className="w-6 h-6 rounded-full border-2 border-dark-900 bg-emerald-500/20 flex items-center justify-center text-[8px] font-bold text-emerald-400">+2</div>
                            </div>
                        )}
                    </div>
                </header>

                {/* Tab Specific Views */}
                <div className="flex-1 overflow-hidden flex flex-col">
                    {activeTab === 'chat' && (
                        <>
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-dark-950/20">
                                {messages.map((msg, idx) => {
                                    const isMe = msg.senderId === user?.uid;
                                    const isAlert = msg.text.includes('🚨');
                                    return (
                                        <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                            <div className="flex items-center gap-2 mb-1 px-1">
                                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{isMe ? 'You' : msg.senderName}</span>
                                                <span className="text-[9px] text-slate-600">{msg.createdAt ? format(msg.createdAt.toDate(), 'HH:mm') : '...'}</span>
                                            </div>
                                            <div className={`px-4 py-3 rounded-2xl text-xs leading-relaxed max-w-[90%] shadow-lg border ${
                                                isAlert ? 'bg-red-900/40 border-red-500/50 text-red-100 font-bold' :
                                                isMe ? 'bg-primary-600 text-white border-primary-500 rounded-tr-none' : 
                                                'bg-dark-800 text-slate-200 border-dark-700 rounded-tl-none'
                                            }`}>
                                                {msg.text.split(/(#\w+)/).map((part, i) => 
                                                    part.startsWith('#') ? <span key={i} className="text-indigo-300 font-black underline cursor-pointer hover:text-indigo-100">{part}</span> : part
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>

                            <div className="p-4 bg-dark-900 border-t border-dark-700 relative">
                                {showMentionSuggestions && filteredNodes.length > 0 && (
                                    <div className="absolute left-4 bottom-full mb-2 w-[calc(100%-32px)] bg-dark-800 border border-dark-600 rounded-xl shadow-2xl overflow-hidden z-20">
                                        <div className="p-2 border-b border-dark-700 bg-dark-900/50">
                                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Link Project Nodes</span>
                                        </div>
                                        <div className="max-h-48 overflow-y-auto custom-scrollbar">
                                            {filteredNodes.map(node => (
                                                <button 
                                                    key={node.id}
                                                    onClick={() => insertMention(node)}
                                                    className="w-full px-4 py-2.5 text-left text-xs hover:bg-primary-600/20 flex items-center gap-3 group transition-colors border-b border-dark-700/50 last:border-0"
                                                >
                                                    <div className={`w-2 h-2 rounded-full ${node.type === 'mindmap' ? 'bg-amber-400' : 'bg-emerald-400'}`}></div>
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
                                        placeholder="Type message or use # to link nodes..."
                                        rows={2}
                                        className="w-full bg-dark-800 border border-dark-700 rounded-2xl px-4 py-3 pb-12 text-sm text-white focus:outline-none focus:border-primary-500 transition-all resize-none shadow-inner custom-scrollbar"
                                    />
                                    <div className="absolute left-3 bottom-3 flex items-center gap-1">
                                        <button 
                                            type="button" 
                                            onClick={() => fileInputRef.current?.click()}
                                            className="p-2 text-slate-500 hover:text-primary-400 hover:bg-dark-700 rounded-lg transition-all"
                                        >
                                            <Paperclip size={16} />
                                        </button>
                                        <button 
                                            type="button" 
                                            className="p-2 text-slate-500 hover:text-primary-400 hover:bg-dark-700 rounded-lg transition-all"
                                        >
                                            <ImageIcon size={16} />
                                        </button>
                                    </div>
                                    <button 
                                        type="submit"
                                        disabled={!newMessage.trim()}
                                        className="absolute right-3 bottom-3 w-10 h-10 bg-primary-600 hover:bg-primary-500 text-white rounded-xl flex items-center justify-center transition-all disabled:opacity-50 disabled:grayscale shadow-lg shadow-primary-600/20"
                                    >
                                        <Send size={18} />
                                    </button>
                                    <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                                </form>
                            </div>
                        </>
                    )}

                    {activeTab === 'code' && (
                        <div className="flex-1 flex flex-col overflow-hidden">
                            <div className="p-4 bg-dark-800/50 border-b border-dark-700 flex items-center justify-between">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Store</span>
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="px-3 py-1.5 bg-primary-600 text-white rounded-lg text-[10px] font-bold hover:bg-primary-500 transition-colors"
                                >
                                    Upload File
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                                {mockFiles.map((file, i) => (
                                    <div key={i} className="p-3 bg-dark-800 border border-dark-700 rounded-xl hover:border-slate-600 transition-all group cursor-pointer shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-dark-900 rounded-lg flex items-center justify-center text-primary-500 group-hover:scale-110 transition-transform">
                                                <FileText size={20} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-xs font-bold text-white truncate">{file.name}</h4>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[9px] text-slate-500">{file.size}</span>
                                                    <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                                                    <span className="text-[9px] text-slate-500">{file.date}</span>
                                                </div>
                                            </div>
                                            <button className="p-2 text-slate-500 hover:text-white opacity-0 group-hover:opacity-100 transition-all">
                                                <Paperclip size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'help' && (
                        <div className="flex-1 p-6 space-y-6 overflow-y-auto custom-scrollbar">
                            <section className="bg-red-900/10 border border-red-500/20 p-5 rounded-2xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 blur-3xl -mr-10 -mt-10"></div>
                                <h4 className="text-sm font-bold text-red-400 mb-2 flex items-center gap-2">
                                    <Activity size={16} /> Urgent Assistance
                                </h4>
                                <p className="text-xs text-slate-400 leading-relaxed mb-6">
                                    Sending a help signal will notify all active members of this project and trigger a global notification.
                                </p>
                                <button 
                                    onClick={sendHelpSignal}
                                    className="w-full py-3.5 bg-red-600 hover:bg-red-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-xl shadow-red-600/20 active:scale-[0.98]"
                                >
                                    Broadcast Help Signal
                                </button>
                            </section>

                            <section className="bg-primary-900/10 border border-primary-500/20 p-5 rounded-2xl">
                                <h4 className="text-sm font-bold text-primary-400 mb-4 flex items-center gap-2">
                                    <Users size={16} /> Live Collaboration
                                </h4>
                                <div className="space-y-4">
                                    <div className="p-4 bg-dark-800/80 rounded-xl border border-dark-700">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase">Live Rooms</span>
                                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[8px] font-bold border border-emerald-500/20">Active</span>
                                        </div>
                                        <p className="text-xs text-white font-medium mb-3 truncate">Product Design Review</p>
                                        <button className="w-full py-2 bg-primary-600/20 hover:bg-primary-600 text-primary-400 hover:text-white text-[10px] font-bold rounded-lg transition-all border border-primary-500/30">
                                            Join Meeting
                                        </button>
                                    </div>
                                    <button className="w-full py-3 bg-dark-800 hover:bg-dark-700 border border-dark-700 text-slate-300 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all">
                                        Schedule Sync
                                    </button>
                                </div>
                            </section>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

