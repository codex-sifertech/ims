import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTimeTracker } from '../hooks/useTimeTracker';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { 
    Activity, Users, Target, CheckCircle2, TrendingUp, Sparkles, 
    LogIn, LogOut, Briefcase, DollarSign, Megaphone, Home,
    AlertCircle, Clock, CheckCircle, Boxes, UserCircle2
} from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import useStore from '../store/useStore';
import { useProjects } from '../hooks/useProjects';
import AIChatWidget from '../components/dashboard/AIChatWidget';
import { format, subDays, startOfWeek, eachDayOfInterval } from 'date-fns';


const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

export default function AnalyticsDashboard() {
    const { activeCompany, globalTasks } = useStore();
    const { isCheckedIn, toggleCheckIn } = useTimeTracker();
    const [isToggling, setIsToggling] = useState(false);
    const { projects, loading: projectsLoading } = useProjects();
    const [searchParams] = useSearchParams();
    
    const activeTab = searchParams.get('tab') || 'home';

    const [members, setMembers] = useState([]);
    const [loadingMembers, setLoadingMembers] = useState(true);

    // Fetch and sync members for Eco Load
    useEffect(() => {
        if (!activeCompany?.id) return;
        const membersRef = collection(db, 'companies', activeCompany.id, 'members');
        const unsub = onSnapshot(membersRef, (snap) => {
            setMembers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoadingMembers(false);
        });
        return () => unsub();
    }, [activeCompany?.id]);

    // Compute Metrics from Real Data
    const stats = useMemo(() => {
        const totalProjects = projects.length;
        const activeProjects = projects.filter(p => p.status === 'ongoing' || p.status === 'active').length;
        const completedProjects = projects.filter(p => p.status === 'completed').length;
        
        // Filter tasks only for the active company if they are tagged
        const companyTasks = globalTasks.filter(t => !t.companyId || t.companyId === activeCompany?.id);
        
        const totalTasks = companyTasks.length;
        const completedTasks = companyTasks.filter(t => 
            t.status?.toLowerCase() === 'done' || 
            t.status?.toLowerCase() === 'completed' ||
            t.status?.toLowerCase() === 'finished'
        ).length;
        const pendingTasks = totalTasks - completedTasks;
        
        const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        const pieData = [
            { name: 'Ongoing', value: activeProjects },
            { name: 'Completed', value: completedProjects },
            { name: 'Urgent', value: projects.filter(p => p.status === 'urgent').length }
        ].filter(d => d.value > 0);

        // Weekly Activity Data (Mocking daily task counts based on globalTasks createdDates)
        const last7Days = eachDayOfInterval({
            start: subDays(new Date(), 6),
            end: new Date()
        });

        const weeklyActivity = last7Days.map((day, idx) => {
            const dayStr = format(day, 'MMM dd');
            // Use deterministic distribution based on index to avoid flickering
            const weight = [0.6, 0.75, 0.9, 1.0, 1.1, 0.85, 0.7][idx] ?? 1;
            return {
                name: format(day, 'EEE'),
                tasks: Math.floor((totalTasks / 7) * weight),
                projects: Math.floor((totalProjects / 7) * weight)
            };
        });

        return { 
            totalProjects, 
            activeProjects, 
            completedProjects, 
            totalTasks, 
            completedTasks, 
            pendingTasks, 
            taskCompletionRate,
            pieData,
            weeklyActivity 
        };
    }, [projects, globalTasks]);

    return (
        <div className="h-full flex flex-col p-8 overflow-y-auto bg-dark-900 w-full custom-scrollbar">
            <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6 shrink-0">
                <div className="relative">
                    <div className="absolute -left-4 top-0 w-1 h-full bg-gradient-to-b from-primary-500 to-transparent rounded-full"></div>
                    <h1 className="text-3xl font-black text-white tracking-tighter uppercase">Parent Controller</h1>
                    <p className="text-slate-500 mt-1 font-medium flex items-center gap-2">
                        <Activity size={14} className="text-emerald-500" /> 
                        Monitoring <span className="text-slate-300">@{activeCompany?.name || 'Workspace'}</span> in real-time
                    </p>
                </div>
                
                <div className="flex items-center gap-4">
                    <div className="hidden lg:flex flex-col items-end mr-2">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">System Status</span>
                        <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                            Operational
                        </div>
                    </div>
                    <button
                        onClick={async () => {
                            if (isToggling) return;
                            setIsToggling(true);
                            try { await toggleCheckIn(); } finally { setIsToggling(false); }
                        }}
                        disabled={isToggling}
                        className={`group relative flex items-center gap-3 px-8 py-3.5 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-2xl transition-all overflow-hidden disabled:opacity-50 ${
                            isCheckedIn
                            ? 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 shadow-rose-500/10 border border-rose-500/30'
                            : 'bg-primary-600 text-white hover:bg-primary-500 shadow-primary-500/40 border border-primary-400/20'
                        }`}
                    >
                        {isToggling ? (
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : isCheckedIn ? (
                            <><LogOut size={18} /> Finish Shift</>
                        ) : (
                            <><LogIn size={18} /> Initialize Session</>
                        )}
                        <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform"></div>
                    </button>
                </div>
            </header>

            <div className="flex flex-col xl:flex-row gap-8">
                <div className="flex-[3] flex flex-col gap-8">
                    
                    {activeTab === 'home' && (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {/* Metric Cards */}
                                <div className="bg-dark-800/50 border border-dark-700/50 p-6 rounded-3xl group hover:border-primary-500/30 transition-all relative overflow-hidden backdrop-blur-sm">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary-500/5 blur-3xl rounded-full -mr-10 -mt-10"></div>
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="w-12 h-12 bg-primary-500/10 text-primary-400 rounded-2xl flex items-center justify-center border border-primary-500/10">
                                            <Briefcase size={22} />
                                        </div>
                                        <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg">+12%</span>
                                    </div>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total Projects</p>
                                    <h3 className="text-3xl font-black text-white mt-1 tabular-nums">{stats.totalProjects}</h3>
                                </div>

                                <div className="bg-dark-800/50 border border-dark-700/50 p-6 rounded-3xl group hover:border-emerald-500/30 transition-all relative overflow-hidden backdrop-blur-sm">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 blur-3xl rounded-full -mr-10 -mt-10"></div>
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center border border-emerald-500/10">
                                            <CheckCircle size={22} />
                                        </div>
                                        <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg">{stats.taskCompletionRate}%</span>
                                    </div>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Task Success</p>
                                    <h3 className="text-3xl font-black text-white mt-1 tabular-nums">{stats.completedTasks}</h3>
                                </div>

                                <div className="bg-dark-800/50 border border-dark-700/50 p-6 rounded-3xl group hover:border-amber-500/30 transition-all relative overflow-hidden backdrop-blur-sm">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 blur-3xl rounded-full -mr-10 -mt-10"></div>
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="w-12 h-12 bg-amber-500/10 text-amber-400 rounded-2xl flex items-center justify-center border border-amber-500/10">
                                            <AlertCircle size={22} />
                                        </div>
                                        <span className="text-[10px] font-black text-rose-500 bg-rose-500/10 px-2 py-1 rounded-lg">High</span>
                                    </div>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Pending Tasks</p>
                                    <h3 className="text-3xl font-black text-white mt-1 tabular-nums">{stats.pendingTasks}</h3>
                                </div>

                                <div className="bg-dark-800/50 border border-dark-700/50 p-6 rounded-3xl group hover:border-blue-500/30 transition-all relative overflow-hidden backdrop-blur-sm">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 blur-3xl rounded-full -mr-10 -mt-10"></div>
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="w-12 h-12 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center border border-blue-500/10">
                                            <Users size={22} />
                                        </div>
                                        <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg">Active</span>
                                    </div>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Active Members</p>
                                    <h3 className="text-3xl font-black text-white mt-1 tabular-nums">{members.filter(m => m.status === 'active' || m.isCheckedIn).length}</h3>
                                </div>
                            </div>

                            {/* Eco Load Card */}
                            <div className="bg-dark-800/40 border border-white/5 rounded-[3rem] p-8 backdrop-blur-md">
                                <div className="flex items-center justify-between mb-8">
                                    <div>
                                        <h3 className="text-xl font-black text-white uppercase tracking-tight">Eco Load</h3>
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Real-time status & presence</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">
                                            {members.filter(m => m.status === 'active' || m.isCheckedIn).length} Online
                                        </span>
                                    </div>
                                </div>

                                <div className="flex -space-x-4 mb-8">
                                    {members.slice(0, 5).map((m) => (
                                        <div key={m.id} className={`w-12 h-12 rounded-2xl bg-dark-700 border-2 border-dark-800 flex items-center justify-center overflow-hidden transition-transform hover:-translate-y-1 relative group/member`}>
                                            {m.photoURL ? (
                                                <img src={m.photoURL} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-500">
                                                    <UserCircle2 size={24} />
                                                </div>
                                            )}
                                            {/* Status Dot */}
                                            <div className={`absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full border-2 border-dark-900 ${
                                                (m.status === 'active' || m.isCheckedIn) ? 'bg-emerald-500' : 'bg-slate-600'
                                            }`} />
                                            
                                            {/* Tooltip */}
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-dark-950 border border-white/10 rounded-xl opacity-0 group-hover/member:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                                                <p className="text-[10px] font-black text-white uppercase">{m.name || 'Anonymous'}</p>
                                                <p className="text-[8px] font-bold text-slate-500 uppercase tracking-[0.1em]">{m.role || 'Member'}</p>
                                            </div>
                                        </div>
                                    ))}
                                    {members.length > 5 && (
                                        <div className="w-12 h-12 rounded-2xl bg-primary-500/10 border-2 border-dark-800 flex items-center justify-center text-primary-500 text-[10px] font-black">
                                            +{members.length - 5}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Main Charts area */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-2 bg-dark-800/40 border border-dark-700/50 rounded-[2.5rem] p-8 backdrop-blur-md">
                                    <div className="flex justify-between items-center mb-10">
                                        <div>
                                            <h2 className="text-xl font-black text-white tracking-tight">Ecosystem Velocity</h2>
                                            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Activity across projects and tasks</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center gap-1.5 px-3 py-1 bg-primary-500/10 rounded-full border border-primary-500/20">
                                                <div className="w-1.5 h-1.5 rounded-full bg-primary-500"></div>
                                                <span className="text-[10px] font-black text-primary-400">TASKS</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="w-full h-[300px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={stats.weeklyActivity}>
                                                <defs>
                                                    <linearGradient id="colorMain" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                                <XAxis 
                                                    dataKey="name" 
                                                    stroke="#475569" 
                                                    fontSize={10} 
                                                    fontWeight="bold"
                                                    tickLine={false} 
                                                    axisLine={false} 
                                                    dy={10}
                                                />
                                                <YAxis stroke="#475569" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px' }}
                                                    itemStyle={{ color: '#fff' }}
                                                />
                                                <Area 
                                                    type="monotone" 
                                                    dataKey="tasks" 
                                                    stroke="#8b5cf6" 
                                                    strokeWidth={4} 
                                                    fillOpacity={1} 
                                                    fill="url(#colorMain)" 
                                                    animationDuration={2000}
                                                />
                                                <Area 
                                                    type="monotone" 
                                                    dataKey="projects" 
                                                    stroke="#3b82f6" 
                                                    strokeWidth={2} 
                                                    fill="transparent"
                                                    strokeDasharray="5 5"
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                <div className="bg-dark-800/40 border border-dark-700/50 rounded-[2.5rem] p-8 backdrop-blur-md flex flex-col">
                                    <h2 className="text-xl font-black text-white tracking-tight mb-2">Health Matrix</h2>
                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-10">Project status allocation</p>
                                    
                                    <div className="flex-1 flex flex-col items-center justify-center relative">
                                        <div className="w-full h-[220px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={stats.pieData}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={70}
                                                        outerRadius={90}
                                                        paddingAngle={8}
                                                        dataKey="value"
                                                        stroke="none"
                                                    >
                                                        {stats.pieData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip
                                                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                                                    />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                                            <p className="text-xs font-black text-slate-500 uppercase">Load</p>
                                            <h4 className="text-3xl font-black text-white">{stats.totalProjects}</h4>
                                        </div>

                                        <div className="w-full mt-8 grid grid-cols-2 gap-4">
                                            {stats.pieData.map((d, i) => (
                                                <div key={i} className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                                                    <span className="text-[10px] font-black text-slate-400 uppercase truncate">{d.name} ({d.value})</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>


                        </>
                    )}

                    {activeTab === 'operational' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                                {[
                                    { title: 'Total Orders', value: `${stats.totalTasks}`, change: '+8.2%', color: 'primary', icon: <Boxes size={22} /> },
                                    { title: 'Active Pipelines', value: `${stats.activeProjects}`, change: '+3.1%', color: 'emerald', icon: <TrendingUp size={22} /> },
                                    { title: 'Completion Rate', value: `${stats.taskCompletionRate}%`, change: '+5.4%', color: 'blue', icon: <CheckCircle size={22} /> },
                                    { title: 'Team Load', value: `${members.length}`, change: 'Optimal', color: 'amber', icon: <Users size={22} /> },
                                ].map((card, i) => (
                                    <div key={i} className="bg-dark-800/50 border border-dark-700/50 p-5 rounded-3xl relative overflow-hidden backdrop-blur-sm hover:border-white/10 transition-all">
                                        <div className={`absolute top-0 right-0 w-20 h-20 bg-${card.color}-500/5 blur-3xl rounded-full -mr-8 -mt-8`} />
                                        <div className="flex items-center justify-between mb-3">
                                            <div className={`w-10 h-10 bg-${card.color}-500/10 text-${card.color}-400 rounded-2xl flex items-center justify-center border border-${card.color}-500/10`}>{card.icon}</div>
                                            <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-lg">{card.change}</span>
                                        </div>
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{card.title}</p>
                                        <h3 className="text-2xl font-black text-white mt-0.5 tabular-nums">{card.value}</h3>
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                                {/* Timeline */}
                                <div className="lg:col-span-2 bg-dark-800/40 border border-dark-700/50 rounded-3xl p-6 backdrop-blur-md">
                                    <div className="flex justify-between items-center mb-6">
                                        <div>
                                            <h3 className="text-lg font-black text-white">Operations Timeline</h3>
                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Weekly throughput analysis</p>
                                        </div>
                                    </div>
                                    <div className="w-full h-[250px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={stats.weeklyActivity}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                                <XAxis dataKey="name" stroke="#475569" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} />
                                                <YAxis stroke="#475569" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} />
                                                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px' }} />
                                                <Bar dataKey="tasks" fill="#8b5cf6" radius={[8,8,0,0]} barSize={28} />
                                                <Bar dataKey="projects" fill="#3b82f6" radius={[8,8,0,0]} barSize={28} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Progress */}
                                <div className="bg-dark-800/40 border border-dark-700/50 rounded-3xl p-6 backdrop-blur-md">
                                    <h3 className="text-lg font-black text-white mb-1">Progress</h3>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-6">Deals & deliverables</p>
                                    <div className="space-y-6">
                                        {[
                                            { label: 'Tasks Completed', pct: stats.taskCompletionRate, color: '#8b5cf6' },
                                            { label: 'Projects Active', pct: stats.totalProjects > 0 ? Math.round((stats.activeProjects / stats.totalProjects) * 100) : 0, color: '#3b82f6' },
                                            { label: 'Team Utilization', pct: 78, color: '#10b981' },
                                        ].map((item, i) => (
                                            <div key={i}>
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-xs font-bold text-slate-400">{item.label}</span>
                                                    <span className="text-xs font-black text-white">{item.pct}%</span>
                                                </div>
                                                <div className="w-full h-2 bg-dark-900 rounded-full overflow-hidden">
                                                    <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${item.pct}%`, backgroundColor: item.color }} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-8 p-4 bg-dark-900/60 rounded-2xl border border-white/5 text-center">
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Overall Score</p>
                                        <p className="text-3xl font-black text-white">{Math.round((stats.taskCompletionRate + 78) / 2)}%</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'financial' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                                {[
                                    { title: "Today's Revenue", value: '₹30,254', change: '+2.14%', icon: <DollarSign size={22} /> },
                                    { title: 'Pending Invoices', value: `${stats.pendingTasks}`, change: 'Due', icon: <Clock size={22} /> },
                                    { title: 'Closed Deals', value: `${stats.completedTasks}`, change: `${stats.taskCompletionRate}%`, icon: <CheckCircle size={22} /> },
                                    { title: 'Active Contracts', value: `${stats.activeProjects}`, change: '+3', icon: <Briefcase size={22} /> },
                                ].map((card, i) => (
                                    <div key={i} className="bg-dark-800/50 border border-dark-700/50 p-5 rounded-3xl relative overflow-hidden backdrop-blur-sm hover:border-white/10 transition-all">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="w-10 h-10 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center border border-emerald-500/10">{card.icon}</div>
                                            <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-lg">{card.change}</span>
                                        </div>
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{card.title}</p>
                                        <h3 className="text-2xl font-black text-white mt-0.5 tabular-nums">{card.value}</h3>
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                                <div className="lg:col-span-2 bg-dark-800/40 border border-dark-700/50 rounded-3xl p-6 backdrop-blur-md">
                                    <h3 className="text-lg font-black text-white mb-1">Revenue Trend</h3>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-6">Last 7 days vs previous week</p>
                                    <div className="w-full h-[250px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={stats.weeklyActivity}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                                <XAxis dataKey="name" stroke="#475569" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} />
                                                <YAxis stroke="#475569" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} />
                                                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px' }} />
                                                <Line type="monotone" dataKey="tasks" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} name="This Week" />
                                                <Line type="monotone" dataKey="projects" stroke="#6366f1" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Last Week" />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                <div className="bg-dark-800/40 border border-dark-700/50 rounded-3xl p-6 backdrop-blur-md flex flex-col">
                                    <h3 className="text-lg font-black text-white mb-1">Revenue Summary</h3>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-6">Total earnings</p>
                                    <div className="flex-1 flex flex-col items-center justify-center gap-4">
                                        <div className="w-32 h-32 rounded-full border-[8px] border-emerald-500/20 flex items-center justify-center relative">
                                            <div className="absolute inset-0 rounded-full border-[8px] border-transparent border-t-emerald-500 border-r-emerald-500" style={{ transform: `rotate(${stats.taskCompletionRate * 3.6}deg)` }} />
                                            <div className="text-center">
                                                <p className="text-2xl font-black text-white">87%</p>
                                                <p className="text-[8px] font-bold text-slate-500 uppercase">Target</p>
                                            </div>
                                        </div>
                                        <div className="text-center p-4 bg-dark-900/60 rounded-2xl border border-white/5 w-full">
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Revenue</p>
                                            <p className="text-2xl font-black text-emerald-400 mt-1">₹12,03,500</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Deal list */}
                            <div className="bg-dark-800/40 border border-dark-700/50 rounded-3xl p-6 backdrop-blur-md">
                                <h3 className="text-lg font-black text-white mb-4">Recent Deals</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {['Alpha Corp - ₹2,50,000','Beta Systems - ₹1,80,000','Gamma Tech - ₹3,20,000','Delta Inc - ₹95,000'].map((deal, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 bg-dark-900/60 rounded-xl border border-white/5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 text-xs font-black">{i+1}</div>
                                                <span className="text-sm font-bold text-white">{deal.split(' - ')[0]}</span>
                                            </div>
                                            <span className="text-sm font-black text-emerald-400">{deal.split(' - ')[1]}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'marketing' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                                {[
                                    { title: 'Campaigns Active', value: `${stats.activeProjects}`, change: '+12%', icon: <Megaphone size={22} /> },
                                    { title: 'Leads Generated', value: '2,565+', change: '+481 new', icon: <Users size={22} /> },
                                    { title: 'Conversion Rate', value: '14.8%', change: '+2.3%', icon: <Target size={22} /> },
                                    { title: 'Engagement', value: '89%', change: 'High', icon: <Activity size={22} /> },
                                ].map((card, i) => (
                                    <div key={i} className="bg-dark-800/50 border border-dark-700/50 p-5 rounded-3xl relative overflow-hidden backdrop-blur-sm hover:border-white/10 transition-all">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="w-10 h-10 bg-pink-500/10 text-pink-400 rounded-2xl flex items-center justify-center border border-pink-500/10">{card.icon}</div>
                                            <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-lg">{card.change}</span>
                                        </div>
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{card.title}</p>
                                        <h3 className="text-2xl font-black text-white mt-0.5 tabular-nums">{card.value}</h3>
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                                <div className="lg:col-span-2 bg-dark-800/40 border border-dark-700/50 rounded-3xl p-6 backdrop-blur-md">
                                    <h3 className="text-lg font-black text-white mb-1">Campaign Performance</h3>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-6">Weekly reach & engagement</p>
                                    <div className="w-full h-[250px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={stats.weeklyActivity}>
                                                <defs>
                                                    <linearGradient id="colorMkt" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#ec4899" stopOpacity={0.2} />
                                                        <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                                <XAxis dataKey="name" stroke="#475569" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} />
                                                <YAxis stroke="#475569" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} />
                                                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px' }} />
                                                <Area type="monotone" dataKey="tasks" stroke="#ec4899" strokeWidth={3} fillOpacity={1} fill="url(#colorMkt)" name="Reach" />
                                                <Area type="monotone" dataKey="projects" stroke="#f59e0b" strokeWidth={2} fill="transparent" strokeDasharray="5 5" name="Engagement" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                <div className="bg-dark-800/40 border border-dark-700/50 rounded-3xl p-6 backdrop-blur-md flex flex-col">
                                    <h3 className="text-lg font-black text-white mb-1">Funnel</h3>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-6">Lead conversion pipeline</p>
                                    <div className="flex-1 space-y-3">
                                        {[
                                            { label: 'Contacted', value: 430, pct: 100, color: '#8b5cf6' },
                                            { label: 'Negotiation', value: 285, pct: 66, color: '#3b82f6' },
                                            { label: 'Offer Sent', value: 164, pct: 38, color: '#f59e0b' },
                                            { label: 'Deal Closed', value: 89, pct: 21, color: '#10b981' },
                                        ].map((stage, i) => (
                                            <div key={i} className="bg-dark-900/60 rounded-xl p-3 border border-white/5">
                                                <div className="flex justify-between items-center mb-1.5">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stage.label}</span>
                                                    <span className="text-xs font-black text-white">{stage.value}</span>
                                                </div>
                                                <div className="w-full h-1.5 bg-dark-800 rounded-full overflow-hidden">
                                                    <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${stage.pct}%`, backgroundColor: stage.color }} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                </div>

                {/* AI Chatbot Sidebar Widget */}
                {activeTab === 'home' && (
                    <div className="bg-dark-800 border border-dark-700/50 rounded-[2.5rem] overflow-hidden flex flex-col w-full xl:w-[380px] shrink-0 self-start xl:sticky top-8 shadow-2xl backdrop-blur-lg">
                        <div className="bg-gradient-to-r from-primary-900/30 to-indigo-900/30 border-b border-white/5 p-8 flex items-center gap-4">
                            <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-primary-500/40 relative">
                                <Sparkles size={28} />
                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 border-4 border-dark-800 rounded-full"></div>
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-white tracking-tight uppercase">Mammu AI</h2>
                                <div className="flex items-center gap-1.5 text-xs text-primary-400 font-bold uppercase tracking-widest">
                                    System Analyst 
                                    <div className="w-1 h-1 rounded-full bg-primary-500/50"></div>
                                    Online
                                </div>
                            </div>
                        </div>

                        <div className="p-2 flex-1">
                            <AIChatWidget projectStats={{ ...stats, activeCompany }} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
