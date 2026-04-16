import { useState, useEffect } from 'react';
import { Plus, MoreVertical } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import useStore from '../../store/useStore';

export default function ProjectInternalKanban({ projectId }) {
    const { globalTasks, updateTask } = useStore();
    const [columns, setColumns] = useState([]);
    const [isAddingCard, setIsAddingCard] = useState(null); // column id
    const [newCardTitle, setNewCardTitle] = useState('');

    useEffect(() => {
        // Aggregate tasks from globalTasks where project matches
        const myTasks = globalTasks.filter(t => t.type === 'project' && t.projectId === projectId);

        const newCols = [
            { id: 'todo', title: 'To Do', cards: myTasks.filter(t => t.status === 'todo') },
            { id: 'in-progress', title: 'In Progress', cards: myTasks.filter(t => t.status === 'in-progress') },
            { id: 'review', title: 'In Review', cards: myTasks.filter(t => t.status === 'review') },
            { id: 'done', title: 'Done', cards: myTasks.filter(t => t.status === 'done') }
        ];

        setColumns(newCols);
    }, [globalTasks, projectId]);

    const onDragEnd = (result) => {
        if (!result.destination) return;
        const { source, destination } = result;

        if (source.droppableId === destination.droppableId && source.index === destination.index) return;

        const newCols = [...columns];
        const sourceColIndex = newCols.findIndex(col => col.id === source.droppableId);
        const destColIndex = newCols.findIndex(col => col.id === destination.droppableId);

        const sourceCol = newCols[sourceColIndex];
        const destCol = newCols[destColIndex];

        const sourceCards = [...sourceCol.cards];
        const destCards = source.droppableId === destination.droppableId ? sourceCards : [...destCol.cards];

        const [removed] = sourceCards.splice(source.index, 1);
        destCards.splice(destination.index, 0, removed);

        newCols[sourceColIndex] = { ...sourceCol, cards: sourceCards };
        if (source.droppableId !== destination.droppableId) {
            newCols[destColIndex] = { ...destCol, cards: destCards };
        }

        setColumns(newCols);
        updateTask(result.draggableId, { status: destination.droppableId });
    };

    const handleAddCard = (e, colId) => {
        e.preventDefault();
        if (!newCardTitle.trim()) return;

        const newTaskId = `task-${Date.now()}`;
        
        const newTask = {
            id: newTaskId,
            title: newCardTitle,
            desc: '',
            status: colId,
            type: 'project',
            projectId: projectId,
            tags: ['Project']
        };

        useStore.getState().addTask(newTask);

        setNewCardTitle('');
        setIsAddingCard(null);
    };

    return (
        <div className="h-full flex flex-col p-4">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">Project Sprint Board</h2>
                <button className="flex items-center gap-2 px-3 py-1.5 bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium rounded-lg transition-colors">
                    <Plus size={16} /> Add Column
                </button>
            </div>

            <DragDropContext onDragEnd={onDragEnd}>
                <div className="flex-1 flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                    {columns.map(col => (
                        <div key={col.id} className="min-w-[280px] w-[280px] bg-dark-800 rounded-xl border border-dark-700 flex flex-col max-h-full">
                            <div className="p-3 border-b border-dark-700 flex items-center justify-between">
                                <h3 className="font-semibold text-white">{col.title} <span className="text-slate-500 text-xs ml-2 font-normal">{col.cards.length}</span></h3>
                                <button className="text-slate-500 hover:text-white transition-colors"><MoreVertical size={16} /></button>
                            </div>

                            <Droppable droppableId={col.id}>
                                {(provided, snapshot) => (
                                    <div
                                        {...provided.droppableProps}
                                        ref={provided.innerRef}
                                        className={`p-3 flex-1 overflow-y-auto space-y-3 custom-scrollbar ${snapshot.isDraggingOver ? 'bg-dark-700/50' : ''}`}
                                    >
                                        {col.cards.map((card, index) => (
                                            <Draggable key={card.id} draggableId={card.id} index={index}>
                                                {(provided, snapshot) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        {...provided.dragHandleProps}
                                                        style={{ ...provided.draggableProps.style }}
                                                        className={`bg-dark-700 p-3 rounded-lg border shadow-sm transition-colors ${snapshot.isDragging ? 'border-primary-500 opacity-80 rotate-2 scale-105' : 'border-dark-600 hover:border-slate-500'
                                                            }`}
                                                    >
                                                        <h4 className="text-sm font-medium text-white mb-1">{card.title}</h4>
                                                        {card.tags?.length > 0 && (
                                                            <div className="flex gap-1 mb-2">
                                                                {card.tags.map(tag => (
                                                                    <span key={tag} className={`text-[10px] px-2 py-0.5 border rounded-full font-bold uppercase tracking-wider ${tag === 'Company' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-primary-500/10 text-primary-400 border-primary-500/20'}`}>
                                                                        {tag}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                        {card.assignedTo && <p className="text-xs text-slate-400 mt-2">Owner: {card.assignedTo}</p>}
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}

                                        {isAddingCard === col.id ? (
                                            <form onSubmit={(e) => handleAddCard(e, col.id)} className="mt-2">
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
                                                    className="w-full bg-dark-900 border border-primary-500 rounded-lg p-2 text-sm text-white resize-none focus:outline-none"
                                                    placeholder="Enter a title..."
                                                    rows={2}
                                                />
                                                <div className="flex gap-2 mt-2">
                                                    <button type="submit" className="px-3 py-1 bg-primary-600 text-white text-xs rounded-md hover:bg-primary-500 font-medium">Add Task</button>
                                                    <button type="button" onClick={() => setIsAddingCard(null)} className="px-3 py-1 text-slate-400 text-xs hover:text-white">Cancel</button>
                                                </div>
                                            </form>
                                        ) : (
                                            <button
                                                onClick={() => setIsAddingCard(col.id)}
                                                className="w-full py-2 flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-white hover:bg-dark-700 rounded-lg transition-colors border border-dashed border-dark-600 mt-2"
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
