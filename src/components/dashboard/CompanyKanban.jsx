import { useState, useMemo } from 'react';
import { Plus, Loader2, Trash2, FolderOpen, MoreVertical, Search, User, Calendar, Flag } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useGlobalTasks } from '../../hooks/useGlobalTasks';
import useStore from '../../store/useStore';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { format } from 'date-fns';

const COLUMNS = [
    { id: 'todo',        title: 'To Do',       dot: 'bg-slate-500' },
    { id: 'in-progress', title: 'In Progress',  dot: 'bg-amber-500' },
    { id: 'review',      title: 'In Review',    dot: 'bg-indigo-400' },
    { id: 'done',        title: 'Done',         dot: 'bg-emerald-500' },
];

export default function CompanyKanban() {
    const { globalTasks, tasksLoading, activeCompany, user } = useStore();
    const { addTaskToCompany, deleteTask } = useGlobalTasks();
    const [isAddingCard, setIsAddingCard] = useState(null);
    const [newCardTitle, setNewCardTitle] = useState('');
    const [newCardPriority, setNewCardPriority] = useState('Medium');
    const [newCardAssignee, setNewCardAssignee] = useState('');
    const [newCardDueDate, setNewCardDueDate] = useState('');

    const onDragEnd = async (result) => {
        if (!result.destination) return;
        const { draggableId, destination } = result;
        const task = globalTasks.find(t => t.id === draggableId);
        if (!task || task.status === destination.droppableId) return;

        try {
            const taskRef = doc(db, task._path);
            await updateDoc(taskRef, { 
                status: destination.droppableId, 
                updatedAt: new Date().toISOString() 
            });
        } catch (err) {
            console.error('Failed to move task:', err);
        }
    };

    const handleAddCard = async (e, colId) => {
        e.preventDefault();
        if (!newCardTitle.trim()) return;
        
        await addTaskToCompany({ 
            title: newCardTitle.trim(), 
            status: colId, 
            priority: newCardPriority,
            assignedTo: newCardAssignee.trim(),
            dueDate: newCardDueDate || null,
            companyId: activeCompany.id
        });
        
        setNewCardTitle('');
        setNewCardPriority('Medium');
        setNewCardAssignee('');
        setNewCardDueDate('');
        setIsAddingCard(null);
    };

    // Filter only company root tasks (not linked to a specific project)
    const companyTasks = useMemo(() => {
        return globalTasks.filter(t => t.isCompanyTask);
    }, [globalTasks]);

    if (tasksLoading) {
        return (
            <div className="bg-dark-800/40 border border-dark-700/50 rounded-[2.5rem] p-12 flex flex-col items-center justify-center text-slate-500 gap-3 backdrop-blur-md">
                <Loader2 className="animate-spin text-primary-500" size={32} />
                <span className="font-bold uppercase tracking-widest text-[10px]">Syncing Company Ledger...</span>
            </div>
        );
    }

    const columns = COLUMNS.map(col => ({
        ...col,
        cards: companyTasks.filter(t => t.status === col.id),
    }));

    return (
        <div className="bg-dark-800/40 border border-dark-700/50 rounded-[2.5rem] p-8 backdrop-blur-md flex flex-col min-h-[600px]">
            <div className="flex items-center justify-between mb-8 shrink-0">
                <div>
                    <h2 className="text-2xl font-black text-white tracking-tighter uppercase flex items-center gap-3">
                        <FolderOpen className="text-primary-500" size={24} />
                        Company Logistics
                    </h2>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Cross-departmental task management</p>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                        {companyTasks.length} ACTIVE LOGS
                    </span>
                </div>
            </div>

            <DragDropContext onDragEnd={onDragEnd}>
                <div className="flex-1 flex gap-6 overflow-x-auto pb-4 custom-scrollbar">
                    {columns.map(col => (
                        <div key={col.id} className="min-w-[320px] w-[320px] bg-dark-900/30 rounded-3xl border border-white/5 flex flex-col max-h-full">
                            {/* Column header */}
                            <div className="p-5 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-2.5 h-2.5 rounded-full ${col.dot} shadow-[0_0_10px_rgba(0,0,0,0.5)]`} />
                                    <h3 className="font-black text-white text-xs uppercase tracking-widest">{col.title}</h3>
                                </div>
                                <span className="text-[10px] font-black text-slate-500 bg-dark-800 px-2.5 py-1 rounded-lg border border-white/5">{col.cards.length}</span>
                            </div>

                            <Droppable droppableId={col.id}>
                                {(provided, snapshot) => (
                                    <div
                                        {...provided.droppableProps}
                                        ref={provided.innerRef}
                                        className={`p-4 flex-1 overflow-y-auto space-y-4 custom-scrollbar transition-colors ${snapshot.isDraggingOver ? 'bg-primary-500/5' : ''}`}
                                    >
                                        {col.cards.map((card, index) => (
                                            <Draggable key={card.id} draggableId={card.id} index={index}>
                                                {(provided, snapshot) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        {...provided.dragHandleProps}
                                                        className={`bg-dark-800/80 backdrop-blur-sm p-5 rounded-2xl border transition-all duration-200 group ${
                                                            snapshot.isDragging
                                                                ? 'border-primary-500 shadow-2xl shadow-primary-500/30 rotate-2 scale-[1.05]'
                                                                : 'border-white/5 hover:border-primary-500/30 hover:shadow-xl'
                                                        }`}
                                                    >
                                                        <div className="flex justify-between items-start gap-3 mb-4">
                                                            <h4 className="text-sm font-bold text-white leading-tight">{card.title}</h4>
                                                            <button
                                                                onClick={() => deleteTask(card.id)}
                                                                className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all shrink-0"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>

                                                        <div className="flex flex-wrap gap-2 mb-4">
                                                            {card.priority && (
                                                                <span className={`text-[9px] px-2.5 py-1 rounded-lg border font-black uppercase tracking-widest flex items-center gap-1.5 ${
                                                                    card.priority === 'High' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 
                                                                    card.priority === 'Low' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                                                    'bg-primary-500/10 text-primary-500 border-primary-500/20'
                                                                }`}>
                                                                    <Flag size={10} />
                                                                    {card.priority}
                                                                </span>
                                                            )}
                                                            {card.dueDate && (
                                                                <span className="text-[9px] px-2.5 py-1 bg-dark-700/50 text-slate-400 border border-white/5 rounded-lg font-black uppercase tracking-widest flex items-center gap-1.5">
                                                                    <Calendar size={10} />
                                                                    {format(new Date(card.dueDate), 'MMM dd')}
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-6 h-6 rounded-lg bg-dark-700 flex items-center justify-center text-slate-400 border border-white/5 overflow-hidden text-[10px] font-black uppercase">
                                                                    {card.assignedTo?.charAt(0) || <User size={12} />}
                                                                </div>
                                                                <span className="text-[10px] text-slate-400 font-black tracking-widest uppercase">
                                                                    {card.assignedTo || 'Unassigned'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}

                                        {/* Inline Add Card */}
                                        {isAddingCard === col.id ? (
                                            <form onSubmit={(e) => handleAddCard(e, col.id)} className="mt-2">
                                                <div className="bg-dark-900 border border-primary-500/50 rounded-2xl p-5 shadow-2xl flex flex-col gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                                    <textarea
                                                        autoFocus
                                                        value={newCardTitle}
                                                        onChange={e => setNewCardTitle(e.target.value)}
                                                        className="w-full bg-transparent border-none p-0 text-sm text-white font-bold resize-none focus:ring-0 placeholder-slate-600 leading-snug"
                                                        placeholder="Log new company objective..."
                                                        rows={2}
                                                    />
                                                    
                                                    <div className="space-y-3 pt-3 border-t border-white/5">
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <select 
                                                                value={newCardPriority} 
                                                                onChange={e => setNewCardPriority(e.target.value)}
                                                                className="bg-dark-800 border border-white/5 rounded-xl px-3 py-2 text-[10px] text-slate-300 font-black uppercase tracking-widest outline-none focus:border-primary-500/50"
                                                            >
                                                                <option value="Low">Low Priority</option>
                                                                <option value="Medium">Medium Priority</option>
                                                                <option value="High">High Priority</option>
                                                            </select>
                                                            <input 
                                                                type="date" 
                                                                value={newCardDueDate}
                                                                onChange={e => setNewCardDueDate(e.target.value)}
                                                                className="bg-dark-800 border border-white/5 rounded-xl px-3 py-2 text-[10px] text-slate-300 font-black uppercase tracking-widest outline-none focus:border-primary-500/50"
                                                            />
                                                        </div>
                                                        <input 
                                                            type="text" 
                                                            placeholder="Assign to (email or name)..." 
                                                            value={newCardAssignee}
                                                            onChange={e => setNewCardAssignee(e.target.value)}
                                                            className="w-full bg-dark-800 border border-white/5 rounded-xl px-3 py-2.5 text-[10px] text-white font-black uppercase tracking-widest outline-none focus:border-primary-500/50"
                                                        />
                                                    </div>

                                                    <div className="flex items-center justify-end gap-3 mt-2">
                                                        <button 
                                                            type="button" 
                                                            onClick={() => setIsAddingCard(null)} 
                                                            className="text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-widest"
                                                        >
                                                            Abort
                                                        </button>
                                                        <button 
                                                            type="submit" 
                                                            disabled={!newCardTitle.trim()} 
                                                            className="px-5 py-2 bg-primary-600 text-white text-[10px] font-black rounded-xl hover:bg-primary-500 disabled:opacity-30 uppercase tracking-widest shadow-lg shadow-primary-600/20 group flex items-center gap-2"
                                                        >
                                                            Log Task <Plus size={14} className="group-hover:rotate-90 transition-transform" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </form>
                                        ) : (
                                            <button
                                                onClick={() => setIsAddingCard(col.id)}
                                                className="w-full py-4 flex items-center justify-center gap-3 text-[10px] font-black text-slate-500 hover:text-primary-400 hover:bg-primary-500/5 hover:border-primary-500/20 rounded-2xl transition-all border border-dashed border-white/10 mt-2 uppercase tracking-widest group"
                                            >
                                                <Plus size={16} className="group-hover:rotate-90 transition-transform" /> 
                                                Provision Log slot
                                            </button>
                                        )}
                                    </div>
                                )}
                            </Droppable>
                        </div>
                    ))}
                </div>
            </DragDropContext>
        </div>
    );
}
