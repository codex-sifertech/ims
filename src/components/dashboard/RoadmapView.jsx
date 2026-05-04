import { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import useStore from '../../store/useStore';
import { Plus, Trash2, Calendar as CalendarIcon, AlignLeft, Edit2, Check, X, Loader2 } from 'lucide-react';
import { format, differenceInDays, startOfDay, addDays, isBefore } from 'date-fns';

const STATUS_COLORS = {
    'planned': 'bg-slate-500/20 text-slate-300 border-slate-500/30',
    'in-progress': 'bg-primary-500/20 text-primary-300 border-primary-500/30',
    'completed': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
};

const PILL_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#6366f1'];

export default function RoadmapView() {
    const { activeCompany, user } = useStore();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState(null);

    // Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(addDays(new Date(), 14), 'yyyy-MM-dd'));
    const [status, setStatus] = useState('planned');
    const [color, setColor] = useState(PILL_COLORS[0]);

    useEffect(() => {
        if (!activeCompany?.id) return;
        setLoading(true);
        const q = query(collection(db, 'companies', activeCompany.id, 'roadmap'), orderBy('startDate', 'asc'));
        const unsub = onSnapshot(q, (snap) => {
            setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        });
        return unsub;
    }, [activeCompany?.id]);

    const handleSave = async () => {
        if (!title.trim() || !activeCompany?.id) return;

        const payload = {
            title: title.trim(),
            description: description.trim(),
            startDate,
            endDate,
            status,
            color,
            updatedAt: serverTimestamp()
        };

        try {
            if (editingId) {
                await updateDoc(doc(db, 'companies', activeCompany.id, 'roadmap', editingId), payload);
            } else {
                await addDoc(collection(db, 'companies', activeCompany.id, 'roadmap'), {
                    ...payload,
                    createdAt: serverTimestamp(),
                    createdBy: user.uid
                });
            }
            resetForm();
        } catch (err) {
            console.error('Error saving roadmap item:', err);
        }
    };

    const handleDelete = async (id) => {
        if (!activeCompany?.id) return;
        try {
            await deleteDoc(doc(db, 'companies', activeCompany.id, 'roadmap', id));
        } catch (err) {
            console.error('Error deleting roadmap item:', err);
        }
    };

    const startEdit = (item) => {
        setEditingId(item.id);
        setTitle(item.title);
        setDescription(item.description || '');
        setStartDate(item.startDate);
        setEndDate(item.endDate);
        setStatus(item.status);
        setColor(item.color || PILL_COLORS[0]);
        setIsAdding(true);
    };

    const resetForm = () => {
        setEditingId(null);
        setTitle('');
        setDescription('');
        setStartDate(format(new Date(), 'yyyy-MM-dd'));
        setEndDate(format(addDays(new Date(), 14), 'yyyy-MM-dd'));
        setStatus('planned');
        setColor(PILL_COLORS[0]);
        setIsAdding(false);
    };

    if (loading) {
        return (
            <div className="flex-1 m-6 flex items-center justify-center text-slate-500 bg-dark-800 rounded-xl border border-dark-700">
                <Loader2 className="animate-spin text-primary-500 mr-2" size={24} /> Loading roadmap...
            </div>
        );
    }

    // Timeline calculation
    const allDates = items.flatMap(i => [new Date(i.startDate), new Date(i.endDate)]).filter(d => !isNaN(d.getTime()));
    const minDate = allDates.length > 0 ? new Date(Math.min(...allDates)) : new Date();
    const maxDate = allDates.length > 0 ? new Date(Math.max(...allDates)) : addDays(new Date(), 30);
    
    // Pad the view a bit
    const timelineStart = startOfDay(subDays(minDate, 5));
    const timelineEnd = startOfDay(addDays(maxDate, 15));
    const totalDays = Math.max(30, differenceInDays(timelineEnd, timelineStart));

    // Generate month markers
    const months = [];
    let current = new Date(timelineStart);
    while (isBefore(current, timelineEnd)) {
        months.push({
            label: format(current, 'MMM yyyy'),
            offsetPct: (differenceInDays(current, timelineStart) / totalDays) * 100
        });
        current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
    }

    return (
        <div className="flex-1 m-6 bg-dark-800 rounded-xl border border-dark-700 flex flex-col overflow-hidden relative">
            <div className="p-5 border-b border-dark-700 flex justify-between items-center bg-dark-900/50">
                <div>
                    <h2 className="text-xl font-black text-white">Project Roadmap</h2>
                    <p className="text-xs text-slate-400 mt-1">High-level timeline and milestones</p>
                </div>
                {!isAdding && (
                    <button onClick={() => setIsAdding(true)} className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors">
                        <Plus size={16} /> Add Epic
                    </button>
                )}
            </div>

            {isAdding && (
                <div className="p-5 border-b border-dark-700 bg-dark-800/80">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="space-y-3">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Title</label>
                                <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Epic or milestone name..."
                                    className="w-full bg-dark-900 border border-dark-600 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-primary-500" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Description</label>
                                <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description..." rows={2}
                                    className="w-full bg-dark-900 border border-dark-600 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-primary-500 resize-none" />
                            </div>
                        </div>
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Start Date</label>
                                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                                        className="w-full bg-dark-900 border border-dark-600 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-primary-500 custom-date-input" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">End Date</label>
                                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                                        className="w-full bg-dark-900 border border-dark-600 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-primary-500 custom-date-input" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Status</label>
                                    <select value={status} onChange={e => setStatus(e.target.value)}
                                        className="w-full bg-dark-900 border border-dark-600 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-primary-500 appearance-none">
                                        <option value="planned">Planned</option>
                                        <option value="in-progress">In Progress</option>
                                        <option value="completed">Completed</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Color</label>
                                    <div className="flex gap-2 h-[38px] items-center">
                                        {PILL_COLORS.map(c => (
                                            <button key={c} onClick={() => setColor(c)}
                                                className={`w-6 h-6 rounded-full border-2 transition-transform ${color === c ? 'scale-110 border-white' : 'border-transparent hover:scale-110'}`}
                                                style={{ backgroundColor: c }} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <button onClick={resetForm} className="px-4 py-2 text-sm font-bold text-slate-400 hover:text-white transition-colors">Cancel</button>
                        <button onClick={handleSave} disabled={!title.trim() || !startDate || !endDate} className="px-5 py-2 text-sm font-bold text-white bg-primary-600 hover:bg-primary-500 rounded-lg disabled:opacity-50 transition-colors flex items-center gap-2">
                            <Check size={16} /> Save
                        </button>
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-auto custom-scrollbar relative">
                {items.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500">
                        <AlignLeft size={48} className="mb-4 opacity-50" />
                        <p className="font-bold text-lg text-white">No Roadmap Items</p>
                        <p className="text-sm mt-1">Create an epic or milestone to start planning.</p>
                    </div>
                ) : (
                    <div className="min-w-[800px] h-full relative">
                        {/* Timeline Header */}
                        <div className="sticky top-0 z-10 bg-dark-900/90 backdrop-blur-sm border-b border-dark-700 h-10 flex">
                            <div className="w-64 shrink-0 border-r border-dark-700 p-2 bg-dark-900" />
                            <div className="flex-1 relative overflow-hidden">
                                {months.map((m, i) => (
                                    <div key={i} className="absolute top-0 bottom-0 border-l border-dark-700 pl-2 pt-2 text-[10px] font-black text-slate-500 uppercase tracking-widest"
                                         style={{ left: `${m.offsetPct}%` }}>
                                        {m.label}
                                    </div>
                                ))}
                                {/* Today line */}
                                <div className="absolute top-0 bottom-0 w-px bg-red-500/50 z-20" 
                                     style={{ left: `${(differenceInDays(new Date(), timelineStart) / totalDays) * 100}%` }}>
                                    <div className="absolute top-0 -translate-x-1/2 bg-red-500 text-white text-[8px] font-black px-1 py-0.5 rounded uppercase tracking-widest">Today</div>
                                </div>
                            </div>
                        </div>

                        {/* Roadmap Items */}
                        <div className="py-4">
                            {items.map((item, idx) => {
                                const itemStart = new Date(item.startDate);
                                const itemEnd = new Date(item.endDate);
                                const leftPct = Math.max(0, (differenceInDays(itemStart, timelineStart) / totalDays) * 100);
                                const widthPct = Math.min(100 - leftPct, (differenceInDays(itemEnd, itemStart) / totalDays) * 100);

                                return (
                                    <div key={item.id} className="flex group hover:bg-white/[0.02] border-b border-dark-700/50 transition-colors">
                                        <div className="w-64 shrink-0 border-r border-dark-700 p-3 pr-4 flex flex-col justify-center">
                                            <div className="flex items-start justify-between gap-2">
                                                <h4 className="text-sm font-bold text-white truncate" title={item.title}>{item.title}</h4>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                                    <button onClick={() => startEdit(item)} className="p-1 text-slate-400 hover:text-white"><Edit2 size={12} /></button>
                                                    <button onClick={() => handleDelete(item.id)} className="p-1 text-slate-400 hover:text-red-400"><Trash2 size={12} /></button>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border ${STATUS_COLORS[item.status]}`}>
                                                    {item.status.replace('-', ' ')}
                                                </span>
                                                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                                    <CalendarIcon size={10} />
                                                    {format(itemStart, 'MMM d')} - {format(itemEnd, 'MMM d')}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex-1 relative py-3 h-[60px]">
                                            {/* Grid lines */}
                                            {months.map((m, i) => (
                                                <div key={i} className="absolute top-0 bottom-0 border-l border-dark-700/30" style={{ left: `${m.offsetPct}%` }} />
                                            ))}
                                            
                                            {/* The Pill */}
                                            <div 
                                                className="absolute top-3 bottom-3 rounded-md shadow-lg flex items-center px-3 truncate text-xs font-bold text-white/90 cursor-pointer hover:brightness-110 transition-all z-10"
                                                style={{ left: `${leftPct}%`, width: `max(2%, ${widthPct}%)`, backgroundColor: item.color || PILL_COLORS[0] }}
                                                title={`${item.title}\n${item.description || ''}`}
                                            >
                                                {widthPct > 5 && item.title}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
