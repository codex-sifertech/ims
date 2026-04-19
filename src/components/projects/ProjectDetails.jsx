import { useState, useEffect } from 'react';
import { Save, CheckCircle, Calendar, User, Tag, FileText, Clock } from 'lucide-react';
import { format } from 'date-fns';

const STATUS_OPTIONS = [
    { value: 'upcoming',  label: 'Upcoming',  color: 'text-indigo-400' },
    { value: 'ongoing',   label: 'Ongoing',   color: 'text-amber-400' },
    { value: 'completed', label: 'Completed', color: 'text-emerald-400' },
    { value: 'on-hold',   label: 'On Hold',   color: 'text-rose-400' },
];

const PRIORITY_OPTIONS = [
    { value: 'low',      label: 'Low',      color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
    { value: 'medium',   label: 'Medium',   color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    { value: 'high',     label: 'High',     color: 'bg-red-500/10 text-red-400 border-red-500/20' },
    { value: 'critical', label: 'Critical', color: 'bg-rose-600/10 text-rose-400 border-rose-600/20' },
];

export default function ProjectDetails({ project, onUpdate }) {
    const [title, setTitle]             = useState(project?.title || '');
    const [desc, setDesc]               = useState(project?.desc || project?.description || '');
    const [status, setStatus]           = useState(project?.status || 'ongoing');
    const [priority, setPriority]       = useState(project?.priority || 'medium');
    const [deadline, setDeadline]       = useState(project?.deadline || '');
    const [tags, setTags]               = useState((project?.tags || []).join(', '));
    const [isSaving, setIsSaving]       = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [isDirty, setIsDirty]         = useState(false);

    // Track changes
    useEffect(() => {
        const original = {
            title: project?.title || '',
            desc: project?.desc || project?.description || '',
            status: project?.status || 'ongoing',
            priority: project?.priority || 'medium',
            deadline: project?.deadline || '',
            tags: (project?.tags || []).join(', '),
        };
        const current = { title, desc, status, priority, deadline, tags };
        setIsDirty(JSON.stringify(original) !== JSON.stringify(current));
    }, [title, desc, status, priority, deadline, tags, project]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onUpdate({
                title: title.trim(),
                desc: desc.trim(),
                description: desc.trim(),
                status,
                priority,
                deadline,
                tags: tags.split(',').map(t => t.trim()).filter(Boolean),
            });
            setIsDirty(false);
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
        } catch (err) {
            console.error('Save failed:', err);
        } finally {
            setIsSaving(false);
        }
    };

    const createdAt = project?.createdAt?.toDate
        ? format(project.createdAt.toDate(), 'MMM d, yyyy')
        : project?.createdAt
        ? format(new Date(project.createdAt), 'MMM d, yyyy')
        : '—';

    return (
        <div className="p-6 max-w-3xl mx-auto space-y-6">
            {/* Save Bar */}
            <div className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                isDirty
                    ? 'bg-primary-600/10 border-primary-500/30'
                    : 'bg-dark-800/50 border-dark-700/50'
            }`}>
                <div className="flex items-center gap-3">
                    {showSuccess ? (
                        <span className="flex items-center gap-2 text-emerald-400 text-sm font-bold">
                            <CheckCircle size={16} /> Saved successfully!
                        </span>
                    ) : isDirty ? (
                        <span className="text-primary-400 text-sm font-medium">You have unsaved changes</span>
                    ) : (
                        <span className="text-slate-500 text-sm">All changes saved</span>
                    )}
                </div>
                <button
                    onClick={handleSave}
                    disabled={!isDirty || isSaving}
                    className="flex items-center gap-2 px-5 py-2 bg-primary-600 hover:bg-primary-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-all active:scale-95 shadow-lg shadow-primary-600/20"
                >
                    <Save size={14} />
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            {/* Core Info */}
            <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6 space-y-5">
                <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <FileText size={14} /> Project Information
                </h2>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Title *</label>
                    <input
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        className="w-full bg-dark-900 border border-dark-600 rounded-xl px-4 py-3 text-white text-lg font-bold focus:outline-none focus:border-primary-500 transition-all"
                        placeholder="Project name..."
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Description</label>
                    <textarea
                        value={desc}
                        onChange={e => setDesc(e.target.value)}
                        rows={5}
                        className="w-full bg-dark-900 border border-dark-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-500 transition-all resize-none text-sm leading-relaxed"
                        placeholder="Describe the project scope, goals, and objectives..."
                    />
                </div>
            </div>

            {/* Status & Priority */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6 space-y-4">
                    <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Status</h2>
                    <div className="grid grid-cols-2 gap-2">
                        {STATUS_OPTIONS.map(opt => (
                            <button
                                key={opt.value}
                                onClick={() => setStatus(opt.value)}
                                className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                                    status === opt.value
                                        ? `${opt.color} bg-current/10 border-current/30`
                                        : 'text-slate-500 bg-dark-900 border-dark-600 hover:border-slate-500'
                                }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6 space-y-4">
                    <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Priority</h2>
                    <div className="grid grid-cols-2 gap-2">
                        {PRIORITY_OPTIONS.map(opt => (
                            <button
                                key={opt.value}
                                onClick={() => setPriority(opt.value)}
                                className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                                    priority === opt.value
                                        ? opt.color
                                        : 'text-slate-500 bg-dark-900 border-dark-600 hover:border-slate-500'
                                }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Tags & Deadline */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6 space-y-3">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Tag size={12} /> Tags
                    </label>
                    <input
                        value={tags}
                        onChange={e => setTags(e.target.value)}
                        className="w-full bg-dark-900 border border-dark-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-500 transition-all text-sm"
                        placeholder="design, frontend, sprint-1"
                    />
                    <p className="text-[10px] text-slate-600">Comma-separated tags</p>
                </div>

                <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6 space-y-3">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Calendar size={12} /> Deadline
                    </label>
                    <input
                        type="date"
                        value={deadline}
                        onChange={e => setDeadline(e.target.value)}
                        className="w-full bg-dark-900 border border-dark-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-500 transition-all text-sm [color-scheme:dark]"
                    />
                </div>
            </div>

            {/* Metadata */}
            <div className="bg-dark-800/50 border border-dark-700/50 rounded-2xl p-5">
                <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Project Metadata</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                        <p className="text-slate-600 text-xs uppercase tracking-wider mb-1">Project ID</p>
                        <p className="text-slate-300 font-mono text-xs">{project.id?.substring(0, 12)}...</p>
                    </div>
                    <div>
                        <p className="text-slate-600 text-xs uppercase tracking-wider mb-1">Created By</p>
                        <p className="text-slate-300 text-xs">{project.createdByName || '—'}</p>
                    </div>
                    <div>
                        <p className="text-slate-600 text-xs uppercase tracking-wider mb-1">Created At</p>
                        <p className="text-slate-300 text-xs">{createdAt}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
