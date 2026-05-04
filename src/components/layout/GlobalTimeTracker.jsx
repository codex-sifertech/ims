import { useState, useEffect, useRef } from 'react';
import { Play, Square, Clock } from 'lucide-react';

// Props come from DashboardLayout which already holds the single useTimeTracker instance.
// This avoids creating a second duplicate Firestore listener.
export default function GlobalTimeTracker({ isCheckedIn, sessionStart, onToggle }) {
    const [seconds, setSeconds] = useState(0);
    const [isToggling, setIsToggling] = useState(false);
    const intervalRef = useRef(null);

    // Whenever check-in state or sessionStart changes, recalculate elapsed seconds
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

    const formatTime = (totalSeconds) => {
        const hrs = Math.floor(totalSeconds / 3600);
        const mins = Math.floor((totalSeconds % 3600) / 60);
        const secs = totalSeconds % 60;
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleClick = async () => {
        if (isToggling) return;
        setIsToggling(true);
        try {
            await onToggle();
        } finally {
            setIsToggling(false);
        }
    };

    return (
        <div className="bg-dark-900 border border-dark-700 rounded-xl p-3 mx-4 mb-4 flex flex-col items-center">
            <div className="flex items-center gap-2 mb-2 text-slate-400 text-xs font-medium uppercase tracking-wider">
                <Clock size={14} /> Time Tracker
            </div>
            <div className={`text-2xl font-mono font-bold mb-3 transition-colors ${isCheckedIn ? 'text-emerald-400' : 'text-slate-500'}`}>
                {formatTime(seconds)}
            </div>
            <button
                onClick={handleClick}
                disabled={isToggling}
                className={`w-full flex items-center justify-center gap-2 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                    isCheckedIn
                    ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30'
                    : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                }`}
            >
                {isToggling ? (
                    <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : isCheckedIn ? (
                    <Square size={14} fill="currentColor" />
                ) : (
                    <Play size={14} fill="currentColor" />
                )}
                {isToggling ? 'Saving...' : isCheckedIn ? 'Stop Tracker' : 'Start Tracker'}
            </button>
        </div>
    );
}
