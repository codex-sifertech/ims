import { useState, useMemo, useEffect } from 'react';
import { Plus, Loader2, Trash2, FolderOpen, MoreVertical, Search, User, Calendar, Flag, X, Check, Paperclip, ListTodo, PaperclipIcon } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useGlobalTasks } from '../../hooks/useGlobalTasks';
import useStore from '../../store/useStore';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { format, addDays, isSameDay } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import TaskDetailPanel from '../shared/TaskDetailPanel';

const COLUMNS = [
    { id: 'todo',        title: 'To Do',       dot: 'bg-slate-500' },
    { id: 'in-progress', title: 'In Progress',  dot: 'bg-amber-500' },
    { id: 'review',      title: 'In Review',    dot: 'bg-indigo-400' },
    { id: 'done',        title: 'Done',         dot: 'bg-emerald-500' },
];

const PRIORITIES = ['Low', 'Medium', 'High'];

function NewTaskModal({ isOpen, onClose, onAdd, colId, members }) {
    const [title, setTitle] = useState('');
    const [priority, setPriority] = useState('Medium');
    const [selectedMembers, setSelectedMembers] = useState([]);
    const [searchMember, setSearchMember] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [loading, setLoading] = useState(false);
    const [subTasks, setSubTasks] = useState([]);
    const [currentSubTask, setCurrentSubTask] = useState('');
    const [attachments, setAttachments] = useState([]);
    const [uploadProgress, setUploadProgress] = useState(null);
    const { uploadTaskAttachment } = useGlobalTasks();

    const addSubTask = () => {
        if (!currentSubTask.trim()) return;
        setSubTasks([...subTasks, { id: Date.now().toString(), text: currentSubTask.trim(), completed: false }]);
        setCurrentSubTask('');
    };

    const removeSubTask = (id) => setSubTasks(subTasks.filter(st => st.id !== id));

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            setUploadProgress(0);
            const metadata = await uploadTaskAttachment(file, (p) => setUploadProgress(p));
            setAttachments([...attachments, metadata]);
        } catch (err) {
            alert('File upload failed: ' + (err.message || err));
        } finally {
            setUploadProgress(null);
        }
    };

    const toggleMember = (member) => {
        setSelectedMembers(prev => 
            prev.find(m => m.id === member.id)
                ? prev.filter(m => m.id !== member.id)
                : [...prev, { id: member.id, name: member.name, photoURL: member.photoURL }]
        );
    };

    const filteredMembers = members.filter(m => 
        m.name?.toLowerCase().includes(searchMember.toLowerCase()) ||
        m.email?.toLowerCase().includes(searchMember.toLowerCase())
    );

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim() || loading) return;
        
        setLoading(true);
        try {
            await onAdd({
                title: title.trim(),
                status: colId,
                priority,
                assignedTo: selectedMembers,
                dueDate: dueDate || null,
                subTasks,
                attachments
            });
            setTitle('');
            setSelectedMembers([]);
            setSubTasks([]);
            setAttachments([]);
            onClose();
        } catch (err) {
            console.error("Task submission error:", err);
            alert("FAILURE: Could not log task to ledger.\nREASON: " + (err.message || "Unknown error (likely permissions)."));
        } finally {
            setLoading(false);
        }
    };

    const quickDates = [
        { label: 'Today', value: new Date().toISOString().split('T')[0] },
        { label: 'Tomorrow', value: addDays(new Date(), 1).toISOString().split('T')[0] },
        { label: 'Next Week', value: addDays(new Date(), 7).toISOString().split('T')[0] },
    ];

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-dark-950/80 backdrop-blur-xl"
                />
                
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="relative w-full max-w-xl bg-dark-900 border border-white/5 rounded-[3rem] shadow-2xl overflow-hidden shadow-black/50"
                >
                    <div className="p-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-xl font-black text-white uppercase tracking-tighter">Provision Task Log</h3>
                            <button onClick={onClose} className="p-2 border border-white/5 rounded-2xl text-slate-500 hover:text-white hover:bg-dark-800 transition-all">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Task Description</label>
                                <textarea
                                    autoFocus
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    className="w-full bg-dark-800 border border-white/5 rounded-2xl p-4 text-base text-white font-black placeholder:text-slate-700 focus:border-primary-500/50 outline-none transition-all resize-none"
                                    placeholder="What needs to be logged?"
                                    rows={2}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Priority Matrix</label>
                                    <div className="flex bg-dark-800 p-1.5 rounded-2xl border border-white/5 gap-1">
                                        {PRIORITIES.map(p => (
                                            <button
                                                key={p}
                                                type="button"
                                                onClick={() => setPriority(p)}
                                                className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                                    priority === p 
                                                        ? 'bg-primary-600 text-white shadow-lg' 
                                                        : 'text-slate-500 hover:text-slate-300'
                                                }`}
                                            >
                                                {p}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-2.5">
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Assigned Entities ({selectedMembers.length})</label>
                                    
                                    <div className="bg-dark-800 rounded-2xl border border-white/5 overflow-hidden">
                                        <div className="p-2.5 border-b border-white/5 flex items-center gap-2">
                                            <Search size={12} className="text-slate-500" />
                                            <input 
                                                type="text"
                                                placeholder="Search team members..."
                                                value={searchMember}
                                                onChange={e => setSearchMember(e.target.value)}
                                                className="bg-transparent border-none text-[11px] text-white font-bold outline-none placeholder:text-slate-700 w-full"
                                            />
                                        </div>
                                        
                                        <div className="max-h-32 overflow-y-auto p-1.5 space-y-1 custom-scrollbar">
                                            {filteredMembers.map(member => {
                                                const isSelected = selectedMembers.find(m => m.id === member.id);
                                                return (
                                                    <button
                                                        key={member.id}
                                                        type="button"
                                                        onClick={() => toggleMember(member)}
                                                        className={`w-full flex items-center justify-between p-2 rounded-xl transition-all ${
                                                            isSelected ? 'bg-primary-500/10 border border-primary-500/20' : 'hover:bg-dark-700 border border-transparent'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-7 h-7 rounded-lg bg-dark-900 border border-white/5 flex items-center justify-center text-slate-500 overflow-hidden text-[10px] font-black font-bold uppercase">
                                                                {member.photoURL ? <img src={member.photoURL} className="w-full h-full object-cover" /> : member.name?.charAt(0)}
                                                            </div>
                                                            <div className="text-left">
                                                                <p className="text-[11px] font-black text-white">{member.name}</p>
                                                                <p className="text-[9px] font-bold text-slate-500 lowercase">{member.role || 'Member'}</p>
                                                            </div>
                                                        </div>
                                                        {isSelected && <Check size={14} className="text-primary-500" />}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    
                                    {selectedMembers.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 pt-1.5">
                                            {selectedMembers.map(m => (
                                                <span key={m.id} className="text-[8px] px-2 py-0.5 bg-dark-700 text-slate-400 rounded-lg border border-white/5 font-black uppercase tracking-widest flex items-center gap-1.5">
                                                    {m.name}
                                                    <button type="button" onClick={() => toggleMember(m)} className="hover:text-red-400"><X size={8} /></button>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Sub-tasks & Attachments - Grid row */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                                        <ListTodo size={10} /> Operation Steps ({subTasks.length})
                                    </label>
                                    <div className="flex gap-1.5 focus-within:ring-1 focus-within:ring-primary-500 rounded-xl transition-all">
                                        <input 
                                            type="text"
                                            value={currentSubTask}
                                            onChange={e => setCurrentSubTask(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSubTask())}
                                            className="flex-1 bg-dark-800 border border-white/5 rounded-xl px-3 py-1.5 text-[10px] text-white font-bold outline-none placeholder:text-slate-700"
                                            placeholder="Add step..."
                                        />
                                        <button type="button" onClick={addSubTask} className="w-8 h-8 bg-dark-800 border border-white/5 rounded-xl flex items-center justify-center text-slate-500 hover:text-primary-500 transition-all opacity-50 hover:opacity-100">
                                            <Plus size={14} />
                                        </button>
                                    </div>
                                    <div className="max-h-20 overflow-y-auto space-y-1 custom-scrollbar">
                                        {subTasks.map(st => (
                                            <div key={st.id} className="flex items-center justify-between p-1.5 bg-dark-800 rounded-lg border border-white/5 group">
                                                <span className="text-[9px] text-slate-400 font-bold truncate pr-2">{st.text}</span>
                                                <button type="button" onClick={() => removeSubTask(st.id)} className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100"><X size={10} /></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                                        <Paperclip size={10} /> Data Assets ({attachments.length})
                                    </label>
                                    <div className="relative">
                                        <input 
                                            type="file" 
                                            onChange={handleFileUpload}
                                            className="hidden" 
                                            id="task-file-upload" 
                                        />
                                        <label 
                                            htmlFor="task-file-upload"
                                            className="flex items-center justify-center gap-2 w-full py-1.5 bg-dark-800 border border-dashed border-white/10 rounded-xl text-[9px] font-black text-slate-500 hover:text-primary-400 hover:border-primary-500/30 cursor-pointer transition-all"
                                        >
                                            {uploadProgress !== null ? (
                                                <div className="w-full px-2 flex items-center gap-2">
                                                    <div className="h-1 bg-dark-700 rounded-full flex-1 overflow-hidden">
                                                        <div className="h-full bg-primary-500 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                                                    </div>
                                                    <span className="text-[8px] text-primary-500">{Math.round(uploadProgress)}%</span>
                                                </div>
                                            ) : (
                                                <><Plus size={12} /> Attach Document</>
                                            )}
                                        </label>
                                    </div>
                                    <div className="max-h-20 overflow-y-auto space-y-1 custom-scrollbar">
                                        {attachments.map((file, i) => (
                                            <div key={i} className="flex items-center gap-2 p-1.5 bg-dark-800/50 rounded-lg border border-white/5">
                                                <PaperclipIcon size={10} className="text-primary-500 shrink-0" />
                                                <span className="text-[9px] text-slate-400 font-bold truncate flex-1">{file.name}</span>
                                                <button type="button" onClick={() => setAttachments(attachments.filter((_, idx) => idx !== i))} className="text-slate-600 hover:text-red-400"><X size={10} /></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2.5">
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 flex justify-between items-center">
                                    Deadline Selection 
                                    <span className="text-[8px] text-primary-500 lowercase font-bold">{dueDate || 'No deadline set'}</span>
                                </label>
                                
                                <div className="grid grid-cols-3 gap-2.5">
                                    {quickDates.map(qd => (
                                        <button
                                            key={qd.label}
                                            type="button"
                                            onClick={() => setDueDate(qd.value)}
                                            className={`py-2 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all ${
                                                dueDate === qd.value 
                                                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-emerald-500/10 shadow-lg' 
                                                    : 'bg-dark-800 text-slate-500 border-white/5 hover:border-white/10'
                                            }`}
                                        >
                                            {qd.label}
                                        </button>
                                    ))}
                                </div>

                                <div className="relative">
                                    <input 
                                        type="date"
                                        value={dueDate}
                                        onChange={e => setDueDate(e.target.value)}
                                        className="w-full bg-dark-800 border border-white/5 rounded-xl p-3 text-[9px] text-white font-black uppercase tracking-[0.2em] outline-none focus:border-primary-500/50 appearance-none"
                                    />
                                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={12} />
                                </div>
                            </div>

                            <div className="pt-4 flex gap-4">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 py-3 bg-dark-800 hover:bg-dark-700 text-slate-400 text-[9px] font-black uppercase tracking-[0.3em] rounded-2xl transition-all"
                                >
                                    Abort Process
                                </button>
                                <button
                                    type="submit"
                                    disabled={!title.trim() || loading}
                                    className="flex-[2] py-3 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white text-[9px] font-black uppercase tracking-[0.3em] rounded-2xl transition-all shadow-2xl shadow-primary-600/30 flex items-center justify-center gap-3"
                                >
                                    {loading ? <Loader2 className="animate-spin" size={14} /> : <>Commit to Ledger <Check size={14} /></>}
                                </button>
                            </div>
                        </form>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}

export default function CompanyKanban() {
    const { globalTasks, tasksLoading, activeCompany } = useStore();
    const { addTaskToCompany, deleteTask } = useGlobalTasks();
    const [isAddingCard, setIsAddingCard] = useState(null);
    const [members, setMembers] = useState([]);
    const [selectedTask, setSelectedTask] = useState(null);

    useEffect(() => {
        if (!activeCompany?.id) return;
        const membersRef = collection(db, 'companies', activeCompany.id, 'members');
        const unsub = onSnapshot(membersRef, (snap) => {
            setMembers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return unsub;
    }, [activeCompany?.id]);

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

    const handleAddCard = async (taskData) => {
        if (!activeCompany?.id) return;
        await addTaskToCompany({ 
            ...taskData,
            companyId: activeCompany.id
        });
    };

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
        <>
            <div className="bg-dark-800/40 border border-dark-700/50 rounded-[2.5rem] p-8 backdrop-blur-md flex flex-col min-h-[600px]">
                <div className="flex items-center justify-between mb-8 shrink-0">
                    <div>
                        <h2 className="text-2xl font-black text-white tracking-tighter uppercase flex items-center gap-4">
                            <div className="p-2 bg-primary-500/10 rounded-xl border border-primary-500/20">
                                <FolderOpen className="text-primary-500" size={24} />
                            </div>
                            Company Logistics
                        </h2>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-2 ml-1">Cross-departmental task management matrix</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-4 py-2 rounded-2xl border border-emerald-500/20 uppercase tracking-widest flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            {companyTasks.length} ACTIVE LOGS
                        </span>
                    </div>
                </div>

                <DragDropContext onDragEnd={onDragEnd}>
                    <div className="flex-1 flex gap-6 overflow-x-auto pb-4 custom-scrollbar">
                        {columns.map(col => (
                            <div key={col.id} className="min-w-[320px] w-[320px] bg-dark-900/30 rounded-[2rem] border border-white/5 flex flex-col max-h-full">
                                <div className="p-6 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2.5 h-2.5 rounded-full ${col.dot} shadow-[0_0_15px_rgba(0,0,0,0.5)]`} />
                                        <h3 className="font-black text-white text-[10px] uppercase tracking-[0.2em] opacity-60">{col.title}</h3>
                                    </div>
                                    <span className="text-[10px] font-black text-slate-500 bg-dark-800 px-3 py-1 rounded-xl border border-white/5">{col.cards.length}</span>
                                </div>

                                <Droppable droppableId={col.id}>
                                    {(provided, snapshot) => (
                                        <div
                                            {...provided.droppableProps}
                                            ref={provided.innerRef}
                                            className={`p-4 flex-1 overflow-y-auto space-y-4 custom-scrollbar transition-all duration-300 ${snapshot.isDraggingOver ? 'bg-primary-500/5' : ''}`}
                                        >
                                            {col.cards.map((card, index) => (
                                                <Draggable key={card.id} draggableId={card.id} index={index}>
                                                    {(provided, snapshot) => (
                                                        <div
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            {...provided.dragHandleProps}
                                                            onClick={() => setSelectedTask(card)}
                                                            className={`bg-dark-800/80 backdrop-blur-sm p-6 rounded-3xl border transition-all duration-300 group cursor-pointer ${
                                                                snapshot.isDragging
                                                                    ? 'border-primary-500 shadow-[0_40px_80px_rgba(0,0,0,0.5)] rotate-2 scale-[1.05] z-50'
                                                                    : 'border-white/5 hover:border-primary-500/30 hover:bg-dark-800 shadow-xl shadow-transparent hover:shadow-black/20'
                                                            }`}
                                                        >
                                                            <div className="flex justify-between items-start gap-4 mb-5">
                                                                <h4 className="text-sm font-black text-white leading-tight uppercase tracking-tight">{card.title}</h4>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); deleteTask(card.id); }}
                                                                    className="opacity-0 group-hover:opacity-100 p-2 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all shrink-0"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>

                                                            <div className="flex flex-wrap gap-2 mb-6">
                                                                {card.priority && (
                                                                    <span className={`text-[9px] px-3 py-1.5 rounded-xl border font-black uppercase tracking-widest flex items-center gap-2 ${
                                                                        card.priority === 'High' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 
                                                                        card.priority === 'Low' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                                                        'bg-primary-500/10 text-primary-500 border-primary-500/20'
                                                                    }`}>
                                                                        <Flag size={10} fill="currentColor" />
                                                                        {card.priority}
                                                                    </span>
                                                                )}
                                                                {card.dueDate && (
                                                                    <span className="text-[9px] px-3 py-1.5 bg-dark-700/50 text-slate-400 border border-white/5 rounded-xl font-black uppercase tracking-widest flex items-center gap-2">
                                                                        <Calendar size={10} />
                                                                        {format(new Date(card.dueDate), 'MMM dd')}
                                                                    </span>
                                                                )}
                                                            </div>

                                                            <div className="flex items-center justify-between pt-5 border-t border-white/5">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="flex -space-x-2 overflow-hidden">
                                                                        {Array.isArray(card.assignedTo) && card.assignedTo.length > 0 ? (
                                                                            card.assignedTo.slice(0, 3).map((m, i) => (
                                                                                <div key={m.id || i} className="w-8 h-8 rounded-xl bg-dark-900 border-2 border-dark-800 flex items-center justify-center text-slate-400 overflow-hidden text-[9px] font-black uppercase shadow-lg ring-1 ring-white/5">
                                                                                    {m.photoURL ? <img src={m.photoURL} className="w-full h-full object-cover" /> : m.name?.charAt(0) || <User size={12} />}
                                                                                </div>
                                                                            ))
                                                                        ) : (
                                                                            <div className="w-8 h-8 rounded-xl bg-dark-900 border border-white/5 flex items-center justify-center text-slate-400 text-[10px] font-black uppercase">
                                                                                <User size={14} />
                                                                            </div>
                                                                        )}
                                                                        {Array.isArray(card.assignedTo) && card.assignedTo.length > 3 && (
                                                                            <div className="w-8 h-8 rounded-xl bg-dark-900 border-2 border-dark-800 flex items-center justify-center text-slate-500 text-[9px] font-black uppercase shadow-lg ring-1 ring-white/5">
                                                                                +{card.assignedTo.length - 3}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <span className="text-[10px] text-slate-500 font-black tracking-widest uppercase group-hover:text-slate-300 transition-colors truncate max-w-[120px]">
                                                                        {Array.isArray(card.assignedTo) 
                                                                            ? (card.assignedTo.length > 0 ? card.assignedTo.map(m => m.name).join(', ') : 'Unassigned')
                                                                            : (card.assignedTo || 'Unassigned')}
                                                                    </span>
                                                                </div>

                                                                <div className="flex items-center gap-4">
                                                                    {card.subTasks?.length > 0 && (
                                                                        <div className="flex items-center gap-1 text-slate-500">
                                                                            <ListTodo size={12} />
                                                                            <span className="text-[10px] font-black">{card.subTasks.filter(st => st.completed).length}/{card.subTasks.length}</span>
                                                                        </div>
                                                                    )}
                                                                    {card.attachments?.length > 0 && (
                                                                        <div className="flex items-center gap-1 text-slate-500">
                                                                            <Paperclip size={12} />
                                                                            <span className="text-[10px] font-black">{card.attachments.length}</span>
                                                                        </div>
                                                                    )}
                                                                    <MoreVertical size={14} className="text-slate-600" />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </Draggable>
                                            ))}
                                            {provided.placeholder}

                                            <button
                                                onClick={() => setSelectedTask({ title: '', status: col.id, priority: 'Medium', tags: [] })}
                                                className="w-full py-5 flex items-center justify-center gap-3 text-[10px] font-black text-slate-500 hover:text-primary-400 hover:bg-primary-500/5 hover:border-primary-500/30 rounded-3xl transition-all border border-dashed border-white/10 mt-4 uppercase tracking-[0.2em] group"
                                            >
                                                <Plus size={18} className="group-hover:rotate-90 transition-transform" /> 
                                                Provision Task Log
                                            </button>
                                        </div>
                                    )}
                                </Droppable>
                            </div>
                        ))}
                    </div>
                </DragDropContext>
            </div>

            

            {selectedTask && (
                <TaskDetailPanel
                    task={selectedTask}
                    members={members}
                    onClose={() => setSelectedTask(null)}
                    onUpdate={(updates) => setSelectedTask(t => ({ ...t, ...updates }))}
                    onCreate={async (taskData) => {
                        await handleAddCard(taskData);
                        setSelectedTask(null);
                    }}
                />
            )}
        </>
    );
}
