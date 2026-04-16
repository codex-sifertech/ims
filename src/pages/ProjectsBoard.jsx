import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSharedProjects } from '../hooks/useSharedProjects';
import { AlertCircle, Clock, CheckCircle2, ChevronRight, Plus } from 'lucide-react';

export default function ProjectsBoard() {
    const { columns, loading, updateColumns } = useSharedProjects();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [projectName, setProjectName] = useState('');
    const [projectDesc, setProjectDesc] = useState('');
    const navigate = useNavigate();

    const handleCreateProject = async () => {
        if (!projectName.trim()) return;

        const newProject = {
            id: `proj-${Date.now()}`,
            title: projectName,
            desc: projectDesc,
            timeLogged: 0,
            createdBy: 'Master Admin'
        };

        const newColumns = columns.map(col => {
            if (col.id === 'ongoing') {
                return {
                    ...col,
                    cards: [...(col.cards || []), newProject]
                };
            }
            return col;
        });

        await updateColumns(newColumns);
        
        // Reset and close
        setProjectName('');
        setProjectDesc('');
        setIsModalOpen(false);
    };

    return (
        <div className="h-full flex flex-col p-6 space-y-6 overflow-y-auto bg-dark-900 custom-scrollbar w-full">
            <header className="flex items-center justify-between shrink-0">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Projects Ecosystem</h1>
                    <p className="text-slate-400 mt-1">Cross-company projects overview.</p>
                </div>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium rounded-xl transition-colors shadow-lg shadow-primary-600/20"
                >
                    <Plus size={18} /> New Project
                </button>
            </header>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <h2 className="text-xl font-bold text-white mb-4">Create New Project</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Project Name</label>
                                <input 
                                    type="text" 
                                    value={projectName}
                                    onChange={(e) => setProjectName(e.target.value)}
                                    className="w-full bg-dark-900 border border-dark-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500" 
                                    placeholder="e.g. Website Redesign" 
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Description</label>
                                <textarea 
                                    value={projectDesc}
                                    onChange={(e) => setProjectDesc(e.target.value)}
                                    className="w-full bg-dark-900 border border-dark-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500 resize-none" 
                                    rows={3} 
                                    placeholder="Brief description..."
                                ></textarea>
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-3 mt-6">
                            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-400 hover:text-white transition-colors text-sm font-medium">Cancel</button>
                            <button 
                                onClick={handleCreateProject}
                                disabled={!projectName.trim()}
                                className="px-4 py-2 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors rounded-lg text-sm font-medium"
                            >
                                Create Project
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex-1 flex flex-col gap-8">
                {loading ? (
                    <div className="text-slate-500 text-center py-10">Loading projects...</div>
                ) : (
                    columns.map(col => (
                        <section key={col.id} className="space-y-4">
                            <div className="flex items-center gap-3 border-b border-dark-700 pb-2">
                                {getStatusIcon(col.id)}
                                <h2 className="text-xl font-semibold text-white">{col.title}</h2>
                                <span className="px-2 py-0.5 rounded-full bg-dark-800 text-slate-400 text-xs font-bold border border-dark-700">
                                    {col.cards?.length || 0}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {col.cards?.length > 0 ? col.cards.map(project => (
                                    <div 
                                        key={project.id}
                                        onClick={() => navigate(`/dashboard/projects/${project.id}`)}
                                        className="bg-dark-800 border border-dark-700 hover:border-primary-500/50 rounded-2xl p-5 cursor-pointer hover:-translate-y-1 transition-all group flex flex-col"
                                    >
                                        <div className="flex justify-between items-start mb-3">
                                            <h3 className="font-bold text-white text-lg leading-tight group-hover:text-primary-400 transition-colors">{project.title}</h3>
                                            <ChevronRight size={18} className="text-dark-600 group-hover:text-primary-400 opacity-0 group-hover:opacity-100 transition-all transform -translate-x-2 group-hover:translate-x-0" />
                                        </div>
                                        {project.desc && <p className="text-sm text-slate-400 line-clamp-2 mb-4 flex-1">{project.desc}</p>}
                                        
                                        <div className="flex items-center justify-between pt-4 border-t border-dark-700/50 mt-auto">
                                            <div className="flex -space-x-2">
                                                {/* Mini avatars placeholder */}
                                                <div className="w-6 h-6 rounded-full bg-dark-600 border border-dark-800 flex items-center justify-center text-[10px] text-white">?</div>
                                            </div>
                                            <span className="text-xs text-slate-500 font-mono">#{project.id.split('-')[1]?.substring(0, 4) || '...' }</span>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="col-span-full border border-dashed border-dark-700 rounded-2xl p-6 text-center text-slate-500 text-sm bg-dark-800/30">
                                        No projects in this category.
                                    </div>
                                )}
                            </div>
                        </section>
                    ))
                )}
            </div>
        </div>
    );
}
