import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, MoreVertical, Loader2, Clock, MessageSquare, Paperclip } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useSharedProjects } from '../../hooks/useSharedProjects';
import useStore from '../../store/useStore';

export default function SharedKanban() {
    const { columns, loading, updateColumns } = useSharedProjects();
    const { user } = useStore();
    const navigate = useNavigate();
    const [isAddingCard, setIsAddingCard] = useState(null);
    const [newCardTitle, setNewCardTitle] = useState('');

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

        // Auto-update status based on column
        removed.status = destCol.title;

        destCards.splice(destination.index, 0, removed);

        newCols[sourceColIndex] = { ...sourceCol, cards: sourceCards };
        if (source.droppableId !== destination.droppableId) {
            newCols[destColIndex] = { ...destCol, cards: destCards };
        }

        updateColumns(newCols);
    };

    const handleAddCard = (e, col) => {
        e.preventDefault();
        if (!newCardTitle.trim()) return;

        const newProject = {
            id: `proj-${Date.now()}`,
            title: newCardTitle,
            desc: 'New project description...',
            status: col.title,
            createdBy: user?.name || user?.email,
            createdAt: new Date().toISOString(),
            timeLogged: 0,
            commentsCount: 0,
            filesCount: 0,
        };

        const newCols = columns.map(c => {
            if (c.id === col.id) {
                return { ...c, cards: [...c.cards, newProject] };
            }
            return c;
        });

        updateColumns(newCols);
        setNewCardTitle('');
        setIsAddingCard(null);
    };

    if (loading) return <div className="h-full flex items-center justify-center text-slate-500"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="h-full flex flex-col">
            <DragDropContext onDragEnd={onDragEnd}>
                <div className="flex-1 flex gap-6 overflow-x-auto pb-4 custom-scrollbar">
                    {columns.map(col => (
                        <div key={col.id} className="min-w-[320px] w-[320px] bg-dark-800 rounded-xl border border-dark-700 flex flex-col max-h-full">
                            <div className="p-4 border-b border-dark-700 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-semibold text-white tracking-wide">{col.title}</h3>
                                    <span className="bg-dark-700 text-slate-400 px-2 py-0.5 rounded-full text-xs font-medium">{col.cards.length}</span>
                                </div>
                                <button className="text-slate-500 hover:text-white transition-colors"><MoreVertical size={16} /></button>
                            </div>

                            <Droppable droppableId={col.id}>
                                {(provided, snapshot) => (
                                    <div
                                        {...provided.droppableProps}
                                        ref={provided.innerRef}
                                        className={`p-3 flex-1 overflow-y-auto space-y-4 custom-scrollbar ${snapshot.isDraggingOver ? 'bg-dark-700/30' : ''}`}
                                    >
                                        {col.cards.map((card, index) => (
                                            <Draggable key={card.id} draggableId={card.id} index={index}>
                                                {(provided, snapshot) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        {...provided.dragHandleProps}
                                                        style={{ ...provided.draggableProps.style }}
                                                        onClick={() => navigate(`/dashboard/projects/${card.id}`)}
                                                        className={`bg-dark-900 p-4 rounded-xl border shadow-lg cursor-pointer transition-all ${snapshot.isDragging ? 'border-primary-500 opacity-90 scale-[1.02] shadow-primary-500/20' : 'border-dark-600 hover:border-primary-500'
                                                            }`}
                                                    >
                                                        <div className="flex justify-between items-start mb-2">
                                                            <h4 className="text-sm font-bold text-white leading-tight">{card.title}</h4>
                                                        </div>
                                                        <p className="text-xs text-slate-400 line-clamp-2 mb-4">{card.desc}</p>

                                                        <div className="flex justify-between items-center text-slate-500 text-xs">
                                                            <div className="flex items-center gap-3">
                                                                <span className="flex items-center gap-1" title="Time Logged"><Clock size={12} /> {Math.floor(card.timeLogged / 60)}h</span>
                                                                <span className="flex items-center gap-1"><MessageSquare size={12} /> {card.commentsCount}</span>
                                                                <span className="flex items-center gap-1"><Paperclip size={12} /> {card.filesCount}</span>
                                                            </div>
                                                            <div className="w-6 h-6 rounded-full bg-primary-600/20 text-primary-400 flex items-center justify-center font-bold text-[10px]" title={`Created by: ${card.createdBy}`}>
                                                                {card.createdBy?.charAt(0)?.toUpperCase() || '?'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}

                                        {isAddingCard === col.id ? (
                                            <form onSubmit={(e) => handleAddCard(e, col)} className="mt-2 text-left">
                                                <input
                                                    autoFocus
                                                    value={newCardTitle}
                                                    onChange={(e) => setNewCardTitle(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Escape') setIsAddingCard(null);
                                                    }}
                                                    className="w-full bg-dark-900 border border-primary-500 rounded-lg p-3 text-sm text-white focus:outline-none shadow-lg"
                                                    placeholder="Project Name..."
                                                />
                                                <div className="flex gap-2 mt-2">
                                                    <button type="submit" className="px-3 py-1.5 bg-primary-600 text-white text-xs rounded-md hover:bg-primary-500 font-medium w-full">Create Project</button>
                                                </div>
                                            </form>
                                        ) : (
                                            <button
                                                onClick={() => setIsAddingCard(col.id)}
                                                className="w-full py-3 flex items-center justify-center gap-2 text-sm text-slate-400 hover:text-white hover:bg-dark-700 rounded-xl transition-colors mt-2"
                                            >
                                                <Plus size={16} /> New Project
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
