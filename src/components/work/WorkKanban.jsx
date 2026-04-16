import { useState } from 'react';
import { Plus, MoreVertical, Loader2 } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useWorkKanban } from '../../hooks/useWorkKanban';

export default function WorkKanban() {
    const { columns, loading, updateColumns } = useWorkKanban();
    const [isAddingCard, setIsAddingCard] = useState(null); // column id
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
        destCards.splice(destination.index, 0, removed);

        newCols[sourceColIndex] = { ...sourceCol, cards: sourceCards };
        if (source.droppableId !== destination.droppableId) {
            newCols[destColIndex] = { ...destCol, cards: destCards };
        }

        updateColumns(newCols);
    };

    const handleAddCard = (e, colId) => {
        e.preventDefault();
        if (!newCardTitle.trim()) return;

        const newCols = columns.map(col => {
            if (col.id === colId) {
                return {
                    ...col,
                    cards: [...col.cards, { id: `wcard-${Date.now()}`, title: newCardTitle, desc: '', priority: 'Medium' }]
                };
            }
            return col;
        });

        updateColumns(newCols);
        setNewCardTitle('');
        setIsAddingCard(null);
    };

    if (loading) return <div className="h-full flex items-center justify-center text-slate-500"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="h-full flex flex-col pt-4">
            <DragDropContext onDragEnd={onDragEnd}>
                <div className="flex-1 flex gap-4 overflow-x-auto pb-4 custom-scrollbar px-2">
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
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${card.priority === 'High' ? 'bg-red-500/20 text-red-400' :
                                                                    card.priority === 'Low' ? 'bg-green-500/20 text-green-400' :
                                                                        'bg-blue-500/20 text-blue-400'
                                                                }`}>{card.priority}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}

                                        {isAddingCard === col.id ? (
                                            <form onSubmit={(e) => handleAddCard(e, col.id)} className="mt-2 text-left">
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
                                                    placeholder="Task title..."
                                                    rows={2}
                                                />
                                                <div className="flex gap-2 mt-2">
                                                    <button type="submit" className="px-3 py-1 bg-primary-600 text-white text-xs rounded-md hover:bg-primary-500 font-medium">Add Task</button>
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
