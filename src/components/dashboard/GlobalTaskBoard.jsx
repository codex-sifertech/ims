import { useState, useMemo } from 'react';
import { Plus, Loader2, Trash2, FolderOpen, MoreVertical, Search, Paperclip, ListTodo } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useGlobalTasks } from '../../hooks/useGlobalTasks';
import useStore from '../../store/useStore';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import TaskDetailPanel from '../shared/TaskDetailPanel';

const COLUMNS = [
    { id: 'todo',        title: 'To Do',       dot: 'bg-slate-500' },
    { id: 'in-progress', title: 'In Progress',  dot: 'bg-amber-500' },
    { id: 'review',      title: 'In Review',    dot: 'bg-indigo-400' },
    { id: 'done',        title: 'Done',         dot: 'bg-emerald-500' },
];

// Pick a consistent colour for each project label
const PROJECT_COLORS = [
    'bg-[#FF007F]/10 text-[#FF007F] border-[#FF007F]/20',
    'bg-[#00FF00]/10 text-[#00FF00] border-[#00FF00]/20',
    'bg-[#00E5FF]/10 text-[#00E5FF] border-[#00E5FF]/20',
    'bg-[#FFEA00]/10 text-[#FFEA00] border-[#FFEA00]/20',
    'bg-[#B500FF]/10 text-[#B500FF] border-[#B500FF]/20',
    'bg-[#FF5500]/10 text-[#FF5500] border-[#FF5500]/20',
];

