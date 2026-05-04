import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import useStore from '../../store/useStore';
import { CalendarDays, Settings, Save, Check, ExternalLink, Loader2 } from 'lucide-react';
import { createWorkspaceCalendar } from '../../utils/workspaceCalendar';

export default function WorkspaceCalendar() {
    const { activeCompany, user } = useStore();
    const [calendarId, setCalendarId] = useState('');
    const [savedId, setSavedId] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [justSaved, setJustSaved] = useState(false);
    const [autoCreating, setAutoCreating] = useState(false);

    useEffect(() => {
        if (!activeCompany?.id) return;
        const ref = doc(db, 'companies', activeCompany.id);
        const unsub = onSnapshot(ref, (snap) => {
            const id = snap.data()?.calendarId || '';
            setCalendarId(id);
            setSavedId(id);
            setLoading(false);
        }, () => setLoading(false));
        return () => unsub();
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

    const handleAutoCreate = async () => {
        if (!activeCompany?.id || !user?.uid || autoCreating) return;
        setAutoCreating(true);
        try {
            const calId = await createWorkspaceCalendar(user.uid, activeCompany.name || 'Workspace', activeCompany.id);
            if (calId) {
                setCalendarId(calId);
                setSavedId(calId);
            } else {
                alert('Could not create calendar. Make sure your Google Calendar is connected in My Board settings.');
            }
        } catch {
            alert('Calendar creation failed. Please connect Google Calendar first.');
        } finally {
            setAutoCreating(false);
        }
    };

    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center text-slate-500 text-sm gap-2">
                <Loader2 size={16} className="animate-spin" /> Loading calendar...
            </div>
        );
    }

    if (!savedId) {
        return (
            <div className="flex-1 m-6 flex flex-col items-center justify-center gap-4">
                <div className="w-20 h-20 bg-dark-800 rounded-full flex items-center justify-center border border-dark-700">
                    <CalendarDays size={36} className="text-slate-600" />
                </div>
                <h3 className="text-lg font-black text-white">Workspace Calendar</h3>
                <p className="text-slate-500 text-sm max-w-md text-center">
                    Auto-create a shared Google Calendar for this workspace, or enter an existing Calendar ID manually.
                </p>

                <button
                    onClick={handleAutoCreate}
                    disabled={autoCreating}
                    className="flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors shadow-lg shadow-primary-500/20"
                >
                    {autoCreating ? <Loader2 size={16} className="animate-spin" /> : <CalendarDays size={16} />}
                    {autoCreating ? 'Creating Calendar...' : 'Auto-Create Calendar'}
                </button>

                <div className="flex items-center gap-3 w-full max-w-md">
                    <div className="flex-1 h-px bg-dark-700" />
                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">or enter manually</span>
                    <div className="flex-1 h-px bg-dark-700" />
                </div>

                <div className="flex flex-col gap-3 w-full max-w-md">
                    <input
                        value={calendarId}
                        onChange={e => setCalendarId(e.target.value)}
                        placeholder="e.g. your-email@gmail.com or calendar-id@group.calendar.google.com"
                        className="w-full bg-dark-800 border border-dark-600 focus:border-primary-500 rounded-xl px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-slate-600"
                    />
                    <div className="flex gap-2">
                        <button onClick={handleSave} disabled={!calendarId.trim() || saving}
                            className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-dark-700 hover:bg-dark-600 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors border border-dark-600">
                            <Save size={16} /> Save Calendar ID
                        </button>
                        <a href="https://calendar.google.com/calendar/r/settings" target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-3 bg-dark-800 hover:bg-dark-700 text-slate-400 text-sm font-bold rounded-xl transition-colors border border-dark-700">
                            <ExternalLink size={14} /> Open Settings
                        </a>
                    </div>
                    <p className="text-[10px] text-slate-600 text-center">
                        If entering manually, make sure the calendar is set to <strong className="text-slate-400">public</strong> for the embed to work.
                    </p>
                </div>
            </div>
        );
    }

    let cleanId = savedId.trim();
    if (cleanId.includes('src=')) {
        try {
            const match = cleanId.match(/src=([^&"]+)/);
            if (match && match[1]) cleanId = decodeURIComponent(match[1]);
        } catch {}
    }

    const embedUrl = `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(cleanId)}&ctz=${encodeURIComponent(tz || 'UTC')}&mode=WEEK`;

    return (
        <div className="flex-1 flex flex-col h-full">
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
