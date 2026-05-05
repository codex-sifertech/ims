import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import useStore from '../../store/useStore';
import { CalendarDays, Loader2, Settings, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createWorkspaceCalendar } from '../../utils/workspaceCalendar';

export default function WorkspaceCalendar() {
    const { activeCompany, user } = useStore();
    const navigate = useNavigate();
    const [savedId, setSavedId] = useState('');
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [hasToken, setHasToken] = useState(null);

    useEffect(() => {
        if (!activeCompany?.id) return;
        const ref = doc(db, 'companies', activeCompany.id);
        const unsub = onSnapshot(ref, (snap) => {
            setSavedId(snap.data()?.calendarId || '');
            setLoading(false);
        }, () => setLoading(false));
        return () => unsub();
    }, [activeCompany?.id]);

    useEffect(() => {
        if (!user?.uid) return;
        const ref = doc(db, 'users', user.uid, 'integrations', 'google_calendar');
        getDoc(ref).then(snap => {
            const data = snap.data();
            setHasToken(!!(data?.accessToken && (!data.expiresAt || Date.now() < data.expiresAt)));
        }).catch(() => setHasToken(false));
    }, [user?.uid]);

    const autoCreate = useCallback(async () => {
        if (!activeCompany?.id || !user?.uid || creating) return;
        setCreating(true);
        try {
            const calId = await createWorkspaceCalendar(user.uid, activeCompany.name || 'Workspace', activeCompany.id);
            if (calId) setSavedId(calId);
        } catch {}
        setCreating(false);
    }, [activeCompany?.id, activeCompany?.name, user?.uid, creating]);

    // Auto-create when connected but no calendar yet
    useEffect(() => {
        if (!loading && !savedId && hasToken === true && !creating) {
            autoCreate();
        }
    }, [loading, savedId, hasToken, creating, autoCreate]);

    if (loading || (hasToken === true && !savedId && !creating)) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-500">
                <Loader2 size={24} className="animate-spin text-primary-500" />
                <p className="text-xs font-semibold uppercase tracking-widest">Loading calendar...</p>
            </div>
        );
    }

    if (creating) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-500">
                <Loader2 size={24} className="animate-spin text-primary-500" />
                <p className="text-xs font-semibold uppercase tracking-widest">Setting up workspace calendar...</p>
                <p className="text-[11px] text-slate-600">Creating a dedicated Google Calendar for this workspace</p>
            </div>
        );
    }

    if (!savedId) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center gap-5 p-8">
                <div className="w-16 h-16 rounded-2xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center">
                    <CalendarDays size={28} className="text-primary-400" />
                </div>
                <div className="text-center max-w-sm">
                    <h3 className="text-lg font-bold text-white mb-2">Connect Google Calendar</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">
                        Connect your Google Calendar in workspace settings to automatically create a shared calendar for your team.
                    </p>
                </div>
                <button
                    onClick={() => navigate('/dashboard/settings')}
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-500 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                    <Settings size={16} />
                    Go to Settings
                    <ArrowRight size={14} />
                </button>
            </div>
        );
    }

    let cleanId = savedId.trim();
    if (cleanId.includes('src=')) {
        try {
            const match = cleanId.match(/src=([^&"]+)/);
            if (match?.[1]) cleanId = decodeURIComponent(match[1]);
        } catch {}
    }

    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const embedUrl = `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(cleanId)}&ctz=${encodeURIComponent(tz || 'UTC')}&mode=WEEK`;

    return (
        <div className="flex-1 flex flex-col h-full">
            <iframe
                src={embedUrl}
                className="flex-1 w-full border-0"
                style={{ minHeight: '500px' }}
                frameBorder="0"
                scrolling="no"
                title="Workspace Calendar"
            />
        </div>
    );
}
