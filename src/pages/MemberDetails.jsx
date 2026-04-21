import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    ChevronLeft, 
    Calendar, 
    Clock, 
    Flame, 
    CheckCircle2, 
    AlertCircle, 
    Mail, 
    Shield, 
    MapPin,
    ArrowUpRight,
    Search,
    Download
} from 'lucide-react';
import { doc, getDoc, collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import useStore from '../store/useStore';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';

export default function MemberDetails() {
    const { memberId } = useParams();
    const navigate = useNavigate();
    const { activeCompany } = useStore();
    const [member, setMember] = useState(null);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!activeCompany?.id || !memberId) return;

        // Fetch Member Data
        const getMember = async () => {
            try {
                const memberRef = doc(db, 'companies', activeCompany.id, 'members', memberId);
                const snap = await getDoc(memberRef);
                if (snap.exists()) {
                    setMember({ id: snap.id, ...snap.data() });
                } else {
                    // Fallback: If not in members sub-collection, check global users (though it should be in members)
                    const userRef = doc(db, 'users', memberId);
                    const userSnap = await getDoc(userRef);
                    if (userSnap.exists()) {
                        setMember({ id: userSnap.id, ...userSnap.data(), role: 'Member' });
                    } else {
                        navigate('/people');
                    }
                }
            } catch (err) {
                console.error("Error fetching member:", err);
            }
        };

        // Fetch Member Attendance Logs
        const logsRef = collection(db, 'companies', activeCompany.id, 'attendance');
        const q = query(
            logsRef, 
            where('userId', '==', memberId),
            orderBy('isoDate', 'desc')
        );

        const unsubRows = onSnapshot(q, (snap) => {
            setLogs(snap.docs.map(d => ({ 
                id: d.id, 
                ...d.data(),
                timestamp: d.data().isoDate || d.data().timestamp // Handle both
            })));
            setLoading(false);
        }, (err) => {
            console.error("Failed to fetch logs:", err);
            setLoading(false);
        });

        getMember().catch(() => setLoading(false));
        return () => unsubRows();
    }, [activeCompany?.id, memberId]);

    const stats = useMemo(() => {
        if (!logs.length) return { totalHours: 0, avgCheckIn: 'N/A', streak: 0 };
        
        const totalMinutes = logs.reduce((acc, curr) => acc + (curr.duration || 0), 0);
        
        // Calculate Streak
        let streak = 0;
        const now = new Date();
        for (let i = 0; i < 30; i++) {
            const checkDate = new Date(now);
            checkDate.setDate(now.getDate() - i);
            if (logs.some(l => isSameDay(new Date(l.timestamp), checkDate))) streak++;
            else if (i > 0) break;
        }

        return {
            totalHours: (totalMinutes / 60).toFixed(1),
            streak,
            avgCheckIn: '09:12' // Mock for now
        };
    }, [logs]);

    if (loading) return (
        <div className="flex-1 flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            {/* Back Button & Header */}
            <button 
                onClick={() => navigate('/people')}
                className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors mb-8 group"
            >
                <div className="p-2 bg-dark-800 rounded-xl border border-white/5 group-hover:border-primary-500/30">
                    <ChevronLeft size={16} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest">Back to Directory</span>
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Profile Card */}
                <div className="lg:col-span-1 space-y-8">
                    <div className="bg-dark-800/40 border border-white/5 rounded-[3rem] p-10 backdrop-blur-md text-center">
                        <div className="relative w-32 h-32 mx-auto mb-6">
                            <div className="w-full h-full rounded-[2.5rem] bg-dark-700 border-2 border-primary-500/30 flex items-center justify-center text-4xl font-black text-slate-400 overflow-hidden">
                                {member.photoURL ? <img src={member.photoURL} className="w-full h-full object-cover" /> : member.name?.charAt(0)}
                            </div>
                            <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-emerald-500 rounded-2xl border-4 border-dark-800 flex items-center justify-center text-white shadow-xl">
                                <Shield size={16} />
                            </div>
                        </div>
                        
                        <h2 className="text-2xl font-black text-white uppercase tracking-tight">{member.name}</h2>
                        <p className="text-[10px] font-black text-primary-500 uppercase tracking-[0.2em] mt-1">{member.role}</p>
                        
                        <div className="mt-8 pt-8 border-t border-white/5 space-y-4">
                            <div className="flex items-center gap-3 text-slate-400">
                                <Mail size={14} className="text-slate-500" />
                                <span className="text-xs font-bold truncate">{member.email}</span>
                            </div>
                            <div className="flex items-center gap-3 text-slate-400">
                                <Calendar size={14} className="text-slate-500" />
                                <span className="text-xs font-bold uppercase tracking-widest">Joined {member.invitedAt ? format(member.invitedAt.toDate(), 'MMM yyyy') : 'Recently'}</span>
                            </div>
                        </div>

                        <button className="w-full mt-10 py-4 bg-primary-600 hover:bg-primary-500 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl shadow-primary-600/20">
                            Edit Permissions
                        </button>
                    </div>

                    <div className="bg-dark-800/40 border border-white/5 rounded-[3rem] p-8 backdrop-blur-md">
                        <h3 className="text-xs font-black text-white uppercase tracking-widest mb-6">Performance Index</h3>
                        <div className="space-y-6">
                            {[
                                { label: 'Reliability', value: 94 },
                                { label: 'Speed', value: 88 },
                                { label: 'Quality', value: 92 },
                            ].map((p, i) => (
                                <div key={i}>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[10px] font-black text-slate-500 uppercase">{p.label}</span>
                                        <span className="text-[10px] font-black text-white">{p.value}%</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-dark-900 rounded-full border border-white/5 overflow-hidden">
                                        <div className="h-full bg-primary-500" style={{ width: `${p.value}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Activity & Logs */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Key Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { label: 'Work Streak', value: `${stats.streak} Days`, icon: Flame, color: 'text-orange-500' },
                            { label: 'Avg Pulse', value: stats.avgCheckIn, icon: Clock, color: 'text-primary-500' },
                            { label: 'Total Output', value: `${stats.totalHours}h`, icon: CheckCircle2, color: 'text-emerald-500' },
                        ].map((s, i) => (
                            <div key={i} className="bg-dark-800/40 border border-white/5 p-6 rounded-[2.5rem] backdrop-blur-sm">
                                <div className="flex items-center gap-3 mb-2">
                                    <s.icon size={14} className={s.color} />
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{s.label}</span>
                                </div>
                                <h4 className="text-xl font-black text-white uppercase tracking-tight">{s.value}</h4>
                            </div>
                        ))}
                    </div>

                    {/* Timeline Log */}
                    <div className="bg-dark-800/40 border border-white/5 rounded-[3rem] p-8 backdrop-blur-md">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-xl font-black text-white uppercase tracking-tight">Access Ledger</h3>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Chronological security & work logs</p>
                            </div>
                            <button className="p-3 bg-dark-900 border border-white/5 rounded-2xl text-slate-400 hover:text-white transition-colors">
                                <Download size={18} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {logs.map((log) => (
                                <div key={log.id} className="flex items-center justify-between p-5 bg-dark-900/40 border border-white/5 rounded-3xl hover:bg-dark-900/80 transition-all group">
                                    <div className="flex items-center gap-5">
                                        <div className={`p-3 rounded-2xl ${
                                            log.type === 'check-in' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                                        } border border-white/5 group-hover:scale-110 transition-transform`}>
                                            <Clock size={16} />
                                        </div>
                                        <div>
                                            <h5 className="text-sm font-black text-white uppercase tracking-tight">
                                                {log.type === 'check-in' ? 'System Access Logged' : 'Session Termination'}
                                            </h5>
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-0.5">
                                                Verified at {format(new Date(log.timestamp), 'MMM dd, HH:mm:ss')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        {log.duration && (
                                            <span className="text-xs font-black text-slate-400 uppercase tracking-[0.1em]">
                                                {Math.floor(log.duration / 60)}h {log.duration % 60}m
                                            </span>
                                        )}
                                        {!log.duration && <ArrowUpRight size={16} className="text-slate-600" />}
                                    </div>
                                </div>
                            ))}
                            {logs.length === 0 && (
                                <div className="py-20 text-center">
                                    <AlertCircle size={40} className="text-dark-700 mx-auto mb-4" />
                                    <p className="text-slate-600 font-bold uppercase tracking-widest text-xs">No ledger records found for this entity</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
