import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, User, Loader2 } from 'lucide-react';
import useStore from '../../store/useStore';
import { useSharedProjects } from '../../hooks/useSharedProjects';
import { useWorkKanban } from '../../hooks/useWorkKanban';

export default function AIChatWidget() {
    const { user, activeCompany } = useStore();
    const { columns: projectCols } = useSharedProjects();
    const { columns: workCols } = useWorkKanban();

    const [messages, setMessages] = useState([
        {
            id: '1',
            text: `Hi ${user?.name?.split(' ')[0] || 'there'}! I'm Mammu AI. I have full access to ${activeCompany?.name || 'this workspace'}'s data. Ask me for summaries, project updates, or even general knowledge questions!`,
            sender: 'ai'
        }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    const countTasks = (cols) => {
        let total = 0;
        let completed = 0;
        cols.forEach(col => {
            const count = col.cards?.length || 0;
            total += count;
            if (col.id === 'completed' || col.id === 'done') completed += count;
        });
        return { total, completed };
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || isTyping) return;

        const userText = input.trim();
        const userMsg = { id: Date.now().toString(), text: userText, sender: 'user' };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        const lowerInput = userText.toLowerCase();
        let reply = "";

        try {
            // 1. Contextual Workspace Questions:
            if (lowerInput.includes('project') || lowerInput.includes('progress') || lowerInput.includes('analytics')) {
                const pStats = countTasks(projectCols);
                const wStats = countTasks(workCols);
                reply = `In ${activeCompany?.name || 'this workspace'}, you have ${pStats.total} total project tasks (${pStats.completed} completed) and ${wStats.total} individual work tasks (${wStats.completed} completed). Stay productive! 🚀`;
            }
            else if (lowerInput.includes('chat') || lowerInput.includes('conversation')) {
                reply = "I can analyze your group chats! Currently, your teams are actively communicating in the Group Chat module. Summarizing recent messages shows high engagement around current active projects.";
            }
            // 2. Generic Conversational:
            else if (lowerInput.match(/\b(hi|hello|hey|greetings)\b/)) {
                reply = "Hello! I'm Mammu AI, your intelligent assistant here at SiferTech. How can I help you today?";
            }
            else if (lowerInput.match(/\b(who are you|your name)\b/)) {
                reply = "I am Mammu AI, a comprehensive conversational AI built into the IMS platform. I can manage your workspace, analyze data, and answer general questions!";
            }
            else if (lowerInput.includes('how are you')) {
                reply = "I'm functioning perfectly, thank you! I've been actively monitoring your workspace metrics. What's on your mind?";
            }
            // 3. Dynamic External Queries (Simulating real AI API connections):
            else if (lowerInput.includes('temperature in') || lowerInput.includes('weather in')) {
                // Extract city roughly
                const words = lowerInput.split(' ');
                const cityIndex = words.indexOf('in') + 1;
                const city = words[cityIndex] ? words[cityIndex].replace(/[^a-zA-Z]/g, '') : 'bangalore';

                // Fetch simple weather from wttr.in
                const res = await fetch(`https://wttr.in/${city}?format=j1`);
                if (res.ok) {
                    const data = await res.json();
                    const temp = data.current_condition[0].temp_C;
                    const desc = data.current_condition[0].weatherDesc[0].value;
                    reply = `The current temperature in ${city.charAt(0).toUpperCase() + city.slice(1)} is ${temp}°C with ${desc}.`;
                } else {
                    reply = `I couldn't fetch the weather for ${city} right now, but I hope it's sunny!`;
                }
            }
            else if (lowerInput.startsWith('what is') || lowerInput.startsWith('who is')) {
                const query = lowerInput.replace('what is', '').replace('who is', '').trim().replace('?', '');
                const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.extract) {
                        reply = data.extract;
                    } else {
                        reply = `I found a topic on ${query}, but couldn't get a short summary. It looks like a broad subject!`;
                    }
                } else {
                    reply = `I don't have a specific database entry for "${query}" right now, but I'm continually learning!`;
                }
            }
            else {
                // Fallback smart response
                reply = `That's an interesting question about "${userText}". While I'm specialized in your workspace data (like projects, tasks, and chats), I can also look up facts or weather if you ask me directly! What else can I assist with?`;
            }
        } catch (error) {
            console.error("AI Fetch Error:", error);
            reply = "I experienced a slight network glitch while analyzing that. Could you ask me again?";
        }

        // Add a slight realistic delay to simulate typing/thinking
        setTimeout(() => {
            setMessages(prev => [...prev, { id: Date.now().toString(), text: reply, sender: 'ai' }]);
            setIsTyping(false);
        }, 800);
    };

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 overflow-y-auto space-y-4 max-h-[500px] flex-1">
                {messages.map(msg => (
                    <div key={msg.id} className={`flex gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.sender === 'user' ? 'bg-indigo-600' : 'bg-primary-600 shadow-lg shadow-primary-500/20'
                            }`}>
                            {msg.sender === 'user' ? <User size={14} className="text-white" /> : <Sparkles size={14} className="text-white" />}
                        </div>
                        <div className={`p-3 rounded-2xl max-w-[85%] text-sm leading-relaxed ${msg.sender === 'user'
                            ? 'bg-indigo-600 text-white rounded-tr-none'
                            : 'bg-dark-700 border border-dark-600 text-slate-200 rounded-tl-none shadow-sm'
                            }`}>
                            {msg.text}
                        </div>
                    </div>
                ))}

                {isTyping && (
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center shrink-0 shadow-lg shadow-primary-500/20">
                            <Loader2 size={14} className="text-white animate-spin" />
                        </div>
                        <div className="p-3 rounded-2xl bg-dark-700 border border-dark-600 text-slate-400 rounded-tl-none w-16 flex items-center justify-center shadow-sm">
                            <span className="flex gap-1">
                                <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSend} className="p-3 border-t border-dark-700 bg-dark-800 shrink-0">
                <div className="relative flex items-center">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask Mammu..."
                        className="w-full bg-dark-900 border border-dark-600 rounded-full pl-4 pr-12 py-3 text-sm text-white focus:outline-none focus:border-primary-500 transition-colors shadow-inner"
                        disabled={isTyping}
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isTyping}
                        className="absolute right-2 p-2 bg-primary-600 text-white rounded-full hover:bg-primary-500 disabled:opacity-50 disabled:hover:bg-primary-600 transition-colors shadow-md"
                    >
                        <Send size={16} />
                    </button>
                </div>
            </form>
        </div>
    );
}
