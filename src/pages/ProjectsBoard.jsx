import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjects } from '../hooks/useProjects';
import useStore from '../store/useStore';
import {
    AlertCircle, Clock, CheckCircle2, ChevronRight, Plus, Loader2,
    X, Briefcase, Tag, Calendar, User
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const STATUS_CONFIG = {
    ongoing:   { border: 'border-l-amber-500',   badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',   dot: 'bg-amber-500',   label: 'Ongoing'   },
    upcoming:  { border: 'border-l-indigo-400',  badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20', dot: 'bg-indigo-400',  label: 'Upcoming'  },
    completed: { border: 'border-l-emerald-500', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', dot: 'bg-emerald-500', label: 'Completed' },
    'on-hold': { border: 'border-l-rose-500',    badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20',    dot: 'bg-rose-500',    label: 'On Hold'   },
};

const LABEL_COLORS = {
    design:      { bg: 'bg-violet-500/15', text: 'text-violet-400', border: 'border-violet-500/20' },
    engineering: { bg: 'bg-blue-500/15',   text: 'text-blue-400',   border: 'border-blue-500/20'   },
    marketing:   { bg: 'bg-pink-500/15',   text: 'text-pink-400',   border: 'border-pink-500/20'   },
    research:    { bg: 'bg-amber-500/15',  text: 'text-amber-400',  border: 'border-amber-500/20'  },
    operations:  { bg: 'bg-teal-500/15',   text: 'text-teal-400',   border: 'border-teal-500/20'   },
    finance:     { bg: 'bg-emerald-500/15',text: 'text-emerald-400',border: 'border-emerald-500/20'},
};

const AVAILABLE_LABELS = Object.keys(LABEL_COLORS);

function LabelBadge({ label }) {
    const color = LABEL_COLORS[label] || { bg: 'bg-slate-500/15', text: 'text-slate-400', border: 'border-slate-500/20' };
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border uppercase tracking-wide ${color.bg} ${color.text} ${color.border}`}>
            <Tag size={8} />
            {label}
        </span>
    );
}

const PROJECT_COLORS = [
    { border: 'border-l-primary-500', title: 'group-hover:text-primary-400' },
    { border: 'border-l-violet-500',  title: 'group-hover:text-violet-400' },
    { border: 'border-l-cyan-500',    title: 'group-hover:text-cyan-400' },
    { border: 'border-l-amber-500',   title: 'group-hover:text-amber-400' },
    { border: 'border-l-rose-500',    title: 'group-hover:text-rose-400' },
    { border: 'border-l-emerald-500', title: 'group-hover:text-emerald-400' },
];

const getProjectColorConfig = (id) => {
    if (!id) return PROJECT_COLORS[0];
    const strId = String(id);
    let hash = 0;
    for (let i = 0; i < strId.length; i++) hash = strId.charCodeAt(i) + ((hash << 5) - hash);
    return PROJECT_COLORS[Math.abs(hash) % PROJECT_COLORS.length];
};

function ProjectCard({ project, onClick }) {
    const cfg = STATUS_CONFIG[project.status] || STATUS_CONFIG.ongoing;
    const colorCfg = getProjectColorConfig(project.id);
    
    return (
        <motion.div
            onClick={onClick}
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`group bg-dark-800/80 border border-dark-700/60 border-l-4 ${colorCfg.border} rounded-2xl p-4 cursor-pointer hover:-translate-y-0.5 hover:bg-dark-800 transition-all duration-200 flex flex-col gap-2.5`}
        >
            {/* Title row */}
            <div className="flex justify-between items-start gap-2">
                <h3 className={`font-bold text-white text-sm leading-snug ${colorCfg.title} transition-colors line-clamp-2 flex-1`}>
                    {project.title}
                </h3>
                <ChevronRight size={14} className="text-slate-600 group-hover:text-primary-400 opacity-0 group-hover:opacity-100 transition-all shrink-0 mt-0.5" />
            </div>

            {/* Labels */}
            {project.labels?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                    {project.labels.map(label => <LabelBadge key={label} label={label} />)}
                </div>
            )}

            {/* Description */}
            {project.desc && (
                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{project.desc}</p>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between pt-2.5 border-t border-dark-700/40 mt-auto">
                <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-primary-600/20 border border-primary-500/20 flex items-center justify-center text-[9px] text-primary-300 font-bold uppercase">
                        {project.createdByName?.charAt(0) || project.createdBy?.charAt(0) || '?'}
                    </div>
                    <span className="text-[10px] text-slate-500 truncate max-w-[90px]">
                        {project.createdByName || 'Member'}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {project.dueDate && (
                        <span className="text-[10px] text-slate-500 flex items-center gap-1">
                            <Calendar size={10} />
                            {new Date(project.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                    )}
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-bold uppercase ${cfg.badge}`}>
                        {cfg.label}
                    </span>
                </div>
            </div>
        </motion.div>
    );
}

const COLUMNS = [
    { id: 'ongoing',   title: 'In Progress', icon: <Clock className="text-amber-400"   size={16} />, emptyMsg: 'No active projects.', color: 'bg-amber-400' },
    { id: 'upcoming',  title: 'Upcoming',    icon: <AlertCircle className="text-indigo-400" size={16} />, emptyMsg: 'Nothing scheduled yet.', color: 'bg-indigo-400' },
    { id: 'completed', title: 'Completed',   icon: <CheckCircle2 className="text-emerald-400" size={16} />, emptyMsg: 'No completed projects yet.', color: 'bg-emerald-400' },
];

export default function ProjectsBoard() {
    const { projects, loading, createProject } = useProjects();
    const { activeCompany } = useStore();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [projectName, setProjectName] = useState('');
    const [projectDesc, setProjectDesc] = useState('');
    const [projectStatus, setProjectStatus] = useState('ongoing');
    const [selectedLabels, setSelectedLabels] = useState([]);
    const [dueDate, setDueDate] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const navigate = useNavigate();

    const toggleLabel = (label) => {
        setSelectedLabels(prev => prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]);
    };

    const handleCreateProject = async () => {
        if (!projectName.trim()) return;
        setIsCreating(true);
        try {
            const newProjectId = await createProject({
                title: projectName.trim(),
                desc: projectDesc.trim(),
                status: projectStatus,
                labels: selectedLabels,
                dueDate: dueDate || null,
            });
            setProjectName(''); setProjectDesc(''); setProjectStatus('ongoing');
            setSelectedLabels([]); setDueDate('');
            setIsModalOpen(false);
            if (newProjectId) navigate(`/dashboard/projects/${newProjectId}`);
        } catch (error) {
            console.error('Failed to create project:', error);
        } finally {
            setIsCreating(false);
        }
    };

    const resetModal = () => {
        setProjectName(''); setProjectDesc(''); setProjectStatus('ongoing');
        setSelectedLabels([]); setDueDate('');
        setIsModalOpen(false);
    };

    const stats = {
        ongoing: projects.filter(p => p.status === 'ongoing').length,
        upcoming: projects.filter(p => p.status === 'upcoming').length,
        completed: projects.filter(p => p.status === 'completed').length,
    };

    return (
        <div className="h-full flex flex-col bg-dark-900 w-full overflow-hidden">
            {/* Header */}
            <header className="px-6 py-5 border-b border-dark-700 flex items-center justify-between shrink-0 bg-dark-900/60 backdrop-blur-sm">
                <div>
                    <div className="flex items-center gap-2.5 mb-0.5">
                        <div className="w-8 h-8 bg-primary-600/20 rounded-xl flex items-center justify-center border border-primary-500/20">
                            <Briefcase className="text-primary-400" size={15} />
                        </div>
                        <h1 className="text-xl font-bold text-white tracking-tight">Projects</h1>
                    </div>
                    <p className="text-slate-500 text-xs pl-10">
                        <span className="text-slate-300 font-medium">{activeCompany?.name}</span>
                        {' · '}
                        <span className="text-amber-400 font-medium">{stats.ongoing} active</span>
                        {' · '}
                        <span className="text-indigo-400 font-medium">{stats.upcoming} upcoming</span>
                        {' · '}
                        <span className="text-emerald-400 font-medium">{stats.completed} done</span>
                    </p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-primary-600/20 active:scale-95"
                >
                    <Plus size={16} /> New Project
                </button>
            </header>

            {/* Board */}
            <div className="flex-1 overflow-hidden">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-3">
                        <Loader2 className="animate-spin text-primary-500" size={28} />
                        <p className="text-sm">Loading projects…</p>
                    </div>
                ) : (
                    <div className="h-full grid grid-cols-3 divide-x divide-dark-700/60">
                        {COLUMNS.map(col => {
                            const colProjects = projects.filter(p => p.status === col.id);
                            return (
                                <div key={col.id} className="flex flex-col min-h-0">
                                    {/* Column Header */}
                                    <div className="px-5 py-3.5 border-b border-dark-700/60 shrink-0 flex items-center gap-2.5 bg-dark-800/20">
                                        {col.icon}
                                        <h2 className="font-bold text-white text-xs uppercase tracking-widest">{col.title}</h2>
                                        <span className="ml-auto px-2 py-0.5 rounded-full bg-dark-700/60 text-slate-400 text-xs font-bold border border-dark-600/60">
                                            {colProjects.length}
                                        </span>
                                    </div>

                                    {/* Cards */}
                                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                        <AnimatePresence>
                                            {colProjects.length > 0 ? (
                                                colProjects.map(project => (
                                                    <ProjectCard
                                                        key={project.id}
                                                        project={project}
                                                        onClick={() => navigate(`/dashboard/projects/${project.id}`)}
                                                    />
                                                ))
                                            ) : (
                                                <motion.div
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    className="flex flex-col items-center justify-center py-14 text-slate-600 gap-3 border border-dashed border-dark-700 rounded-2xl mt-2"
                                                >
                                                    <div className={`w-2 h-2 rounded-full ${col.color} opacity-40`} />
                                                    <p className="text-xs font-medium text-center px-4">{col.emptyMsg}</p>
                                                    <button
                                                        onClick={() => { setProjectStatus(col.id); setIsModalOpen(true); }}
                                                        className="text-xs text-primary-500 hover:text-primary-400 font-bold flex items-center gap-1"
                                                    >
                                                        <Plus size={11} /> Add project
                                                    </button>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Create Project Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <motion.div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="bg-dark-800 border border-dark-700 rounded-3xl p-7 w-full max-w-lg shadow-2xl"
                            initial={{ scale: 0.95, opacity: 0, y: 16 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 16 }}
                            transition={{ duration: 0.2 }}
                        >
                            {/* Modal Header */}
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-lg font-bold text-white">New Project</h2>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Under <span className="text-slate-300 font-medium">{activeCompany?.name}</span>
                                    </p>
                                </div>
                                <button onClick={resetModal} className="p-2 text-slate-500 hover:text-white hover:bg-dark-700 rounded-xl transition-all">
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="space-y-5">
                                {/* Title */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Project Name *</label>
                                    <input
                                        type="text"
                                        value={projectName}
                                        onChange={e => setProjectName(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleCreateProject()}
                                        className="w-full bg-dark-900 border border-dark-600 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-primary-500 transition-all placeholder:text-slate-600"
                                        placeholder="e.g. Website Redesign"
                                        autoFocus disabled={isCreating}
                                    />
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Description</label>
                                    <textarea
                                        value={projectDesc}
                                        onChange={e => setProjectDesc(e.target.value)}
                                        className="w-full bg-dark-900 border border-dark-600 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-primary-500 transition-all placeholder:text-slate-600 resize-none"
                                        rows={2}
                                        placeholder="Brief description of the project scope…"
                                        disabled={isCreating}
                                    />
                                </div>

                                {/* Labels */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                                        Labels
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {AVAILABLE_LABELS.map(label => {
                                            const active = selectedLabels.includes(label);
                                            const color = LABEL_COLORS[label];
                                            return (
                                                <button
                                                    key={label}
                                                    type="button"
                                                    onClick={() => toggleLabel(label)}
                                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border uppercase tracking-wide transition-all ${
                                                        active
                                                            ? `${color.bg} ${color.text} ${color.border}`
                                                            : 'bg-dark-900 text-slate-500 border-dark-600 hover:border-slate-500'
                                                    }`}
                                                >
                                                    <Tag size={9} />
                                                    {label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Status + Due Date row */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Status</label>
                                        <div className="flex flex-col gap-1.5">
                                            {['ongoing', 'upcoming', 'completed'].map(s => {
                                                const cfg = STATUS_CONFIG[s];
                                                return (
                                                    <button
                                                        key={s}
                                                        type="button"
                                                        onClick={() => setProjectStatus(s)}
                                                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                                                            projectStatus === s
                                                                ? `${cfg.badge} border-current`
                                                                : 'bg-dark-900 text-slate-500 border-dark-700 hover:border-slate-500'
                                                        }`}
                                                    >
                                                        <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                                                        {cfg.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Due Date</label>
                                        <input
                                            type="date"
                                            value={dueDate}
                                            onChange={e => setDueDate(e.target.value)}
                                            className="w-full bg-dark-900 border border-dark-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500 transition-all"
                                            disabled={isCreating}
                                        />
                                        <p className="text-slate-600 text-[10px] mt-2">Optional deadline for this project</p>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-end gap-3 mt-7">
                                <button
                                    onClick={resetModal}
                                    className="px-5 py-2.5 text-slate-400 hover:text-white transition-colors text-sm font-medium rounded-xl hover:bg-dark-700"
                                    disabled={isCreating}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreateProject}
                                    disabled={!projectName.trim() || isCreating}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-all rounded-xl text-sm font-bold shadow-lg shadow-primary-600/20 active:scale-95"
                                >
                                    {isCreating ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                                    {isCreating ? 'Creating…' : 'Create Project'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
