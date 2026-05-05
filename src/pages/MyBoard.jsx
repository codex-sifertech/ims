import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LayoutDashboard, StickyNote, Target, CalendarDays, Route, FolderKanban } from 'lucide-react';
import GlobalTaskBoard from '../components/dashboard/GlobalTaskBoard';
import VisionBoard from '../components/dashboard/VisionBoard';
import NotesSection from '../components/work/NotesSection';
import RoadmapView from '../components/dashboard/RoadmapView';
import WorkspaceCalendar from '../components/shared/WorkspaceCalendar';
import useStore from '../store/useStore';

export default function MyBoard() {
    const { user } = useStore();
    const [searchParams] = useSearchParams();
    const tabFromUrl = searchParams.get('tab');
    const [activeTab, setActiveTab] = useState(tabFromUrl || 'kanban');

    useEffect(() => {
        if (tabFromUrl) setActiveTab(tabFromUrl);
    }, [tabFromUrl]);

    const tabs = [
        { id: 'kanban',   label: 'Global Board',  icon: <LayoutDashboard size={15} /> },
        { id: 'notes',    label: 'Notes',          icon: <StickyNote size={15} /> },
        { id: 'vision',   label: 'Vision Board',   icon: <Target size={15} /> },
        { id: 'calendar', label: 'Calendar',       icon: <CalendarDays size={15} /> },
        { id: 'roadmap',  label: 'Roadmap',        icon: <Route size={15} /> },
    ];

    return (
        <div className="h-full flex flex-col p-6 overflow-hidden bg-dark-900 w-full">
            {/* Header */}
            <header className="mb-5 flex items-center justify-between shrink-0">
                <div className="relative pl-4">
                    <div className="absolute left-0 top-0 w-0.5 h-full bg-gradient-to-b from-primary-500 to-transparent rounded-full" />
                    <h1 className="text-2xl font-black text-white tracking-tight uppercase">My Board</h1>
                    <p className="text-slate-500 text-xs mt-0.5 font-medium flex items-center gap-1.5">
                        <FolderKanban size={12} className="text-primary-400" />
                        {user?.name || 'You'} — All tasks across every project
                    </p>
                </div>
            </header>

            {/* Tabs */}
            <div className="flex items-center gap-1 border-b border-dark-700/80 pb-px shrink-0">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 text-[12px] font-semibold rounded-t-lg transition-all border-b-2 -mb-px ${
                            activeTab === tab.id
                                ? 'border-primary-500 text-white bg-dark-800/80'
                                : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-dark-800/40'
                        }`}
                    >
                        <span className={activeTab === tab.id ? 'text-primary-400' : ''}>{tab.icon}</span>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden bg-dark-900/60 rounded-b-xl rounded-tr-xl border border-dark-700/50 border-t-0 flex">
                {activeTab === 'kanban' && (
                    <div className="flex-1 overflow-hidden h-full p-2">
                        <GlobalTaskBoard />
                    </div>
                )}
                {activeTab === 'notes' && (
                    <div className="w-full h-full">
                        <NotesSection />
                    </div>
                )}
                {activeTab === 'vision' && (
                    <div className="w-full max-w-4xl h-full p-6">
                        <VisionBoard />
                    </div>
                )}
                {activeTab === 'calendar' && <WorkspaceCalendar />}
                {activeTab === 'roadmap'  && <RoadmapView />}
            </div>
        </div>
    );
}
