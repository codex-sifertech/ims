import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    ArrowLeft, 
    MonitorPlay, 
    Users, 
    Settings, 
    Play, 
    Network, 
    ListTree, 
    MessageSquare, 
    ChevronLeft,
    Clock,
    Activity,
    Calendar,
    Sparkles,
    Loader2,
    AlertCircle
} from 'lucide-react';
import useStore from '../store/useStore';
import { useProject } from '../hooks/useProject';
import ScreenShareViewer from '../components/projects/ScreenShareViewer';
import MindMapEditor from '../components/projects/mindmap/MindMapEditor';
import WorkflowEditor from '../components/projects/workflow/WorkflowEditor';
import ProjectCollaborationSidebar from '../components/projects/ProjectCollaborationSidebar';
import ProjectInternalKanban from '../components/projects/ProjectInternalKanban';
import ProjectOverview from '../components/projects/ProjectOverview';
import ProjectSettings from '../components/projects/ProjectSettings';

export default function ProjectDetails() {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const { project, loading, updateProjectData } = useProject(projectId);
    const [activeTab, setActiveTab] = useState('overview');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    if (loading) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-4 bg-dark-900">
                <Loader2 className="animate-spin text-primary-500" size={40} />
                <p className="text-lg font-medium">Syncing project data...</p>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-4 bg-dark-900">
                <AlertCircle size={48} className="text-red-500" />
                <h2 className="text-2xl font-bold text-white">Project Not Found</h2>
                <p>The project you are looking for does not exist or you don't have access.</p>
                <button 
                    onClick={() => navigate('/dashboard/projects')}
                    className="mt-4 px-6 py-2 bg-dark-800 hover:bg-dark-700 text-white rounded-xl transition-all border border-dark-700 font-medium"
                >
                    Back to Ecosystem
                </button>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-row bg-dark-900 overflow-hidden relative">
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header */}
                <header className="px-6 py-4 border-b border-dark-700 flex items-center justify-between bg-dark-900/80 backdrop-blur shrink-0">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/dashboard/projects')}
                            className="p-2 hover:bg-dark-700 rounded-full text-slate-400 hover:text-white transition-colors"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase border ${
                                    project.status === 'completed' 
                                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                                        : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                }`}>
                                    {project.status || 'Ongoing'}
                                </span>
                                <span className="text-sm text-slate-500 font-mono">#{project.id.substring(0, 8)}</span>
                            </div>
                            <h1 className="text-2xl font-bold text-white mt-1 leading-tight">{project.title}</h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-3 border border-dark-600 p-1 rounded-xl bg-dark-800">
                            <button
                                onClick={() => setActiveTab('overview')}
                                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'overview' ? 'bg-dark-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                Overview
                            </button>
                            <button
                                onClick={() => setActiveTab('kanban')}
                                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${activeTab === 'kanban' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                <ListTree size={14} /> Task Execution
                            </button>
                            <button
                                onClick={() => setActiveTab('screenshare')}
                                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${activeTab === 'screenshare' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                <MonitorPlay size={14} /> Screen Share Live
                            </button>
                            <button
                                onClick={() => setActiveTab('mindmap')}
                                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${activeTab === 'mindmap' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                <Network size={14} /> Mind Map
                            </button>
                            <button
                                onClick={() => setActiveTab('workflow')}
                                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${activeTab === 'workflow' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                <ListTree size={14} /> Workflow
                            </button>
                            <button
                                onClick={() => setActiveTab('ai')}
                                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${activeTab === 'ai' ? 'bg-primary-600 text-white shadow-md shadow-primary-600/20' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                <Sparkles size={14} /> AI
                            </button>
                            <button
                                onClick={() => setActiveTab('settings')}
                                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'settings' ? 'bg-dark-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                <Settings size={14} />
                            </button>
                        </div>

                        {!isSidebarOpen && (
                            <button 
                                onClick={() => setIsSidebarOpen(true)}
                                className="h-10 px-4 rounded-xl bg-dark-800 border border-dark-600 text-slate-300 hover:text-white flex items-center gap-2 transition-all"
                            >
                                <MessageSquare size={16} />
                                <span className="text-xs font-bold uppercase tracking-wider">Collaboration</span>
                            </button>
                        )}
                    </div>
                </header>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                    {activeTab === 'overview' && (
                        <ProjectOverview project={project} />
                    )}

                    {activeTab === 'kanban' && (
                        <ProjectInternalKanban projectId={projectId} />
                    )}

                    {activeTab === 'screenshare' && (
                        <ScreenShareViewer projectId={projectId} />
                    )}

                    {activeTab === 'mindmap' && (
                        <MindMapEditor projectId={projectId} projectData={project} onUpdate={updateProjectData} />
                    )}

                    {activeTab === 'workflow' && (
                        <WorkflowEditor projectId={projectId} projectData={project} onUpdate={updateProjectData} />
                    )}

                    {activeTab === 'ai' && (
                        <div className="h-full flex items-center justify-center">
                            <div className="bg-dark-800 border border-dark-700 rounded-2xl p-8 max-w-lg w-full text-center">
                                <Sparkles className="text-primary-500 mx-auto mb-4" size={48} />
                                <h2 className="text-2xl font-bold text-white mb-2">Project AI Assistant</h2>
                                <p className="text-slate-400 mb-6">Analyze project tasks, optimize workflow, and get insights specific to this project.</p>
                                <button className="px-6 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-medium transition-colors shadow-lg shadow-primary-500/20 w-full">
                                    Start Analysis Session
                                </button>
                            </div>
                        </div>
                    )}
                    
                    {activeTab === 'settings' && (
                        <ProjectSettings project={project} onUpdate={updateProjectData} />
                    )}
                </div>
            </div>

            {/* Collaboration Sidebar */}
            <ProjectCollaborationSidebar 
                projectId={projectId} 
                isOpen={isSidebarOpen} 
                onClose={() => setIsSidebarOpen(false)} 
            />
        </div>
    );
}

