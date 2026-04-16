import { useState } from 'react';
import { LayoutDashboard, StickyNote, Target, CalendarDays, Route } from 'lucide-react';
import VisionBoard from '../components/dashboard/VisionBoard';
import WorkKanban from '../components/work/WorkKanban';
import NotesSection from '../components/work/NotesSection';

export default function WorkBoard() {
    const [activeTab, setActiveTab] = useState('kanban');

    const tabs = [
        { id: 'kanban', label: 'Task Execution', icon: <LayoutDashboard size={16} /> },
        { id: 'notes', label: 'Notes & Journals', icon: <StickyNote size={16} /> },
        { id: 'vision', label: 'Vision Board', icon: <Target size={16} /> },
        { id: 'calendar', label: 'Calendar', icon: <CalendarDays size={16} /> },
        { id: 'roadmap', label: 'Roadmap', icon: <Route size={16} /> },
    ];

    return (
        <div className="h-full flex flex-col p-6 space-y-6">
            <header>
                <h1 className="text-3xl font-bold text-white tracking-tight">Work Module</h1>
                <p className="text-slate-400 mt-1">Detailed execution zone for planning and organization.</p>
            </header>

            {/* Tabs */}
            <div className="flex space-x-2 border-b border-dark-700 pb-px">
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
            <div className="flex-1 overflow-hidden bg-dark-900 rounded-b-xl rounded-tr-xl">
                {activeTab === 'kanban' && <WorkKanban />}
                {activeTab === 'notes' && <NotesSection />}
                {activeTab === 'vision' && <div className="h-full max-w-2xl"><VisionBoard /></div>}
                {activeTab === 'calendar' && (
                    <div className="h-full flex items-center justify-center text-slate-500 border border-dark-700 rounded-xl bg-dark-800 border-dashed">
                        Calendar View (Integration Placeholder)
                    </div>
                )}
                {activeTab === 'roadmap' && (
                    <div className="h-full flex items-center justify-center text-slate-500 border border-dark-700 rounded-xl bg-dark-800 border-dashed">
                        Roadmap View (Integration Placeholder)
                    </div>
                )}
            </div>
        </div>
    );
}
