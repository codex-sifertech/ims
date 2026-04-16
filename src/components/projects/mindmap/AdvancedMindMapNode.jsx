import { useState, useCallback } from 'react';
import { Handle, Position } from '@xyflow/react';
import { 
  CheckSquare, 
  User, 
  AlertCircle, 
  Paperclip, 
  MoreHorizontal, 
  ChevronDown, 
  Plus,
  Trash2
} from 'lucide-react';

export default function AdvancedMindMapNode({ data, isConnectable }) {
  const [showDetails, setShowDetails] = useState(false);
  const [subtasks, setSubtasks] = useState(data.subtasks || []);
  const [newSubtask, setNewSubtask] = useState('');

  const addSubtask = () => {
    if (!newSubtask.trim()) return;
    const updated = [...subtasks, { id: Date.now(), text: newSubtask, completed: false }];
    setSubtasks(updated);
    setNewSubtask('');
    if (data.onChange) data.onChange({ ...data, subtasks: updated });
  };

  const toggleSubtask = (id) => {
    const updated = subtasks.map(s => s.id === id ? { ...s, completed: !s.completed } : s);
    setSubtasks(updated);
    if (data.onChange) data.onChange({ ...data, subtasks: updated });
  };

  const deleteSubtask = (id) => {
    const updated = subtasks.filter(s => s.id !== id);
    setSubtasks(updated);
    if (data.onChange) data.onChange({ ...data, subtasks: updated });
  };

  const priorityColors = {
    low: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    high: 'bg-red-500/20 text-red-500 border-red-500/30'
  };

  return (
    <div className="bg-dark-800 border border-dark-600 rounded-xl shadow-2xl w-[260px] overflow-hidden group transition-all hover:border-primary-500/50">
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-primary-500 border-dark-900" />
      
      {/* Node Header */}
      <div className="p-3 bg-dark-700/50 border-b border-dark-600 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${data.priority === 'high' ? 'bg-red-500 animate-pulse' : 'bg-primary-500'}`} />
          <input 
            className="bg-transparent text-sm font-bold text-white outline-none border-none p-0 w-[150px] placeholder-slate-500 focus:ring-0"
            value={data.label || ''}
            onChange={(e) => data.onChange && data.onChange({ ...data, label: e.target.value })}
            placeholder="Node Title..."
          />
        </div>
        <button onClick={() => setShowDetails(!showDetails)} className="text-slate-500 hover:text-white transition-colors">
          <ChevronDown size={14} className={`transition-transform duration-300 ${showDetails ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Basic Status Bar */}
      <div className="px-3 py-2 flex items-center gap-3">
        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
          <CheckSquare size={10} />
          {subtasks.filter(s => s.completed).length}/{subtasks.length}
        </div>
        {data.assignee && (
          <div className="flex items-center gap-1 text-[10px] text-primary-400 font-medium truncate max-w-[80px]">
            <User size={10} />
            {data.assignee}
          </div>
        )}
        {data.priority && (
          <div className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase border ${priorityColors[data.priority]}`}>
            {data.priority}
          </div>
        )}
      </div>

      {/* Expanded Details */}
      {showDetails && (
        <div className="px-3 pb-3 pt-1 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
          {/* Description */}
          <textarea 
            className="w-full bg-dark-900/50 border border-dark-700 rounded-lg p-2 text-xs text-slate-300 outline-none focus:border-primary-500/50 resize-none min-h-[60px]"
            placeholder="Add description..."
            value={data.desc || ''}
            onChange={(e) => data.onChange && data.onChange({ ...data, desc: e.target.value })}
          />

          {/* Subtasks List */}
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Subtasks</p>
            {subtasks.map(task => (
              <div key={task.id} className="flex items-center gap-2 group/task bg-dark-900/30 p-1.5 rounded-md border border-transparent hover:border-dark-600">
                <input 
                  type="checkbox" 
                  checked={task.completed} 
                  onChange={() => toggleSubtask(task.id)}
                  className="rounded border-dark-600 bg-dark-800 text-primary-600 focus:ring-primary-500/20"
                />
                <span className={`text-[11px] flex-1 ${task.completed ? 'text-slate-500 line-through' : 'text-slate-300'}`}>
                  {task.text}
                </span>
                <button onClick={() => deleteSubtask(task.id)} className="opacity-0 group-hover/task:opacity-100 text-slate-600 hover:text-red-400">
                  <Trash2 size={10} />
                </button>
              </div>
            ))}
            <div className="flex items-center gap-2 mt-2">
              <input 
                className="flex-1 bg-dark-900/50 border border-dark-700 rounded-md px-2 py-1 text-[11px] text-white outline-none focus:border-primary-500/50"
                placeholder="New subtask..."
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addSubtask(); }}
              />
              <button onClick={addSubtask} className="p-1 bg-primary-600 text-white rounded-md hover:bg-primary-500 transition-colors">
                <Plus size={12} />
              </button>
            </div>
          </div>

          {/* Meta Inputs */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Assignee</p>
              <input 
                className="w-full bg-dark-900/50 border border-dark-700 rounded-md px-2 py-1 text-[10px] text-white outline-none focus:border-primary-500/50"
                placeholder="Name"
                value={data.assignee || ''}
                onChange={(e) => data.onChange && data.onChange({ ...data, assignee: e.target.value })}
              />
            </div>
            <div>
              <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Priority</p>
              <select 
                className="w-full bg-dark-900/50 border border-dark-700 rounded-md px-1 py-1 text-[10px] text-white outline-none focus:border-primary-500/50"
                value={data.priority || 'medium'}
                onChange={(e) => data.onChange && data.onChange({ ...data, priority: e.target.value })}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <button className="w-full py-1.5 border border-dashed border-dark-600 rounded-lg text-slate-500 hover:text-white hover:border-slate-500 transition-all flex items-center justify-center gap-2 text-[10px]">
            <Paperclip size={10} /> Attach Files
          </button>
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-primary-500 border-dark-900" />
    </div>
  );
}
