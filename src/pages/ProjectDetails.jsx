import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, MonitorPlay, Settings, Network, ListTree,
    MessageSquare, Sparkles, Loader2, AlertCircle,
    FileText, BarChart2, CheckSquare, ChevronRight
} from 'lucide-react';
import useStore from '../store/useStore';
import { useProject } from '../hooks/useProject';
import { useProjectTasks } from '../hooks/useProjectTasks';
import ScreenShareViewer from '../components/projects/ScreenShareViewer';
import MindMapEditor from '../components/projects/mindmap/MindMapEditor';
import WorkflowEditor from '../components/projects/workflow/WorkflowEditor';
import ProjectCollaborationSidebar from '../components/projects/ProjectCollaborationSidebar';
import ProjectInternalKanban from '../components/projects/ProjectInternalKanban';
import ProjectOverview from '../components/projects/ProjectOverview';
import ProjectSettings from '../components/projects/ProjectSettings';
import ProjectDetails from '../components/projects/ProjectDetails';

export default function ProjectDetailsPage() {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const { project, loading, updateProjectData } = useProject(projectId);
    const { tasks, loading: tasksLoading, addTask, updateTask, deleteTask } = useProjectTasks(projectId);
    const [activeView, setActiveView] = useState('details'); // 'details' | 'analytics' | 'tasks' | 'tools'
    const [activeTool, setActiveTool] = useState('screenshare'); // sub-view under 'tools'
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    if (loading) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-4 bg-dark-900">
                <Loader2 className="animate-spin text-primary-500" size={40} />
                <p className="text-lg font-medium">Loading project...</p>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-4 bg-dark-900">
                <AlertCircle size={48} className="text-red-500" />
                <h2 className="text-2xl font-bold text-white">Project Not Found</h2>
                <p>This project does not exist or you don't have access.</p>
                <button
                    onClick={() => navigate('/dashboard/projects')}
                    className="mt-4 px-6 py-2 bg-dark-800 hover:bg-dark-700 text-white rounded-xl transition-all border border-dark-700 font-medium"
                >
                    ← Back to Projects
                </button>
            </div>
        );
    }

    const STATUS_STYLE = {
        completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        ongoing:   'bg-amber-500/10 text-amber-400 border-amber-500/20',
        upcoming:  'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
        'on-hold': 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    };

    const mainTabs = [
        { id: 'details',   label: 'Details',   icon: <FileText size={15} /> },
        { id: 'analytics', label: 'Analytics', icon: <BarChart2 size={15} /> },
        { id: 'tasks',     label: 'Tasks',     icon: <CheckSquare size={15} /> },
        { id: 'tools',     label: 'Tools',     icon: <Network size={15} /> },
    ];

    const toolTabs = [
        { id: 'screenshare', label: 'Screen Share', icon: <MonitorPlay size={14} /> },
        { id: 'mindmap',     label: 'Mind Map',     icon: <Network size={14} /> },
        { id: 'workflow',    label: 'Workflow',      icon: <ListTree size={14} /> },
        { id: 'ai',          label: 'AI',            icon: <Sparkles size={14} /> },
        { id: 'settings',    label: 'Settings',      icon: <Settings size={14} /> },
    ];

    return (
        <div className="h-full flex flex-row bg-dark-900 overflow-hidden relative">
            <div className="flex-1 flex flex-col min-w-0">
                {/* ── Header ── */}
                <header className="px-6 py-3 border-b border-dark-700 flex items-center justify-between bg-dark-900/90 backdrop-blur shrink-0 gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                        <button
                            onClick={() => navigate('/dashboard/projects')}
                            className="p-2 hover:bg-dark-700 rounded-full text-slate-400 hover:text-white transition-colors shrink-0"
                        >
                            <ArrowLeft size={18} />
                        </button>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase border ${STATUS_STYLE[project.status] || STATUS_STYLE.ongoing}`}>
                                    {project.status || 'Ongoing'}
                                </span>
                            </div>
                            <h1 className="text-lg font-bold text-white mt-0.5 leading-tight truncate">{project.title}</h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                        {/* Main Tab Pills */}
                        <div className="flex items-center bg-dark-800 border border-dark-700 rounded-xl p-1 gap-0.5">
                            {mainTabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveView(tab.id)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                        activeView === tab.id
                                            ? 'bg-primary-600 text-white shadow-md'
                                            : 'text-slate-400 hover:text-white hover:bg-dark-700'
                                    }`}
                                >
                                    {tab.icon} {tab.label}
                                </button>
                            ))}
                        </div>

                        {!isSidebarOpen && (
                            <button
                                onClick={() => setIsSidebarOpen(true)}
                                className="h-9 px-3 rounded-xl bg-dark-800 border border-dark-600 text-slate-300 hover:text-white flex items-center gap-2 transition-all text-xs font-bold"
                            >
                                <MessageSquare size={14} /> Chat
                            </button>
                        )}
                    </div>
                </header>

                {/* ── Tool sub-tabs (only when 'tools' is active) ── */}
                {activeView === 'tools' && (
                    <div className="px-6 py-2 border-b border-dark-700/50 flex items-center gap-1 bg-dark-800/30 shrink-0">
                        {toolTabs.map(t => (
                            <button
                                key={t.id}
                                onClick={() => setActiveTool(t.id)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                    activeTool === t.id
                                        ? 'bg-indigo-600 text-white'
                                        : 'text-slate-400 hover:text-white hover:bg-dark-700'
                                }`}
                            >
                                {t.icon} {t.label}
                            </button>
                        ))}
                    </div>
                )}

                {/* ── Content ── */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {activeView === 'details' && (
                        <ProjectDetails project={project} onUpdate={updateProjectData} />
                    )}
                    {activeView === 'analytics' && (
                        <div className="p-6">
                            <ProjectOverview project={project} tasks={tasks} />
                        </div>
                    )}
                    {activeView === 'tasks' && (
                        <div className="h-full p-6 flex flex-col">
                            <ProjectInternalKanban projectId={projectId} />
                        </div>
                    )}
                    {activeView === 'tools' && activeTool === 'screenshare' && (
                        <div className="h-full">
                            <ScreenShareViewer projectId={projectId} />
                        </div>
                    )}
                    {activeView === 'tools' && activeTool === 'mindmap' && (
                        <div className="h-full">
                            <MindMapEditor projectId={projectId} projectData={project} onUpdate={updateProjectData} />
                        </div>
                    )}
                    {activeView === 'tools' && activeTool === 'workflow' && (
                        <div className="h-full">
                            <WorkflowEditor projectId={projectId} projectData={project} onUpdate={updateProjectData} />
                        </div>
                    )}
                    {activeView === 'tools' && activeTool === 'ai' && (
                        <div className="h-full flex items-center justify-center p-6">
                            <div className="bg-dark-800 border border-dark-700 rounded-2xl p-8 max-w-lg w-full text-center">
                                <Sparkles className="text-primary-500 mx-auto mb-4" size={48} />
                                <h2 className="text-2xl font-bold text-white mb-2">Project AI Assistant</h2>
                                <p className="text-slate-400 mb-6">Analyze tasks, optimize workflow, and get insights for this project.</p>
                                <button className="px-6 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-primary-500/20 w-full">
                                    Start Analysis Session
                                </button>
                            </div>
                        </div>
                    )}
                    {activeView === 'tools' && activeTool === 'settings' && (
                        <div className="p-6">
                            <ProjectSettings project={project} onUpdate={updateProjectData} />
                        </div>
                    )}
                </div>
            </div>

            {/* Collaboration Sidebar */}
            <ProjectCollaborationSidebar
                projectId={projectId}
                projectTitle={project?.title}
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />
        </div>
    );
}
