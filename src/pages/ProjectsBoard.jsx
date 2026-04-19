import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjects } from '../hooks/useProjects';
import useStore from '../store/useStore';
import {
    AlertCircle, Clock, CheckCircle2, ChevronRight, Plus, Loader2,
    X, Briefcase, Zap, Calendar, User, Hash
} from 'lucide-react';

const STATUS_COLORS = {
    ongoing: 'border-l-amber-500 hover:border-amber-500/50',
    upcoming: 'border-l-indigo-500 hover:border-indigo-500/50',
    completed: 'border-l-emerald-500 hover:border-emerald-500/50',
    'on-hold': 'border-l-rose-500 hover:border-rose-500/50',
};

const STATUS_BADGE = {
    ongoing:   'bg-amber-500/10 text-amber-400 border-amber-500/20',
    upcoming:  'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    'on-hold': 'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

function ProjectCard({ project, onClick }) {
    const colorClass = STATUS_COLORS[project.status] || 'border-l-slate-500';
    return (
        <div
            onClick={onClick}
            className={`group bg-dark-800/80 border border-dark-700 border-l-4 ${colorClass} rounded-2xl p-5 cursor-pointer hover:-translate-y-0.5 transition-all duration-200 flex flex-col gap-3 backdrop-blur-sm hover:bg-dark-800`}
        >
            <div className="flex justify-between items-start gap-2">
                <h3 className="font-bold text-white text-base leading-tight group-hover:text-primary-400 transition-colors line-clamp-2">
                    {project.title}
                </h3>
                <ChevronRight size={16} className="text-slate-600 group-hover:text-primary-400 opacity-0 group-hover:opacity-100 transition-all shrink-0 mt-0.5" />
            </div>

            {project.desc && (
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{project.desc}</p>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-dark-700/50 mt-auto">
                <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-primary-600/20 border border-primary-500/20 flex items-center justify-center text-[9px] text-primary-400 font-bold uppercase">
                        {project.createdByName?.charAt(0) || project.createdBy?.charAt(0) || '?'}
                    </div>
                    <span className="text-[10px] text-slate-500 truncate max-w-[80px]">
                        {project.createdByName || 'Member'}
                    </span>
                </div>
                <span className="text-[9px] text-slate-600 font-mono">#{project.id.substring(0, 6)}</span>
            </div>
        </div>
    );
}

export default function ProjectsBoard() {
    const { projects, loading, createProject } = useProjects();
    const { activeCompany } = useStore();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [projectName, setProjectName] = useState('');
    const [projectDesc, setProjectDesc] = useState('');
    const [projectStatus, setProjectStatus] = useState('ongoing');
    const [isCreating, setIsCreating] = useState(false);
    const navigate = useNavigate();

    const handleCreateProject = async () => {
        if (!projectName.trim()) return;
        setIsCreating(true);
        try {
            const newProjectId = await createProject({
                title: projectName.trim(),
                desc: projectDesc.trim(),
                status: projectStatus,
            });
            setProjectName('');
            setProjectDesc('');
            setProjectStatus('ongoing');
            setIsModalOpen(false);
            if (newProjectId) navigate(`/dashboard/projects/${newProjectId}`);
        } catch (error) {
            console.error('Failed to create project:', error);
        } finally {
            setIsCreating(false);
        }
    };

    const columns = [
        {
            id: 'ongoing',
            title: 'Ongoing',
            icon: <Clock className="text-amber-500" size={18} />,
            dot: 'bg-amber-500',
            emptyMsg: 'No active projects right now.',
        },
        {
            id: 'upcoming',
            title: 'Upcoming',
            icon: <AlertCircle className="text-indigo-400" size={18} />,
            dot: 'bg-indigo-400',
            emptyMsg: 'Nothing scheduled yet.',
        },
        {
            id: 'completed',
            title: 'Completed',
            icon: <CheckCircle2 className="text-emerald-500" size={18} />,
            dot: 'bg-emerald-500',
            emptyMsg: 'No completed projects yet.',
        },
    ];

    return (
        <div className="h-full flex flex-col bg-dark-900 w-full overflow-hidden">
            {/* Header */}
            <header className="px-8 py-6 border-b border-dark-700 flex items-center justify-between shrink-0 bg-dark-900/80 backdrop-blur">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-8 h-8 bg-primary-600/20 rounded-xl flex items-center justify-center">
                            <Briefcase className="text-primary-400" size={16} />
                        </div>
                        <h1 className="text-2xl font-black text-white tracking-tight uppercase">Projects</h1>
                    </div>
                    <p className="text-slate-500 text-sm pl-11">
                        <span className="text-slate-300 font-semibold">{activeCompany?.name}</span> workspace · {projects.length} total projects
                    </p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-primary-600/20 active:scale-95"
                >
                    <Plus size={18} /> New Project
                </button>
            </header>

            {/* 3-Column Board */}
            <div className="flex-1 overflow-hidden">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-3">
                        <Loader2 className="animate-spin text-primary-500" size={32} />
                        Loading projects...
                    </div>
                ) : (
                    <div className="h-full grid grid-cols-3 divide-x divide-dark-700">
                        {columns.map(col => {
                            const colProjects = projects.filter(p => p.status === col.id);
                            return (
                                <div key={col.id} className="flex flex-col min-h-0">
                                    {/* Column Header */}
                                    <div className="px-6 py-4 border-b border-dark-700 shrink-0 flex items-center gap-3 bg-dark-800/30">
                                        {col.icon}
                                        <h2 className="font-black text-white text-sm uppercase tracking-widest">{col.title}</h2>
                                        <span className="ml-auto px-2 py-0.5 rounded-full bg-dark-700 text-slate-400 text-xs font-bold border border-dark-600">
                                            {colProjects.length}
                                        </span>
                                    </div>

                                    {/* Column Body */}
                                    <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
                                        {colProjects.length > 0 ? (
                                            colProjects.map(project => (
                                                <ProjectCard
                                                    key={project.id}
                                                    project={project}
                                                    onClick={() => navigate(`/dashboard/projects/${project.id}`)}
                                                />
                                            ))
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-16 text-slate-600 gap-3 border border-dashed border-dark-700 rounded-2xl">
                                                <div className={`w-2 h-2 rounded-full ${col.dot} opacity-30`} />
                                                <p className="text-xs font-medium text-center">{col.emptyMsg}</p>
                                                <button
                                                    onClick={() => { setProjectStatus(col.id); setIsModalOpen(true); }}
                                                    className="text-xs text-primary-500 hover:text-primary-400 font-bold flex items-center gap-1 underline underline-offset-2"
                                                >
                                                    <Plus size={12} /> Add one
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Create Project Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
                    <div className="bg-dark-800 border border-dark-700 rounded-3xl p-8 w-full max-w-lg shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-xl font-black text-white">New Project</h2>
                                <p className="text-sm text-slate-500 mt-0.5">Under <span className="text-slate-300">{activeCompany?.name}</span></p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-500 hover:text-white hover:bg-dark-700 rounded-xl transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                                    Project Name *
                                </label>
                                <input
                                    type="text"
                                    value={projectName}
                                    onChange={e => setProjectName(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleCreateProject()}
                                    className="w-full bg-dark-900 border border-dark-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-500 transition-all placeholder:text-slate-600"
                                    placeholder="e.g. Website Redesign"
                                    autoFocus
                                    disabled={isCreating}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                                    Description
                                </label>
                                <textarea
                                    value={projectDesc}
                                    onChange={e => setProjectDesc(e.target.value)}
                                    className="w-full bg-dark-900 border border-dark-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-500 transition-all placeholder:text-slate-600 resize-none"
                                    rows={3}
                                    placeholder="Brief description of the project scope..."
                                    disabled={isCreating}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                                    Initial Status
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['ongoing', 'upcoming', 'completed'].map(s => (
                                        <button
                                            key={s}
                                            type="button"
                                            onClick={() => setProjectStatus(s)}
                                            className={`py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all ${
                                                projectStatus === s
                                                    ? STATUS_BADGE[s] + ' border-current'
                                                    : 'bg-dark-900 text-slate-500 border-dark-700 hover:border-slate-600'
                                            }`}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 mt-8">
                            <button
                                onClick={() => setIsModalOpen(false)}
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
                                {isCreating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                                {isCreating ? 'Creating...' : 'Create Project'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
