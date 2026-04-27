import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Users, ArrowUpRight, Clock, Calendar, Search, Filter,
    MoreVertical, Flame, UserCircle2, Timer, Zap, Trophy,
    Download, ChevronDown, X
} from 'lucide-react';
import { collection, onSnapshot, query, where, orderBy, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebase';
import useStore from '../store/useStore';
import { format, isToday, startOfMonth, endOfMonth, isSameDay, startOfWeek, endOfWeek } from 'date-fns';

// ── Time Analytics helpers ────────────────────────────────────────────────────
function exportCSV(rows, filename) {
    const headers = ['Name','Date','Clock In','Clock Out','Duration (min)'];
    const lines = rows.map(r => [
        r.userName, r.date, r.startTime ? format(new Date(r.startTime),'HH:mm') : '-',
        r.endTime ? format(new Date(r.endTime),'HH:mm') : 'Active',
        r.durationMinutes ?? '-'
    ]);
    const csv = [headers, ...lines].map(l => l.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename;
    a.click(); URL.revokeObjectURL(url);
}

function DrillDownModal({ member, logs, onClose }) {
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const filtered = useMemo(() => {
        return logs.filter(l => {
            if (from && l.date < from) return false;
            if (to && l.date > to) return false;
            return true;
        }).sort((a,b) => (b.date||'').localeCompare(a.date||''));
    }, [logs, from, to]);
    return (
        <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="bg-dark-900 border border-dark-700 rounded-3xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
                <div className="flex items-center justify-between p-6 border-b border-dark-700">
                    <h3 className="text-lg font-black text-white uppercase tracking-tight">{member.name} — Session History</h3>
                    <button onClick={onClose} className="p-2 text-slate-500 hover:text-white rounded-lg hover:bg-dark-700"><X size={18}/></button>
                </div>
                <div className="flex items-center gap-3 px-6 py-3 border-b border-dark-700">
                    <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="bg-dark-800 border border-dark-600 rounded-lg px-3 py-1.5 text-xs text-white outline-none"/>
                    <span className="text-slate-500 text-xs">to</span>
                    <input type="date" value={to} onChange={e=>setTo(e.target.value)} className="bg-dark-800 border border-dark-600 rounded-lg px-3 py-1.5 text-xs text-white outline-none"/>
                    <button onClick={()=>exportCSV(filtered, `${member.name}_logs.csv`)} className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-500 text-white text-xs font-bold rounded-lg transition-all">
                        <Download size={12}/> Export CSV
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <table className="w-full text-xs text-left">
                        <thead className="sticky top-0 bg-dark-900 border-b border-dark-700">
                            <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                <th className="px-6 py-3">Date</th><th className="px-6 py-3">Clock In</th>
                                <th className="px-6 py-3">Clock Out</th><th className="px-6 py-3">Duration</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(l=>(
                                <tr key={l.id} className="border-b border-dark-800 hover:bg-dark-800/50">
                                    <td className="px-6 py-3 text-slate-300">{l.date||'-'}</td>
                                    <td className="px-6 py-3 text-emerald-400">{l.startTime?format(new Date(l.startTime),'HH:mm'):'-'}</td>
                                    <td className="px-6 py-3 text-amber-400">{l.endTime?format(new Date(l.endTime),'HH:mm'):<span className="text-emerald-500">Active</span>}</td>
                                    <td className="px-6 py-3 text-white font-bold">{l.durationMinutes!=null?`${l.durationMinutes}m`:'-'}</td>
                                </tr>
                            ))}
                            {filtered.length===0&&<tr><td colSpan={4} className="px-6 py-8 text-center text-slate-600">No sessions found</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default function PeopleHR() {
    const navigate = useNavigate();
    const { activeCompany, user } = useStore();
    const [members, setMembers] = useState([]);
    const [attendance, setAttendance] = useState([]);
    const [timeLogs, setTimeLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [drillMember, setDrillMember] = useState(null);

    // Determine role
    const myRole = useMemo(() => members.find(m=>m.id===user?.uid)?.role || 'member', [members, user?.uid]);
    const isAdmin = myRole === 'admin' || myRole === 'master_admin' || myRole === 'owner';

    useEffect(() => {
        if (!activeCompany?.id) return;

        const membersRef = collection(db, 'companies', activeCompany.id, 'members');
        const unsubMembers = onSnapshot(membersRef, (snap) => {
            setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        const attendanceRef = collection(db, 'companies', activeCompany.id, 'attendance');
        const start = startOfMonth(new Date()).toISOString();
        const end = endOfMonth(new Date()).toISOString();
        const attendanceQuery = query(attendanceRef, where('isoDate','>=',start), where('isoDate','<=',end), orderBy('isoDate','desc'));
        const unsubAttendance = onSnapshot(attendanceQuery, (snap) => {
            setAttendance(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        }, () => setLoading(false));

        // Fetch timeLogs (one-time, limit 200 for performance)
        const fetchTimeLogs = async () => {
            try {
                const tlRef = collection(db, 'companies', activeCompany.id, 'timeLogs');
                const tlSnap = await getDocs(query(tlRef, orderBy('date','desc'), limit(200)));
                setTimeLogs(tlSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch(e) { console.error('timeLogs fetch:', e); }
        };
        fetchTimeLogs();

        return () => { unsubMembers(); unsubAttendance(); };
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
                // Status now comes directly from the member document for real-time accuracy, 
                // but we fallback to logs if it's missing
                status: member.status || (latestLogToday ? (latestLogToday.type === 'check-in' ? 'active' : 'checked-out') : 'offline'),
                lastSeen: member.lastSeen ? format(member.lastSeen.toDate ? member.lastSeen.toDate() : new Date(member.lastSeen), 'MMM dd, HH:mm') 
                         : (memberLogs.length > 0 ? format(new Date(memberLogs[0].timestamp?.toDate ? memberLogs[0].timestamp.toDate() : memberLogs[0].isoDate || memberLogs[0].timestamp), 'MMM dd, HH:mm') : 'Never')
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

            {/* ── TIME ANALYTICS ── */}
            <div className="mt-10 bg-dark-800/40 border border-white/5 rounded-[3rem] p-8 backdrop-blur-md">
                <h2 className="text-xl font-black text-white uppercase tracking-tight mb-6 flex items-center gap-3">
                    <Timer className="text-primary-500" size={22}/> Time Analytics
                </h2>

                {isAdmin ? (
                    /* Admin view — all employees */
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-separate border-spacing-y-3">
                            <thead>
                                <tr className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                                    <th className="px-4">Name</th><th className="px-4">Role</th>
                                    <th className="px-4">This Week</th><th className="px-4">This Month</th>
                                    <th className="px-4">Last Active</th><th className="px-4">Status</th><th className="px-4"/>
                                </tr>
                            </thead>
                            <tbody>
                                {members.map(m => {
                                    const mLogs = timeLogs.filter(l => l.userId === m.id && l.durationMinutes != null);
                                    const now = new Date();
                                    const weekStart = startOfWeek(now).toISOString().split('T')[0];
                                    const monthStart = startOfMonth(now).toISOString().split('T')[0];
                                    const weekMins = mLogs.filter(l=>l.date>=weekStart).reduce((s,l)=>s+(l.durationMinutes||0),0);
                                    const monthMins = mLogs.filter(l=>l.date>=monthStart).reduce((s,l)=>s+(l.durationMinutes||0),0);
                                    const lastLog = mLogs.sort((a,b)=>(b.date||'').localeCompare(a.date||''))[0];
                                    return (
                                        <tr key={m.id} className="bg-dark-900/40 hover:bg-dark-900/70 transition-all cursor-pointer group" onClick={()=>setDrillMember(m)}>
                                            <td className="px-4 py-3 rounded-l-2xl border-y border-l border-white/5 group-hover:border-primary-500/20">
                                                <span className="font-bold text-white text-sm">{m.name||'Unknown'}</span>
                                            </td>
                                            <td className="px-4 py-3 border-y border-white/5 group-hover:border-primary-500/20">
                                                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">{m.role}</span>
                                            </td>
                                            <td className="px-4 py-3 border-y border-white/5 group-hover:border-primary-500/20">
                                                <span className="font-black text-white">{(weekMins/60).toFixed(1)}h</span>
                                            </td>
                                            <td className="px-4 py-3 border-y border-white/5 group-hover:border-primary-500/20">
                                                <span className="font-black text-white">{(monthMins/60).toFixed(1)}h</span>
                                            </td>
                                            <td className="px-4 py-3 border-y border-white/5 group-hover:border-primary-500/20">
                                                <span className="text-xs text-slate-400">{lastLog?.date||'Never'}</span>
                                            </td>
                                            <td className="px-4 py-3 border-y border-white/5 group-hover:border-primary-500/20">
                                                <span className={`text-[10px] px-2 py-1 rounded-full font-black uppercase ${m.status==='active'?'bg-emerald-500/10 text-emerald-400':'bg-slate-500/10 text-slate-400'}`}>{m.status||'offline'}</span>
                                            </td>
                                            <td className="px-4 py-3 rounded-r-2xl border-y border-r border-white/5 group-hover:border-primary-500/20">
                                                <ChevronDown size={14} className="text-slate-500 -rotate-90"/>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    /* Member view — own stats */
                    (() => {
                        const myLogs = timeLogs.filter(l => l.userId === user?.uid && l.durationMinutes != null);
                        const now = new Date();
                        const weekStart = startOfWeek(now).toISOString().split('T')[0];
                        const monthStart = startOfMonth(now).toISOString().split('T')[0];
                        const weekMins = myLogs.filter(l=>l.date>=weekStart).reduce((s,l)=>s+(l.durationMinutes||0),0);
                        const monthMins = myLogs.filter(l=>l.date>=monthStart).reduce((s,l)=>s+(l.durationMinutes||0),0);
                        return (
                            <div>
                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    {[{label:'Hours This Week', val:`${(weekMins/60).toFixed(1)}h`},{label:'Hours This Month', val:`${(monthMins/60).toFixed(1)}h`}].map(s=>(
                                        <div key={s.label} className="bg-dark-900/60 border border-white/5 rounded-2xl p-5">
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{s.label}</p>
                                            <p className="text-3xl font-black text-white mt-1">{s.val}</p>
                                        </div>
                                    ))}
                                </div>
                                <table className="w-full text-xs text-left">
                                    <thead><tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-dark-700">
                                        <th className="px-3 pb-2">Date</th><th className="px-3 pb-2">Clock In</th><th className="px-3 pb-2">Clock Out</th><th className="px-3 pb-2">Duration</th>
                                    </tr></thead>
                                    <tbody>
                                        {myLogs.sort((a,b)=>(b.date||'').localeCompare(a.date||'')).slice(0,20).map(l=>(
                                            <tr key={l.id} className="border-b border-dark-800 hover:bg-dark-800/50">
                                                <td className="px-3 py-2.5 text-slate-300">{l.date}</td>
                                                <td className="px-3 py-2.5 text-emerald-400">{l.startTime?format(new Date(l.startTime),'HH:mm'):'-'}</td>
                                                <td className="px-3 py-2.5 text-amber-400">{l.endTime?format(new Date(l.endTime),'HH:mm'):'Active'}</td>
                                                <td className="px-3 py-2.5 font-bold text-white">{l.durationMinutes!=null?`${l.durationMinutes}m`:'-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        );
                    })()
                )}
            </div>

            {drillMember && (
                <DrillDownModal
                    member={drillMember}
                    logs={timeLogs.filter(l=>l.userId===drillMember.id)}
                    onClose={()=>setDrillMember(null)}
                />
            )}
        </div>
    );
}
