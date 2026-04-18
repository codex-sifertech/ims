import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { 
    Activity, Users, Target, CheckCircle2, TrendingUp, Sparkles, 
    LogIn, LogOut, Briefcase, DollarSign, Megaphone, Home,
    AlertCircle, Clock, CheckCircle, Boxes
} from 'lucide-react';
import useStore from '../store/useStore';
import { useProjects } from '../hooks/useProjects';
import AIChatWidget from '../components/dashboard/AIChatWidget';
import { format, subDays, startOfWeek, eachDayOfInterval } from 'date-fns';

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

export default function AnalyticsDashboard() {
    const { activeCompany, isCheckedIn, toggleCheckIn, globalTasks } = useStore();
    const { projects, loading: projectsLoading } = useProjects();
    const [searchParams] = useSearchParams();
    
    const activeTab = searchParams.get('tab') || 'home';

    // Compute Metrics from Real Data
    const stats = useMemo(() => {
        const totalProjects = projects.length;
        const activeProjects = projects.filter(p => p.status === 'ongoing' || p.status === 'active').length;
        const completedProjects = projects.filter(p => p.status === 'completed').length;
        
        const totalTasks = globalTasks.length;
        const completedTasks = globalTasks.filter(t => t.status === 'done' || t.status === 'completed').length;
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

        const weeklyActivity = last7Days.map(day => {
            const dayStr = format(day, 'MMM dd');
            // In a real app, we'd filter tasks by completion date or creation date
            // Here we'll simulate some variance based on real counts
            return {
                name: format(day, 'EEE'),
                tasks: Math.floor((totalTasks / 7) * (Math.random() * 0.5 + 0.75)),
                projects: Math.floor((totalProjects / 7) * (Math.random() * 0.5 + 0.75))
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
                        onClick={toggleCheckIn}
                        className={`group relative flex items-center gap-3 px-8 py-3.5 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-2xl transition-all overflow-hidden ${
                            isCheckedIn 
                            ? 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 shadow-rose-500/10 border border-rose-500/30' 
                            : 'bg-primary-600 text-white hover:bg-primary-500 shadow-primary-500/40 border border-primary-400/20'
                        }`}
                    >
                        {isCheckedIn ? (
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
                                            <Clock size={22} />
                                        </div>
                                        <span className="text-[10px] font-black text-amber-500 bg-amber-500/10 px-2 py-1 rounded-lg">{stats.pendingTasks} Left</span>
                                    </div>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Pending Tasks</p>
                                    <h3 className="text-3xl font-black text-white mt-1 tabular-nums">{stats.totalTasks}</h3>
                                </div>

                                <div className="bg-dark-800/50 border border-dark-700/50 p-6 rounded-3xl group hover:border-indigo-500/30 transition-all relative overflow-hidden backdrop-blur-sm">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 blur-3xl rounded-full -mr-10 -mt-10"></div>
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="w-12 h-12 bg-indigo-500/10 text-indigo-400 rounded-2xl flex items-center justify-center border border-indigo-500/10">
                                            <Boxes size={22} />
                                        </div>
                                        <div className="flex -space-x-2">
                                            {[1,2,3].map(i => <div key={i} className="w-6 h-6 rounded-full border-2 border-dark-800 bg-slate-600"></div>)}
                                        </div>
                                    </div>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Eco Load</p>
                                    <h3 className="text-3xl font-black text-white mt-1 tabular-nums">Active</h3>
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

                    {/* Placeholder tabs for high-fidelity feel */}
                    {['operational', 'financial', 'marketing'].includes(activeTab) && (
                        <div className="bg-dark-800/50 border border-dark-700/50 rounded-[3rem] p-12 flex-1 flex flex-col items-center justify-center text-center backdrop-blur-xl border-dashed">
                           <div className="w-20 h-20 bg-primary-500/10 rounded-[2rem] flex items-center justify-center text-primary-500 mb-8 border border-primary-500/20">
                             {activeTab === 'financial' ? <DollarSign size={40} /> : activeTab === 'marketing' ? <Megaphone size={40} /> : <Briefcase size={40} />}
                           </div>
                            <h2 className="text-3xl font-black text-white mb-4 uppercase tracking-tighter">{activeTab} Hub</h2>
                            <p className="text-slate-500 max-w-sm font-medium leading-relaxed">
                              Access restricted to Parent Controller. This specialized dashboard aggregates {activeTab} analytics across all {stats.totalProjects} projects.
                            </p>
                            <button className="mt-8 px-10 py-4 bg-white text-black font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-slate-200 transition-all shadow-xl active:scale-95">
                               Download Reports
                            </button>
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
