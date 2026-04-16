import { useState } from 'react';
import { LayoutDashboard, StickyNote, Target, CalendarDays, Route } from 'lucide-react';
import PersonalKanban from '../components/dashboard/PersonalKanban';
import VisionBoard from '../components/dashboard/VisionBoard';
import NotesSection from '../components/work/NotesSection';

export default function MyBoard() {
    const [activeTab, setActiveTab] = useState('kanban');

    const tabs = [
        { id: 'kanban', label: 'Task Execution', icon: <LayoutDashboard size={16} /> },
        { id: 'notes', label: 'Notes & Journals', icon: <StickyNote size={16} /> },
        { id: 'vision', label: 'Vision Board', icon: <Target size={16} /> },
        { id: 'calendar', label: 'Calendar', icon: <CalendarDays size={16} /> },
        { id: 'roadmap', label: 'Roadmap', icon: <Route size={16} /> },
    ];

    return (
        <div className="h-full flex flex-col p-6 space-y-6 overflow-hidden bg-dark-900 w-full">
            <header>
                <h1 className="text-3xl font-bold text-white tracking-tight">My Workspace</h1>
                <p className="text-slate-400 mt-1">Manage your centralized tasks, personal projects, and big-picture ideas within this company.</p>
            </header>

            {/* Tabs */}
            <div className="flex space-x-2 border-b border-dark-700 pb-px shrink-0">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 ${activeTab === tab.id
                                ? 'border-primary-500 text-white bg-dark-800'
                                : 'border-transparent text-slate-400 hover:text-white hover:bg-dark-800/50'
                            }`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden bg-dark-800/20 rounded-b-xl rounded-tr-xl flex">
                {activeTab === 'kanban' && (
                    <div className="flex-[2] overflow-hidden min-w-[600px] h-full p-2">
                        <PersonalKanban />
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
                {activeTab === 'calendar' && (
                    <div className="flex-1 m-6 flex items-center justify-center text-slate-500 border border-dark-700 rounded-xl bg-dark-800 border-dashed">
                        Calendar View (Integration Placeholder)
                    </div>
                )}
                {activeTab === 'roadmap' && (
                    <div className="flex-1 m-6 flex items-center justify-center text-slate-500 border border-dark-700 rounded-xl bg-dark-800 border-dashed">
                        Roadmap View (Integration Placeholder)
                    </div>
                )}
            </div>
        </div>
    );
}
