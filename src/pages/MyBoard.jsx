import { useState, useEffect } from 'react';
import { LayoutDashboard, StickyNote, Target, CalendarDays, Route, Settings, Save, Check, ExternalLink } from 'lucide-react';
import GlobalTaskBoard from '../components/dashboard/GlobalTaskBoard';
import VisionBoard from '../components/dashboard/VisionBoard';
import NotesSection from '../components/work/NotesSection';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import useStore from '../store/useStore';

function CalendarView() {
    const { activeCompany, user } = useStore();
    const [calendarId, setCalendarId] = useState('');
    const [savedId, setSavedId] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [justSaved, setJustSaved] = useState(false);

    const isAdmin = user?.role === 'admin' || user?.role === 'master_admin';

    // Load saved calendar ID from company settings
    useEffect(() => {
        if (!activeCompany?.id) return;
        const load = async () => {
            try {
                const ref = doc(db, 'companies', activeCompany.id);
                const snap = await getDoc(ref);
                const id = snap.data()?.calendarId || '';
                setCalendarId(id);
                setSavedId(id);
            } catch (e) { console.error(e); }
            setLoading(false);
        };
        load();
    }, [activeCompany?.id]);

    const handleSave = async () => {
        if (!activeCompany?.id || saving) return;
        setSaving(true);
        try {
            await setDoc(doc(db, 'companies', activeCompany.id), { calendarId: calendarId.trim() }, { merge: true });
            setSavedId(calendarId.trim());
            setJustSaved(true);
            setTimeout(() => setJustSaved(false), 2000);
        } catch (e) { console.error('Failed to save calendar ID:', e); }
        setSaving(false);
    };

    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
                Loading calendar...
            </div>
        );
    }

    if (!savedId) {
        return (
            <div className="flex-1 m-6 flex flex-col items-center justify-center gap-4">
                <div className="w-20 h-20 bg-dark-800 rounded-full flex items-center justify-center border border-dark-700">
                    <CalendarDays size={36} className="text-slate-600" />
                </div>
                <h3 className="text-lg font-black text-white">Connect Google Calendar</h3>
                <p className="text-slate-500 text-sm max-w-md text-center">
                    {isAdmin
                        ? 'Enter your Google Calendar ID below to embed the calendar for your entire team. Find it in Google Calendar → Settings → Calendar ID.'
                        : 'Ask your admin to configure the Google Calendar integration.'}
                </p>
                {isAdmin && (
                    <div className="flex flex-col gap-3 w-full max-w-md mt-2">
                        <input
                            value={calendarId}
                            onChange={e => setCalendarId(e.target.value)}
                            placeholder="e.g. your-email@gmail.com or calendar-id@group.calendar.google.com"
                            className="w-full bg-dark-800 border border-dark-600 focus:border-primary-500 rounded-xl px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-slate-600"
                        />
                        <div className="flex gap-2">
                            <button onClick={handleSave} disabled={!calendarId.trim() || saving}
                                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors">
                                <Save size={16} /> Save Calendar
                            </button>
                            <a href="https://calendar.google.com/calendar/r/settings" target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-2 px-4 py-3 bg-dark-800 hover:bg-dark-700 text-slate-400 text-sm font-bold rounded-xl transition-colors border border-dark-700">
                                <ExternalLink size={14} /> Open Settings
                            </a>
                        </div>
                        <p className="text-[10px] text-slate-600 text-center">
                            Make sure your calendar is set to <strong className="text-slate-400">public</strong> in Google Calendar sharing settings for the embed to work.
                        </p>
                    </div>
                )}
            </div>
        );
    }

    const embedUrl = `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(savedId)}&ctz=${encodeURIComponent(tz)}&bgcolor=%230f172a&showTitle=0&showPrint=0&showCalendars=0&showTz=1&mode=WEEK`;

    return (
        <div className="flex-1 flex flex-col h-full">
            {/* Admin config bar */}
            {isAdmin && (
                <div className="shrink-0 flex items-center gap-2 px-4 py-2 bg-dark-800/50 border-b border-dark-700">
                    <Settings size={12} className="text-slate-500" />
                    <input value={calendarId} onChange={e => setCalendarId(e.target.value)}
                        className="flex-1 bg-transparent text-[11px] text-slate-400 outline-none placeholder:text-slate-600"
                        placeholder="Calendar ID..." />
                    {calendarId !== savedId && (
                        <button onClick={handleSave} className="text-[10px] font-bold text-primary-400 hover:text-primary-300 flex items-center gap-1">
                            {saving ? '...' : <><Save size={10} /> Update</>}
                        </button>
                    )}
                    {justSaved && <span className="text-[10px] text-emerald-400 flex items-center gap-1"><Check size={10} /> Saved</span>}
                </div>
            )}
            <iframe
                src={embedUrl}
                className="flex-1 w-full border-0 rounded-b-xl"
                style={{ minHeight: '500px' }}
                frameBorder="0"
                scrolling="no"
                title="Google Calendar"
            />
        </div>
    );
}

export default function MyBoard() {
    const [activeTab, setActiveTab] = useState('kanban');

    const tabs = [
        { id: 'kanban',   label: 'Global Task Board', icon: <LayoutDashboard size={16} /> },
        { id: 'notes',    label: 'Notes & Journals',  icon: <StickyNote size={16} /> },
        { id: 'vision',   label: 'Vision Board',       icon: <Target size={16} /> },
        { id: 'calendar', label: 'Calendar',            icon: <CalendarDays size={16} /> },
        { id: 'roadmap',  label: 'Roadmap',             icon: <Route size={16} /> },
    ];

    return (
        <div className="h-full flex flex-col p-6 space-y-6 overflow-hidden bg-dark-900 w-full">
            <header>
                <h1 className="text-3xl font-bold text-white tracking-tight">My Board</h1>
                <p className="text-slate-400 mt-1">
                    All tasks across every project — in one place, labeled by project.
                </p>
            </header>

            {/* Tabs */}
            <div className="flex space-x-2 border-b border-dark-700 pb-px shrink-0">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 ${
                            activeTab === tab.id
                                ? 'border-primary-500 text-white bg-dark-800'
                                : 'border-transparent text-slate-400 hover:text-white hover:bg-dark-800/50'
                        }`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden bg-dark-800/20 rounded-b-xl rounded-tr-xl flex">
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
                {activeTab === 'calendar' && (
                    <CalendarView />
                )}
                {activeTab === 'roadmap' && (
                    <div className="flex-1 m-6 flex items-center justify-center text-slate-500 border border-dark-700 rounded-xl bg-dark-800 border-dashed">
                        Roadmap View — Integration Placeholder
                    </div>
                )}
            </div>
        </div>
    );
}