export default function GlobalTaskBoard() {
    const { globalTasks, tasksLoading } = useStore();
    const { addTask, deleteTask } = useGlobalTasks();
    const [isAddingCard, setIsAddingCard] = useState(null);
    const [newCardTitle, setNewCardTitle] = useState('');
    const [newCardPriority, setNewCardPriority] = useState('Medium');
    const [newCardAssignee, setNewCardAssignee] = useState('');
    const [newCardTags, setNewCardTags] = useState('');
    const [selectedTask, setSelectedTask] = useState(null);

    const getProjectColorClass = (title) => {
        if (!title) return PROJECT_COLORS[0];
        const str = String(title).trim().toLowerCase();
        let hash = 0;
        for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
        return PROJECT_COLORS[Math.abs(hash) % PROJECT_COLORS.length];
    };

    const getProjectLabel = (task) => {
        if (task.type === 'company') {
            return { label: 'Company Work', colorClass: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/20' };
        }
        if (!task.projectTitle) return null;
        const colorClass = getProjectColorClass(task.projectTitle);
        return { label: task.projectTitle, colorClass };
    };

    const onDragEnd = async (result) => {
        if (!result.destination) return;
        const { draggableId, destination } = result;
        const task = globalTasks.find(t => t.id === draggableId);
        if (!task || task.status === destination.droppableId) return;

        try {
            const taskRef = doc(db, task._path);
            await updateDoc(taskRef, { status: destination.droppableId, updatedAt: new Date().toISOString() });
        } catch (err) {
            console.error('Failed to move task:', err);
        }
    };

    const handleAddCard = async (e, colId) => {
        e.preventDefault();
        if (!newCardTitle.trim()) return;
        
        await addTask({ 
            title: newCardTitle.trim(), 
            status: colId, 
            type: 'company',
            priority: newCardPriority,
            assignedTo: newCardAssignee.trim(),
            tags: newCardTags.split(',').map(t => t.trim().toUpperCase()).filter(Boolean)
        });
        
        setNewCardTitle('');
        setNewCardPriority('Medium');
        setNewCardAssignee('');
        setNewCardTags('');
        setIsAddingCard(null);
    };

    const [searchQuery, setSearchQuery] = useState('');

    // Filter tasks based on search
    const filteredTasks = useMemo(() => {
        if (!searchQuery.trim()) return globalTasks;
        const q = searchQuery.toLowerCase();
        return globalTasks.filter(t => {
            const assigneeMatch = Array.isArray(t.assignedTo) 
                ? t.assignedTo.some(m => m.name?.toLowerCase().includes(q))
                : t.assignedTo?.toLowerCase().includes(q);
            
            return t.title?.toLowerCase().includes(q) || 
                t.projectTitle?.toLowerCase().includes(q) ||
                assigneeMatch ||
                t.tags?.some(tag => tag.toLowerCase().includes(q));
        });
    }, [globalTasks, searchQuery]);

    if (tasksLoading) {
        return (
            <div className="h-full flex items-center justify-center text-slate-500 gap-3">
                <Loader2 className="animate-spin text-primary-500" size={28} />
                Loading tasks...
            </div>
        );
    }

    const columns = COLUMNS.map(col => ({
        ...col,
        cards: filteredTasks.filter(t => t.status === col.id),
    }));

    return (
        <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-6 shrink-0">
                <div>
                    <h2 className="text-xl font-black text-white tracking-tight">
                        Global Task Board
                    </h2>
                    <p className="text-sm font-medium text-slate-500 mt-1">{filteredTasks.length} tasks matching criteria ({globalTasks.length} total)</p>
                </div>
                <div className="bg-dark-800/80 border border-dark-700 focus-within:border-primary-500 rounded-xl px-4 py-2 flex items-center gap-3 w-72 transition-colors">
                    <Search className="text-slate-500" size={16} />
                    <input 
                        type="text" 
                        placeholder="Search tasks, projects, assignees..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="bg-transparent border-none text-white text-sm outline-none w-full placeholder:text-slate-600"
                    />
                </div>
            </div>

            <DragDropContext onDragEnd={onDragEnd}>
                <div className="flex-1 flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                    {columns.map(col => (
                        <div key={col.id} className="min-w-[300px] w-[300px] bg-dark-800/50 rounded-2xl border border-dark-800 flex flex-col max-h-full">
                            {/* Column header */}
                            <div className="p-4 border-b border-dark-800 flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${col.dot}`} />
                                <h3 className="font-bold text-white text-sm flex-1">{col.title}</h3>
                                <span className="text-slate-500 text-xs bg-dark-900 px-2 py-0.5 rounded-full">{col.cards.length}</span>
                            </div>

                            <Droppable droppableId={col.id}>
                                {(provided, snapshot) => (
                                    <div
                                        {...provided.droppableProps}
                                        ref={provided.innerRef}
                                        className={`p-3 flex-1 overflow-y-auto space-y-3 custom-scrollbar transition-colors ${snapshot.isDraggingOver ? 'bg-primary-500/5' : ''}`}
                                    >
                                        {col.cards.map((card, index) => {
                                            const projLabel = getProjectLabel(card);
                                            return (
                                                <Draggable key={card.id} draggableId={card.id} index={index}>
                                                    {(provided, snapshot) => (
                                                        <div
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            {...provided.dragHandleProps}
                                                            onClick={() => setSelectedTask(card)}
                                                            className={`bg-dark-900 p-4 rounded-xl border group transition-all cursor-pointer ${
                                                                snapshot.isDragging
                                                                    ? 'border-primary-500 shadow-2xl shadow-primary-500/20 rotate-1 scale-[1.02]'
                                                                    : 'border-dark-700 hover:border-dark-600 hover:shadow-lg'
                                                            }`}
                                                        >
                                                            <div className="flex justify-between items-start gap-2 mb-2">
                                                                <h4 className="text-sm font-semibold text-white leading-snug">{card.title}</h4>
                                                                <button
                                                                    onClick={() => deleteTask(card.id)}
                                                                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 transition-all shrink-0"
                                                                >
                                                                    <Trash2 size={12} />
                                                                </button>
                                                            </div>

                                                            {/* Project label & Priority */}
                                                            <div className="flex flex-wrap gap-1 mt-2 items-center">
                                                                {projLabel && (
                                                                    <div className="flex items-center gap-1">
                                                                        <FolderOpen size={10} className="text-slate-500" />
                                                                        <span className={`text-[9px] px-2 py-0.5 rounded-md border font-bold uppercase tracking-widest ${projLabel.colorClass}`}>
                                                                            {projLabel.label}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                                {card.priority && (
                                                                    <span className={`text-[9px] px-2 py-0.5 rounded-md border font-bold uppercase tracking-widest ${
                                                                        card.priority === 'High' ? 'bg-red-500/20 text-red-400 border-red-500/20' : 
                                                                        card.priority === 'Low' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20' :
                                                                        'bg-blue-500/20 text-blue-400 border-blue-500/20'
                                                                    }`}>
                                                                        {card.priority}
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {/* Tags */}
                                                            {card.tags?.length > 0 && (
                                                                <div className="flex flex-wrap gap-1 mt-2">
                                                                    {card.tags.map(tag => (
                                                                        <span key={tag} className="text-[9px] px-1.5 py-0.5 bg-dark-800 text-slate-500 border border-dark-700 rounded font-bold uppercase tracking-widest">
                                                                            {tag}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}

                                                            <div className="flex items-center justify-between mt-3 pt-2 border-t border-dark-800">
                                                                <span className="text-[9px] text-slate-600 font-bold tracking-wider truncate max-w-full">
                                                                    {Array.isArray(card.assignedTo) && card.assignedTo.length > 0 
                                                                        ? card.assignedTo.map(m => m.name).join(', ') 
                                                                        : (card.assignedTo || card.createdBy || 'UNASSIGNED')}
                                                                </span>

                                                                <div className="flex items-center gap-3">
                                                                    {card.subTasks?.length > 0 && (
                                                                        <div className="flex items-center gap-1 text-slate-600">
                                                                            <ListTodo size={10} />
                                                                            <span className="text-[9px] font-bold">{card.subTasks.filter(st => st.completed).length}/{card.subTasks.length}</span>
                                                                        </div>
                                                                    )}
                                                                    {card.attachments?.length > 0 && (
                                                                        <div className="flex items-center gap-1 text-slate-600">
                                                                            <Paperclip size={10} />
                                                                            <span className="text-[9px] font-bold">{card.attachments.length}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </Draggable>
                                            );
                                        })}
                                        {provided.placeholder}

                                        {/* Add card Inline Form Extension */}
                                        {isAddingCard === col.id ? (
                                            <form onSubmit={(e) => handleAddCard(e, col.id)} className="mt-2">
                                                <div className="bg-dark-900 p-3.5 rounded-xl border border-primary-500/50 shadow-lg flex flex-col gap-3">
                                                    <textarea
                                                        autoFocus
                                                        value={newCardTitle}
                                                        onChange={e => setNewCardTitle(e.target.value)}
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddCard(e, col.id); }
                                                            if (e.key === 'Escape') setIsAddingCard(null);
                                                        }}
                                                        className="w-full bg-transparent border-none p-0 text-sm text-white font-medium resize-none focus:ring-0 placeholder-slate-600"
                                                        placeholder="Task objective..."
                                                        rows={2}
                                                    />
                                                    
                                                    <div className="flex flex-col gap-2 border-t border-dark-800 pt-3">
                                                        <div className="flex gap-2">
                                                            <select 
                                                                value={newCardPriority} 
                                                                onChange={e => setNewCardPriority(e.target.value)}
                                                                className="flex-1 bg-dark-800 border-none rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:ring-1 focus:ring-primary-500 appearance-none font-bold outline-none"
                                                            >
                                                                <option value="Low">Low Priority</option>
                                                                <option value="Medium">Medium Priority</option>
                                                                <option value="High">High Priority</option>
                                                            </select>
                                                            <input 
                                                                type="text" 
                                                                placeholder="Assignee..." 
                                                                value={newCardAssignee}
                                                                onChange={e => setNewCardAssignee(e.target.value)}
                                                                className="flex-1 bg-dark-800 border-none rounded-lg px-2 py-1.5 text-xs text-white focus:ring-1 focus:ring-primary-500 font-medium outline-none"
                                                            />
                                                        </div>
                                                        <input 
                                                            type="text" 
                                                            placeholder="Tags (comma separated)..." 
                                                            value={newCardTags}
                                                            onChange={e => setNewCardTags(e.target.value)}
                                                            className="w-full bg-dark-800 border-none rounded-lg px-2 py-1.5 text-[10px] text-slate-400 focus:ring-1 focus:ring-primary-500 uppercase tracking-widest outline-none"
                                                        />
                                                    </div>

                                                    <div className="flex items-center justify-between mt-1">
                                                        <button type="button" onClick={() => setIsAddingCard(null)} className="text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-wider px-2 py-1">Cancel</button>
                                                        <button type="submit" disabled={!newCardTitle.trim()} className="px-4 py-1.5 bg-primary-600 text-white text-[10px] font-black rounded-lg hover:bg-primary-500 disabled:opacity-50 uppercase tracking-wider">Publish Task</button>
                                                    </div>
                                                </div>
                                            </form>
                                        ) : (
                                            <button
                                                onClick={() => setIsAddingCard(col.id)}
                                                className="w-full py-3 flex items-center justify-center gap-2 text-xs font-bold text-slate-500 hover:text-primary-400 hover:bg-primary-500/5 hover:border-primary-500/20 rounded-xl transition-all border border-dashed border-dark-700 mt-2 uppercase tracking-widest"
                                            >
                                                <Plus size={14} /> Add Task
                                            </button>
                                        )}
                                    </div>
                                )}
                            </Droppable>
                        </div>
                    ))}
                </div>
            </DragDropContext>

            {selectedTask && (
                <TaskDetailPanel
                    task={selectedTask}
                    members={[]}
                    onClose={() => setSelectedTask(null)}
                    onUpdate={(updates) => setSelectedTask(t => ({ ...t, ...updates }))}
                />
            )}
        </div>
    );
}
