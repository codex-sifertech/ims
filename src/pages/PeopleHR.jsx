import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Users, 
    ArrowUpRight, 
    ArrowDownRight, 
    Clock, 
    Calendar, 
    Search, 
    Filter, 
    MoreVertical, 
    Flame, 
    CheckCircle2,
    XCircle,
    UserCircle2,
    Timer,
    Zap,
    Trophy
} from 'lucide-react';
import { collection, onSnapshot, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import useStore from '../store/useStore';
import { format, isToday, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';

export default function PeopleHR() {
    const navigate = useNavigate();
    const { activeCompany } = useStore();
    const [members, setMembers] = useState([]);
    const [attendance, setAttendance] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (!activeCompany?.id) return;

        // 1. Fetch Members
        const membersRef = collection(db, 'companies', activeCompany.id, 'members');
        const unsubMembers = onSnapshot(membersRef, (snap) => {
            const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setMembers(data);
        });

        // 2. Fetch Attendance (Current Month)
        const start = startOfMonth(new Date());
        const end = endOfMonth(new Date());
        const attendanceRef = collection(db, 'companies', activeCompany.id, 'attendance');
        const attendanceQuery = query(
            attendanceRef,
            where('timestamp', '>=', start.toISOString()),
            where('timestamp', '<=', end.toISOString())
        );

        const unsubAttendance = onSnapshot(attendanceQuery, (snap) => {
            const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setAttendance(data);
            setLoading(false);
        });

        return () => {
            unsubMembers();
            unsubAttendance();
        };
    }, [activeCompany?.id]);

    const memberStats = useMemo(() => {
        return members.map(member => {
            const memberLogs = attendance.filter(log => log.userId === member.id);
            const todayLogs = memberLogs
                .filter(log => isToday(new Date(log.timestamp)))
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            const latestLogToday = todayLogs[0];
            
            // Calculate Current Streak (Simplified: consecutive days with at least one log in the last 30 days)
            let streak = 0;
            const now = new Date();
            for (let i = 0; i < 30; i++) {
                const checkDate = new Date(now);
                checkDate.setDate(now.getDate() - i);
                const hasLog = memberLogs.some(log => isSameDay(new Date(log.timestamp), checkDate));
                if (hasLog) streak++;
                else if (i > 0) break; // Break streak if missing a day
            }

            // Total Hours this Month
            const totalMinutes = memberLogs.reduce((acc, curr) => acc + (curr.duration || 0), 0);
            const hours = (totalMinutes / 60).toFixed(1);

            return {
                ...member,
                streak,
                hours,
                status: latestLogToday ? (latestLogToday.type === 'check-in' ? 'active' : 'checked-out') : 'offline',
                lastSeen: memberLogs.length > 0 ? format(new Date(memberLogs[0].timestamp), 'MMM dd, HH:mm') : 'Never'
            };
        });
    }, [members, attendance]);

    // Aggregate Company Stats
    const companyStats = useMemo(() => {
        if (!memberStats.length) return { avgHours: 0, highStreak: 0, retention: 0 };
        
        const totalHours = memberStats.reduce((acc, m) => acc + parseFloat(m.hours), 0);
        const avgHours = (totalHours / memberStats.length).toFixed(1);
        const highStreak = Math.max(...memberStats.map(m => m.streak));
        
        const activeThisMonth = memberStats.filter(m => parseFloat(m.hours) > 0).length;
        const retention = ((activeThisMonth / members.length) * 100).toFixed(0);

        return { avgHours, highStreak, retention };
    }, [memberStats, members.length]);

    const filteredMembers = useMemo(() => {
        if (!searchQuery) return memberStats;
        const q = searchQuery.toLowerCase();
        return memberStats.filter(m => 
            m.name?.toLowerCase().includes(q) || 
            m.email?.toLowerCase().includes(q) || 
            m.role?.toLowerCase().includes(q)
        );
    }, [memberStats, searchQuery]);

    const totalActiveToday = useMemo(() => {
        return memberStats.filter(m => m.status === 'active').length;
    }, [memberStats]);

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-black uppercase tracking-widest text-[10px]">Processing Human Capital...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            {/* Header Area */}
            <div className="mb-12 flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tighter uppercase flex items-center gap-4">
                        <Users className="text-primary-500" size={40} />
                        People & HR
                    </h1>
                    <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] mt-2">Core Workforce performance & attendance matrix</p>
                </div>
                
                <div className="flex gap-4">
                    <div className="bg-dark-800/50 border border-white/5 rounded-2xl px-6 py-3 flex flex-col items-end">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Members</span>
                        <span className="text-2xl font-black text-emerald-500">{totalActiveToday} / {members.length}</span>
                    </div>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
                {[
                    { label: 'Avg Monthly Hours', value: companyStats.avgHours, icon: Timer, color: 'text-primary-500' },
                    { label: 'Company High Streak', value: `${companyStats.highStreak} Days`, icon: Flame, color: 'text-orange-500' },
                    { label: 'Retention rate', value: `${companyStats.retention}%`, icon: Zap, color: 'text-yellow-500' },
                    { label: 'Top Performer', value: [...memberStats].sort((a,b) => b.hours - a.hours)[0]?.name || 'N/A', icon: Trophy, color: 'text-purple-500' },
                ].map((stat, i) => (
                    <div key={i} className="bg-dark-800/40 border border-white/5 p-6 rounded-[2rem] backdrop-blur-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div className={`p-3 rounded-2xl bg-dark-900 border border-white/5 ${stat.color}`}>
                                <stat.icon size={20} />
                            </div>
                            <ArrowUpRight size={16} className="text-emerald-500" />
                        </div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{stat.label}</p>
                        <h3 className="text-2xl font-black text-white mt-1 uppercase truncate">{stat.value}</h3>
                    </div>
                ))}
            </div>

            {/* Members Directory */}
            <div className="bg-dark-800/40 border border-white/5 rounded-[3rem] p-8 backdrop-blur-md">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
                    <div>
                        <h2 className="text-xl font-black text-white uppercase tracking-tight">Workforce Directory</h2>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Real-time status & streak tracking</p>
                    </div>
                    
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="bg-dark-900 border border-white/5 rounded-2xl px-4 py-2.5 flex items-center gap-3 flex-1 md:w-80 transition-all focus-within:border-primary-500/50">
                            <Search className="text-slate-500" size={18} />
                            <input 
                                type="text" 
                                placeholder="Search by name, role, or ID..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="bg-transparent border-none text-white text-sm outline-none w-full placeholder:text-slate-600 font-medium"
                            />
                        </div>
                        <button className="p-2.5 bg-dark-900 border border-white/5 rounded-2xl text-slate-400 hover:text-white transition-colors">
                            <Filter size={20} />
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-separate border-spacing-y-4">
                        <thead>
                            <tr className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                                <th className="px-6 pb-2">Member Identity</th>
                                <th className="px-6 pb-2">Status</th>
                                <th className="px-6 pb-2 text-center">Streak</th>
                                <th className="px-6 pb-2">Monthly Hours</th>
                                <th className="px-6 pb-2">Last Sync</th>
                                <th className="px-6 pb-2"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredMembers.map((member) => (
                                <tr 
                                    key={member.id} 
                                    onClick={() => navigate(`/dashboard/people/${member.id}`)}
                                    className="group bg-dark-900/40 hover:bg-dark-900/80 transition-all duration-300 cursor-pointer"
                                >
                                    <td className="px-6 py-4 rounded-l-3xl border-y border-l border-white/5 group-hover:border-primary-500/20">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-dark-800 border border-white/5 flex items-center justify-center text-slate-400 overflow-hidden group-hover:border-primary-500/30 transition-colors">
                                                {member.photoURL ? (
                                                    <img src={member.photoURL} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <UserCircle2 size={24} />
                                                )}
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-black text-white group-hover:text-primary-400 transition-colors">{member.name || 'Anonymous User'}</h4>
                                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{member.role || 'Member'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 border-y border-white/5 group-hover:border-primary-500/20">
                                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest ${
                                            member.status === 'active' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                            member.status === 'checked-out' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                                            'bg-slate-500/10 text-slate-500 border-slate-500/20'
                                        }`}>
                                            <div className={`w-1.5 h-1.5 rounded-full ${
                                                member.status === 'active' ? 'bg-emerald-500' :
                                                member.status === 'checked-out' ? 'bg-amber-500' :
                                                'bg-slate-500'
                                            }`} />
                                            {member.status}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 border-y border-white/5 group-hover:border-primary-500/20 text-center">
                                        <div className="flex flex-col items-center gap-1">
                                            <div className="flex items-center gap-1.5 text-orange-500">
                                                <Flame size={16} fill={member.streak > 0 ? "currentColor" : "none"} />
                                                <span className="text-lg font-black">{member.streak}</span>
                                            </div>
                                            <span className="text-[9px] font-black text-slate-600 uppercase tracking-tighter">Day streak</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 border-y border-white/5 group-hover:border-primary-500/20">
                                        <div className="flex flex-col">
                                            <span className="text-white font-black text-lg">{member.hours}h</span>
                                            <div className="w-24 h-1.5 bg-dark-800 rounded-full mt-2 overflow-hidden border border-white/5">
                                                <div 
                                                    className="h-full bg-primary-500 rounded-full" 
                                                    style={{ width: `${Math.min((member.hours / 160) * 100, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 border-y border-white/5 group-hover:border-primary-500/20">
                                        <div className="flex items-center gap-2 text-slate-400">
                                            <Clock size={14} />
                                            <span className="text-[10px] font-black uppercase tracking-widest">{member.lastSeen}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 rounded-r-3xl border-y border-r border-white/5 group-hover:border-primary-500/20">
                                        <button className="p-2 hover:bg-dark-800 rounded-xl text-slate-500 hover:text-white transition-all">
                                            <MoreVertical size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
