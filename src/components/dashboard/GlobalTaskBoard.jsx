import { useState, useMemo } from 'react';
import { Plus, Loader2, Trash2, FolderOpen, MoreVertical } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useGlobalTasks } from '../../hooks/useGlobalTasks';
import useStore from '../../store/useStore';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';

const COLUMNS = [
    { id: 'todo',        title: 'To Do',       dot: 'bg-slate-500' },
    { id: 'in-progress', title: 'In Progress',  dot: 'bg-amber-500' },
    { id: 'review',      title: 'In Review',    dot: 'bg-indigo-400' },
    { id: 'done',        title: 'Done',         dot: 'bg-emerald-500' },
];

// Pick a consistent colour for each project label
const PROJECT_COLORS = [
    'bg-primary-500/10 text-primary-400 border-primary-500/20',
    'bg-violet-500/10 text-violet-400 border-violet-500/20',
    'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    'bg-amber-500/10 text-amber-400 border-amber-500/20',
    'bg-rose-500/10 text-rose-400 border-rose-500/20',
    'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
];

export default function GlobalTaskBoard() {
    const { globalTasks, tasksLoading } = useStore();
    const { addTask, deleteTask } = useGlobalTasks();
    const [isAddingCard, setIsAddingCard] = useState(null);
    const [newCardTitle, setNewCardTitle] = useState('');

    // Map projectId → colour index so each project always has the same colour
    const projectColorMap = useMemo(() => {
        const map = {};
        let idx = 0;
        globalTasks.forEach(t => {
            if (t.projectId && !(t.projectId in map)) {
                map[t.projectId] = idx++ % PROJECT_COLORS.length;
            }
        });
        return map;
    }, [globalTasks]);

    const getProjectLabel = (task) => {
        if (!task.projectId && !task.projectTitle) return null;
        const label = task.projectTitle || `Project ${task.projectId?.substring(0, 4)}`;
        const colorClass = PROJECT_COLORS[projectColorMap[task.projectId] ?? 0];
        return { label, colorClass };
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
        await addTask({ title: newCardTitle.trim(), status: colId, type: 'company' });
        setNewCardTitle('');
        setIsAddingCard(null);
    };

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
        cards: globalTasks.filter(t => t.status === col.id),
    }));

    return (
        <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">
                    Global Task Board
                    <span className="ml-2 text-sm font-normal text-slate-500">{globalTasks.length} tasks across all projects</span>
                </h2>
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
                                                            className={`bg-dark-900 p-4 rounded-xl border group transition-all ${
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

                                                            {/* Project label */}
                                                            {projLabel && (
                                                                <div className="flex items-center gap-1 mt-2">
                                                                    <FolderOpen size={10} className="text-slate-500" />
                                                                    <span className={`text-[9px] px-2 py-0.5 rounded-md border font-bold uppercase tracking-widest ${projLabel.colorClass}`}>
                                                                        {projLabel.label}
                                                                    </span>
                                                                </div>
                                                            )}

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
                                                                <span className="text-[9px] text-slate-600 uppercase tracking-wider">
                                                                    {card.assignedTo || card.createdBy || '—'}
                                                                </span>
                                                                <span className="text-[9px] text-slate-700 font-mono">#{card.id.substring(0, 4)}</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </Draggable>
                                            );
                                        })}
                                        {provided.placeholder}

                                        {/* Add card inline */}
                                        {isAddingCard === col.id ? (
                                            <form onSubmit={(e) => handleAddCard(e, col.id)} className="mt-2">
                                                <div className="bg-dark-900 p-3 rounded-xl border border-primary-500/50 shadow-lg">
                                                    <textarea
                                                        autoFocus
                                                        value={newCardTitle}
                                                        onChange={e => setNewCardTitle(e.target.value)}
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddCard(e, col.id); }
                                                            if (e.key === 'Escape') setIsAddingCard(null);
                                                        }}
                                                        className="w-full bg-transparent border-none p-0 text-sm text-white resize-none focus:ring-0 placeholder-slate-600"
                                                        placeholder="Task title..."
                                                        rows={2}
                                                    />
                                                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-dark-800">
                                                        <button type="button" onClick={() => setIsAddingCard(null)} className="text-[11px] font-bold text-slate-500 hover:text-white uppercase tracking-wider">Cancel</button>
                                                        <button type="submit" className="px-3 py-1 bg-primary-600 text-white text-[11px] font-bold rounded-lg hover:bg-primary-500 uppercase tracking-wider">Add</button>
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
        </div>
    );
}
