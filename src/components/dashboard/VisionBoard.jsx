import { useState } from 'react';
import { Plus, Trash2, Loader2, Target, Type } from 'lucide-react';
import { useVisionBoard } from '../../hooks/useVisionBoard';

export default function VisionBoard() {
    const { blocks, loading, updateBlocks } = useVisionBoard();

    const addBlock = (type) => {
        updateBlocks([...blocks, { id: Date.now().toString(), type, content: '' }]);
    };

    const updateBlock = (id, newContent) => {
        updateBlocks(blocks.map(b => b.id === id ? { ...b, content: newContent } : b));
    };

    const deleteBlock = (id) => {
        updateBlocks(blocks.filter(b => b.id !== id));
    };

    if (loading) return <div className="h-full border border-dark-700 rounded-xl bg-dark-800 flex items-center justify-center text-slate-500"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="bg-dark-800 rounded-xl border border-dark-700 p-4 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">Vision Board</h2>
                <div className="flex gap-2">
                    <button onClick={() => addBlock('text')} className="p-1.5 text-slate-400 hover:text-white hover:bg-dark-700 rounded-md transition-colors" title="Add Text">
                        <Type size={16} />
                    </button>
                    <button onClick={() => addBlock('goal')} className="p-1.5 text-slate-400 hover:text-white hover:bg-dark-700 rounded-md transition-colors flex items-center gap-1" title="Add Goal">
                        <Target size={16} />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                {blocks.map(block => (
                    <div key={block.id} className={`group relative bg-dark-900 border rounded-lg p-3 ${block.type === 'goal' ? 'border-primary-500/50 shadow-[0_0_15px_rgba(79,70,229,0.1)]' : 'border-dark-700'}`}>
                        {block.type === 'goal' && (
                            <div className="flex items-center gap-2 mb-2 text-primary-400 text-xs font-bold uppercase tracking-wider">
                                <Target size={12} /> Goal
                            </div>
                        )}
                        <textarea
                            className={`w-full bg-transparent text-sm resize-none focus:outline-none placeholder-slate-600 min-h-[60px] ${block.type === 'goal' ? 'text-primary-100 font-medium' : 'text-slate-300'}`}
                            placeholder={block.type === 'goal' ? 'Aim high...' : 'Jot down an idea...'}
                            value={block.content}
                            onChange={(e) => updateBlock(block.id, e.target.value)}
                        />
                        <button
                            onClick={() => deleteBlock(block.id)}
                            className="absolute top-2 right-2 p-1 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity rounded"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                ))}
                {blocks.length === 0 && (
                    <div className="text-center text-slate-500 text-sm py-12 flex flex-col items-center justify-center italic">
                        <Target className="mb-2 opacity-50" size={32} />
                        Your vision board is empty.<br />Add ideas, goals, and notes here.
                    </div>
                )}
            </div>
        </div>
    );
}
