import { useState, useEffect, useCallback } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import useStore from '../../store/useStore';
import { CalendarDays, Loader2 } from 'lucide-react';
import { createWorkspaceCalendar } from '../../utils/workspaceCalendar';

export default function WorkspaceCalendar() {
    const { activeCompany, user } = useStore();
    const [calendarId, setCalendarId] = useState('');
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);

    // Listen to the company document for calendarId changes
    useEffect(() => {
        if (!activeCompany?.id) return;
        const ref = doc(db, 'companies', activeCompany.id);
        const unsub = onSnapshot(
            ref,
            (snap) => {
                setCalendarId(snap.data()?.calendarId || '');
                setLoading(false);
            },
            () => setLoading(false)
        );
        return () => unsub();
    }, [activeCompany?.id]);

    // Auto-create the workspace calendar when none exists yet
    const autoCreate = useCallback(async () => {
        if (!activeCompany?.id || !user?.uid || creating) return;
        setCreating(true);
        try {
            await createWorkspaceCalendar(
                user.uid,
                activeCompany.name || 'Workspace',
                activeCompany.id
            );
            // calendarId will update via the onSnapshot listener above
        } catch (err) {
            console.error('Auto-create calendar failed:', err);
        }
        setCreating(false);
    }, [activeCompany?.id, activeCompany?.name, user?.uid, creating]);

    // Trigger auto-create once we know there is no calendar yet
    useEffect(() => {
        if (!loading && !calendarId && !creating && activeCompany?.id) {
            autoCreate();
        }
    }, [loading, calendarId, creating, activeCompany?.id, autoCreate]);

    // Loading / creating states
    if (loading || creating || (!calendarId && !loading)) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-500">
                <Loader2 size={24} className="animate-spin text-primary-500" />
                <p className="text-xs font-semibold uppercase tracking-widest">
                    {creating ? 'Setting up workspace calendar…' : 'Loading calendar…'}
                </p>
                {creating && (
                    <p className="text-[11px] text-slate-600">
                        Creating a dedicated Google Calendar for this workspace
                    </p>
                )}
            </div>
        );
    }

    // No calendarId after create attempt — show a simple fallback
    if (!calendarId) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center gap-5 p-8">
                <div className="w-16 h-16 rounded-2xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center">
                    <CalendarDays size={28} className="text-primary-400" />
                </div>
                <div className="text-center max-w-sm">
                    <h3 className="text-lg font-bold text-white mb-2">Calendar Unavailable</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">
                        The workspace calendar could not be created. Please check that the IMS
                        service account is configured correctly and try again from Settings.
                    </p>
                </div>
            </div>
        );
    }

    // Build embed URL
    let cleanId = calendarId.trim();
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
