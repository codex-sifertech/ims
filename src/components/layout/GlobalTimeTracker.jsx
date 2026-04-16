import { useState, useEffect } from 'react';
import { Play, Square, Clock } from 'lucide-react';
import { useTimeTracker } from '../../hooks/useTimeTracker';

export default function GlobalTimeTracker() {
    const { isCheckedIn, toggleCheckIn } = useTimeTracker();
    const [seconds, setSeconds] = useState(0);

    // Simple timer logic
    useEffect(() => {
        let interval = null;
        if (isCheckedIn) {
            interval = setInterval(() => {
                setSeconds(s => s + 1);
            }, 1000);
        } else {
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [isCheckedIn]);

    const formatTime = (totalSeconds) => {
        const hrs = Math.floor(totalSeconds / 3600);
        const mins = Math.floor((totalSeconds % 3600) / 60);
        const secs = totalSeconds % 60;
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="bg-dark-900 border border-dark-700 rounded-xl p-3 mx-4 mb-4 flex flex-col items-center">
            <div className="flex items-center gap-2 mb-2 text-slate-400 text-xs font-medium uppercase tracking-wider">
                <Clock size={14} /> Time Tracker
            </div>
            <div className={`text-2xl font-mono font-bold mb-3 ${isCheckedIn ? 'text-emerald-400' : 'text-slate-300'}`}>
                {formatTime(seconds)}
            </div>
            <button
                onClick={toggleCheckIn}
                className={`w-full flex items-center justify-center gap-2 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isCheckedIn 
                    ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30' 
                    : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                }`}
            >
                {isCheckedIn ? (
                    <><Square size={14} fill="currentColor" /> Stop Tracker</>
                ) : (
                    <><Play size={14} fill="currentColor" /> Start Tracker</>
                )}
            </button>
        </div>
    );
}
