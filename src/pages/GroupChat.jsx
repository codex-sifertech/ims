import { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, limit } from 'firebase/firestore';
import { db } from '../firebase';
import useStore from '../store/useStore';
import { Send, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export default function GroupChat() {
    const { user, activeCompany } = useStore();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef(null);

    // Derive a chat room ID based on the active company to scope the chat.
    // Fallback to 'global' if no company is selected (though activeCompany should always exist).
    const roomId = activeCompany ? `company-${activeCompany.id}` : 'global';

    useEffect(() => {
        if (!user?.uid) return;

        const messagesRef = collection(db, 'chats', roomId, 'messages');
        const q = query(messagesRef, orderBy('createdAt', 'asc'), limit(100));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedMessages = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setMessages(fetchedMessages);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [roomId, user]);

    useEffect(() => {
        // Scroll to bottom when messages change
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !user?.uid) return;

        const messageText = newMessage;
        setNewMessage(''); // optimistic clear

        try {
            const messagesRef = collection(db, 'chats', roomId, 'messages');
            await addDoc(messagesRef, {
                text: messageText,
                senderId: user.uid,
                senderName: user.name || user.email.split('@')[0],
                createdAt: serverTimestamp()
            });
        } catch (error) {
            console.error("Error sending message:", error);
        }
    };

    if (loading) return <div className="h-full flex items-center justify-center text-slate-500"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="h-full flex flex-col bg-dark-900 border-l border-dark-700">
            <header className="px-6 py-4 border-b border-dark-700 bg-dark-800">
                <h2 className="text-xl font-bold text-white tracking-tight">Group Chat <span className="text-slate-500 text-sm font-normal ml-2"># {activeCompany?.name || 'Global'}</span></h2>
                <p className="text-sm text-slate-400">Real-time messaging for all members in this workspace.</p>
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                {messages.map((msg, index) => {
                    const isMe = msg.senderId === user.uid;
                    const isConsecutive = index > 0 && messages[index - 1].senderId === msg.senderId;

                    return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${isConsecutive ? 'mt-2' : 'mt-6'}`}>
                            <div className={`flex flex-col max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
                                {!isConsecutive && (
                                    <span className="text-xs text-slate-500 mb-1 ml-1 font-medium">{isMe ? 'You' : msg.senderName}</span>
                                )}
                                <div
                                    className={`px-4 py-2 rounded-2xl text-sm leading-relaxed ${isMe
                                            ? 'bg-primary-600 text-white rounded-tr-sm'
                                            : 'bg-dark-700 text-slate-200 rounded-tl-sm border border-dark-600'
                                        }`}
                                >
                                    {msg.text}
                                </div>
                                <span className="text-[10px] text-slate-500 mt-1 mx-1">
                                    {msg.createdAt?.toDate ? format(msg.createdAt.toDate(), 'h:mm a') : 'Sending...'}
                                </span>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
                {messages.length === 0 && (
                    <div className="flex-1 h-full flex items-center justify-center text-slate-500 italic text-sm">
                        No messages yet. Start the conversation!
                    </div>
                )}
            </div>

            <div className="p-4 bg-dark-800 border-t border-dark-700">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1 bg-dark-900 border border-dark-600 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all shadow-inner"
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim()}
                        className="bg-primary-600 text-white rounded-xl px-4 py-3 hover:bg-primary-500 disabled:opacity-50 disabled:hover:bg-primary-600 transition-colors flex items-center justify-center"
                    >
                        <Send size={18} />
                    </button>
                </form>
            </div>
        </div>
    );
}
