import { useState, useEffect, useRef } from 'react';
import { Play, Square, Clock, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import useStore from '../../store/useStore';

// Props: isCheckedIn, sessionStart, onToggle — passed from DashboardLayout (single hook instance)
export default function GlobalTimeTracker({ isCheckedIn, sessionStart, onToggle }) {
    const { user, activeCompany } = useStore();
    const [seconds, setSeconds] = useState(0);
    const [isToggling, setIsToggling] = useState(false);
    const [todayMinutes, setTodayMinutes] = useState(0);
    const intervalRef = useRef(null);

    // ── Live session timer ─────────────────────────────────────────────────────
    useEffect(() => {
        clearInterval(intervalRef.current);
        if (isCheckedIn && sessionStart) {
            const elapsed = Math.floor((Date.now() - new Date(sessionStart).getTime()) / 1000);
            setSeconds(Math.max(0, elapsed));
            intervalRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
        } else {
            setSeconds(0);
        }
        return () => clearInterval(intervalRef.current);
    }, [isCheckedIn, sessionStart]);

    // ── Fetch today's total completed minutes ──────────────────────────────────
    useEffect(() => {
        if (!user?.uid || !activeCompany?.id) return;
        const todayStr = new Date().toISOString().split('T')[0];
        const logsRef = collection(db, 'companies', activeCompany.id, 'timeLogs');
        getDocs(
            query(logsRef, where('userId', '==', user.uid), where('date', '==', todayStr), limit(20))
        ).then(snap => {
            const mins = snap.docs.reduce((s, d) => s + (d.data().durationMinutes || 0), 0);
            setTodayMinutes(mins);
        }).catch(() => {});
    }, [user?.uid, activeCompany?.id, isCheckedIn]); // refresh when session ends

    const formatTime = (totalSeconds) => {
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    const formatMins = (mins) => {
        if (mins < 60) return `${mins}m`;
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return m > 0 ? `${h}h ${m}m` : `${h}h`;
    };

    const handleClick = async () => {
        if (isToggling) return;
        setIsToggling(true);
        // Safety timeout: auto-reset after 8s in case something hangs
        const safetyTimer = setTimeout(() => setIsToggling(false), 8000);
        try {
            await onToggle();
        } catch (err) {
            console.error('[TimeTracker] Toggle failed:', err);
        } finally {
            clearTimeout(safetyTimer);
            setIsToggling(false);
        }
    };

    // Today's total = completed sessions + current live session
    const liveMins = Math.floor(seconds / 60);
    const totalTodayMins = todayMinutes + (isCheckedIn ? liveMins : 0);

    return (
        <div className="bg-dark-900 border border-dark-700 rounded-xl mx-4 mb-4 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-3 pb-2">
                <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-black uppercase tracking-wider">
                    <Clock size={12} /> Time Tracker
                </div>
                {isCheckedIn && sessionStart && (
                    <span className="text-[10px] text-emerald-600 font-bold">
                        since {format(new Date(sessionStart), 'HH:mm')}
                    </span>
                )}
            </div>

            {/* Live Timer */}
            <div className={`text-center pb-1 text-3xl font-mono font-black tracking-tight transition-colors ${
                isCheckedIn ? 'text-emerald-400' : 'text-slate-600'
            }`}>
                {formatTime(seconds)}
            </div>

            {/* Today total */}
            <div className="flex items-center justify-center gap-1.5 pb-3 text-[10px] font-bold text-slate-500">
                <TrendingUp size={11} />
                Today: <span className={totalTodayMins > 0 ? 'text-slate-300' : 'text-slate-600'}>
                    {formatMins(totalTodayMins)}
                </span>
            </div>

            {/* Button */}
            <div className="px-3 pb-3">
                <button
                    onClick={handleClick}
                    disabled={isToggling}
                    className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                        isCheckedIn
                            ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border border-rose-500/20'
                            : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/20'
                    }`}
                >
                    {isToggling ? (
                        <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : isCheckedIn ? (
                        <Square size={13} fill="currentColor" />
                    ) : (
                        <Play size={13} fill="currentColor" />
                    )}
                    {isToggling ? 'Saving...' : isCheckedIn ? 'Stop Tracker' : 'Start Tracker'}
                </button>
            </div>
        </div>
    );
}
