import { useState, useEffect } from 'react';
import { Plus, MoreVertical, Loader2, Trash2 } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useProjectTasks } from '../../hooks/useProjectTasks';

export default function ProjectInternalKanban({ projectId }) {
    const { tasks, loading, addTask, updateTask, deleteTask } = useProjectTasks(projectId);
    const [columns, setColumns] = useState([]);
    const [isAddingCard, setIsAddingCard] = useState(null); // column id
    const [newCardTitle, setNewCardTitle] = useState('');

    useEffect(() => {
        const newCols = [
            { id: 'todo', title: 'To Do', cards: tasks.filter(t => t.status === 'todo') },
            { id: 'in-progress', title: 'In Progress', cards: tasks.filter(t => t.status === 'in-progress') },
            { id: 'review', title: 'In Review', cards: tasks.filter(t => t.status === 'review') },
            { id: 'done', title: 'Done', cards: tasks.filter(t => t.status === 'done') }
        ];

        setColumns(newCols);
    }, [tasks]);

    const onDragEnd = async (result) => {
        if (!result.destination) return;
        const { source, destination, draggableId } = result;

        if (source.droppableId === destination.droppableId && source.index === destination.index) return;

        // Optimistic update for UI feel (optional, but since we have real-time sync, we can just update Firestore)
        try {
            await updateTask(draggableId, { status: destination.droppableId });
        } catch (err) {
            console.error("Failed to move task:", err);
        }
    };

    const handleAddCard = async (e, colId) => {
        e.preventDefault();
        if (!newCardTitle.trim()) return;

        try {
            await addTask({
                title: newCardTitle,
                status: colId,
                type: 'project',
                projectId: projectId,
                tags: ['Sprint']
            });
            setNewCardTitle('');
            setIsAddingCard(null);
        } catch (error) {
            console.error("Failed to add task:", error);
        }
    };

    if (loading) {
        return (
            <div className="h-full flex flex-col items-center justify-center py-20 text-slate-500 gap-3">
                <Loader2 className="animate-spin text-primary-500" size={32} />
                <p>Loading sprint board...</p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">Project Sprint Board</h2>
                <div className="text-xs text-slate-500 font-mono italic">Changes sync in real-time</div>
            </div>

            <DragDropContext onDragEnd={onDragEnd}>
                <div className="flex-1 flex gap-4 overflow-x-auto pb-4 custom-scrollbar min-h-0">
                    {columns.map(col => (
                        <div key={col.id} className="min-w-[300px] w-[300px] bg-dark-800/50 rounded-2xl border border-dark-800 flex flex-col max-h-full">
                            <div className="p-4 border-b border-dark-800 flex items-center justify-between">
                                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${col.id === 'done' ? 'bg-emerald-500' : col.id === 'todo' ? 'bg-slate-500' : 'bg-amber-500'}`} />
                                    {col.title} 
                                    <span className="text-slate-500 text-xs font-normal bg-dark-900 px-2 py-0.5 rounded-full ml-1">{col.cards.length}</span>
                                </h3>
                                <button className="text-slate-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-dark-700">
                                    <MoreVertical size={16} />
                                </button>
                            </div>

                            <Droppable droppableId={col.id}>
                                {(provided, snapshot) => (
                                    <div
                                        {...provided.droppableProps}
                                        ref={provided.innerRef}
                                        className={`p-3 flex-1 overflow-y-auto space-y-3 custom-scrollbar transition-colors ${snapshot.isDraggingOver ? 'bg-primary-500/5' : ''}`}
                                    >
                                        {col.cards.map((card, index) => (
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
                                                        <div className="flex justify-between items-start mb-2 gap-2">
                                                            <h4 className="text-sm font-semibold text-white leading-snug">{card.title}</h4>
                                                            <button 
                                                                onClick={() => deleteTask(card.id)}
                                                                className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 transition-all"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>

                                                        {card.tags?.length > 0 && (
                                                            <div className="flex flex-wrap gap-1.5 mt-3">
                                                                {card.tags.map(tag => (
                                                                    <span key={tag} className="text-[9px] px-2 py-0.5 bg-dark-800 text-slate-400 border border-dark-700 rounded-md font-bold uppercase tracking-widest">
                                                                        {tag}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                        
                                                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-dark-800">
                                                            <div className="flex -space-x-2">
                                                                <div className="w-6 h-6 rounded-full bg-primary-600/20 border border-dark-900 flex items-center justify-center text-[8px] text-primary-400 font-bold uppercase">
                                                                    {card.createdBy?.charAt(0) || '?'}
                                                                </div>
                                                            </div>
                                                            <span className="text-[10px] text-slate-600 font-mono">ID: {card.id.substring(0, 4)}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}

                                        {isAddingCard === col.id ? (
                                            <form onSubmit={(e) => handleAddCard(e, col.id)} className="mt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                                <div className="bg-dark-900 p-3 rounded-xl border border-primary-500/50 shadow-lg shadow-primary-500/5">
                                                    <textarea
                                                        autoFocus
                                                        value={newCardTitle}
                                                        onChange={(e) => setNewCardTitle(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                                e.preventDefault();
                                                                handleAddCard(e, col.id);
                                                            }
                                                            if (e.key === 'Escape') setIsAddingCard(null);
                                                        }}
                                                        className="w-full bg-transparent border-none p-0 text-sm text-white resize-none focus:ring-0 placeholder-slate-600"
                                                        placeholder="What needs to be done?"
                                                        rows={2}
                                                    />
                                                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-dark-800">
                                                        <button type="button" onClick={() => setIsAddingCard(null)} className="text-[11px] font-bold text-slate-500 hover:text-white uppercase tracking-wider">Cancel</button>
                                                        <button 
                                                            type="submit" 
                                                            className="px-3 py-1 bg-primary-600 text-white text-[11px] font-bold rounded-lg hover:bg-primary-500 transition-colors uppercase tracking-wider"
                                                        >
                                                            Create Task
                                                        </button>
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
