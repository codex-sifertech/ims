import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MonitorPlay, Users, Settings, Play, Network, ListTree, MessageSquare, ChevronLeft } from 'lucide-react';
import useStore from '../store/useStore';
import { useSharedProjects } from '../hooks/useSharedProjects';
import ScreenShareViewer from '../components/projects/ScreenShareViewer';
import MindMapEditor from '../components/projects/mindmap/MindMapEditor';
import WorkflowEditor from '../components/projects/workflow/WorkflowEditor';
import ProjectCollaborationSidebar from '../components/projects/ProjectCollaborationSidebar';
import ProjectInternalKanban from '../components/projects/ProjectInternalKanban';
import { useState } from 'react';

export default function ProjectDetails() {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const { columns } = useSharedProjects();
    const [activeTab, setActiveTab] = useState('overview');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Find the project details from the kanban layout
    let project = null;
    let currentStatus = '';
    for (const col of columns) {
        const found = col.cards.find(c => c.id === projectId);
        if (found) {
            project = found;
            currentStatus = col.title;
            break;
        }
    }

    if (!project) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <p>Project not found or you don't have access.</p>
                <button onClick={() => navigate('/dashboard/projects')} className="mt-4 text-primary-500 hover:underline">
                    Back to Projects
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
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-primary-600/20 text-primary-400 border border-primary-500/20">
                                    {currentStatus}
                                </span>
                                <span className="text-sm text-slate-500 font-mono">#{project.id.split('-')[1].substring(0, 6)}</span>
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
                        <div className="max-w-4xl mx-auto space-y-6">
                            <section className="bg-dark-800 border border-dark-700 rounded-2xl p-6">
                                <h3 className="text-lg font-semibold text-white mb-2">Description</h3>
                                <p className="text-slate-300 leading-relaxed min-h-[100px]">{project.desc}</p>
                            </section>

                            <div className="grid grid-cols-2 gap-6">
                                <section className="bg-dark-800 border border-dark-700 rounded-2xl p-6">
                                    <h3 className="text-lg font-semibold text-white mb-4">Live Team Activity</h3>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-center p-4 text-center border border-dashed border-dark-600 rounded-xl bg-dark-900/50">
                                            <p className="text-sm text-slate-500">No recent team activity in this project.</p>
                                        </div>
                                    </div>
                                </section>

                                <section className="bg-dark-800 border border-dark-700 rounded-2xl p-6">
                                    <h3 className="text-lg font-semibold text-white mb-4">Project Stats</h3>
                                    <div className="space-y-3">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-400">Created By</span>
                                            <span className="text-white font-medium">{project.createdBy || 'Unknown'}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-400">Total Hours</span>
                                            <span className="text-white font-medium">{Math.floor(project.timeLogged / 60)}h {project.timeLogged % 60}m</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-400">Active Viewers</span>
                                            <span className="text-emerald-400 font-medium flex items-center gap-1"><Users size={14} /> 3 Online</span>
                                        </div>
                                    </div>
                                </section>
                            </div>
                        </div>
                    )}

                    {activeTab === 'kanban' && (
                        <ProjectInternalKanban projectId={projectId} />
                    )}

                    {activeTab === 'screenshare' && (
                        <ScreenShareViewer projectId={projectId} />
                    )}

                    {activeTab === 'mindmap' && (
                        <MindMapEditor projectId={projectId} />
                    )}

                    {activeTab === 'workflow' && (
                        <WorkflowEditor projectId={projectId} />
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

