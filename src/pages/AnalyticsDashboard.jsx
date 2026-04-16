import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { Activity, Users, Target, CheckCircle2, TrendingUp, Sparkles, LogIn, LogOut, Briefcase, DollarSign, Megaphone, Home } from 'lucide-react';
import useStore from '../store/useStore';
import { useSharedProjects } from '../hooks/useSharedProjects';
import AIChatWidget from '../components/dashboard/AIChatWidget';

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

export default function AnalyticsDashboard() {
    const { activeCompany, isCheckedIn, toggleCheckIn } = useStore();
    const { columns: projectCols } = useSharedProjects();
    const [searchParams] = useSearchParams();
    
    const activeTab = searchParams.get('tab') || 'home';

    // Compute Metrics from Firestore Data
    const projectStats = useMemo(() => {
        let total = 0;
        let completed = 0;
        let ongoing = 0;
        const pieData = [];

        projectCols.forEach(col => {
            const count = col.cards?.length || 0;
            total += count;
            if (col.id === 'completed') completed += count;
            if (col.id === 'ongoing') ongoing += count;

            if (count > 0) {
                pieData.push({ name: col.title, value: count });
            }
        });

        return { total, completed, ongoing, pieData };
    }, [projectCols]);

    const activityData = [
        { name: 'Mon', tasks: 4, projects: 1 },
        { name: 'Tue', tasks: 7, projects: 2 },
        { name: 'Wed', tasks: 5, projects: 2 },
        { name: 'Thu', tasks: 12, projects: 4 },
        { name: 'Fri', tasks: 9, projects: 3 },
        { name: 'Sat', tasks: 3, projects: 1 },
        { name: 'Sun', tasks: projectStats.total + 2, projects: projectStats.ongoing },
    ];

    return (
        <div className="h-full flex flex-col p-6 overflow-y-auto bg-dark-900 w-full">
            <header className="mb-6 flex items-start justify-between shrink-0">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Company Dashboard</h1>
                    <p className="text-slate-400 mt-1">Real-time overview of {activeCompany?.name || 'your workspace'}.</p>
                </div>
                
                {/* Global Check-in System */}
                <button 
                    onClick={toggleCheckIn}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold shadow-lg transition-all ${
                        isCheckedIn 
                        ? 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 shadow-rose-500/10' 
                        : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/20'
                    }`}
                >
                    {isCheckedIn ? (
                        <><LogOut size={20} /> Check Out</>
                    ) : (
                        <><LogIn size={20} /> Check In</>
                    )}
                </button>
            </header>

            <div className="flex flex-col xl:flex-row gap-6">
                <div className="flex-[2] flex flex-col gap-6">
                    
                    {activeTab === 'home' && (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {/* Metric Cards */}
                                <div className="bg-dark-800 border border-dark-700 p-5 rounded-2xl flex items-center gap-4">
                                    <div className="w-12 h-12 bg-primary-500/10 text-primary-400 rounded-xl flex items-center justify-center">
                                        <Target size={24} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-400">Total Projects</p>
                                        <h3 className="text-2xl font-bold text-white">{projectStats.total}</h3>
                                    </div>
                                </div>

                                <div className="bg-dark-800 border border-dark-700 p-5 rounded-2xl flex items-center gap-4">
                                    <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center">
                                        <CheckCircle2 size={24} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-400">Completed</p>
                                        <h3 className="text-2xl font-bold text-white">{projectStats.completed}</h3>
                                    </div>
                                </div>

                                <div className="bg-dark-800 border border-dark-700 p-5 rounded-2xl flex items-center gap-4">
                                    <div className="w-12 h-12 bg-amber-500/10 text-amber-400 rounded-xl flex items-center justify-center">
                                        <Activity size={24} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-400">Ongoing Activity</p>
                                        <h3 className="text-2xl font-bold text-white">{projectStats.ongoing}</h3>
                                    </div>
                                </div>

                                <div className="bg-dark-800 border border-dark-700 p-5 rounded-2xl flex items-center gap-4">
                                    <div className="w-12 h-12 bg-blue-500/10 text-blue-400 rounded-xl flex items-center justify-center">
                                        <Users size={24} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-400">Active Members</p>
                                        <h3 className="text-2xl font-bold text-white">3</h3>
                                    </div>
                                </div>
                            </div>

                            {/* Charts Section */}
                            <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6 min-h-[300px]">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-lg font-bold text-white">Weekly Progress</h2>
                                    <TrendingUp className="text-slate-400" size={20} />
                                </div>
                                <div className="w-full h-[calc(100%-40px)] min-h-[250px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={activityData}>
                                            <defs>
                                                <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                            <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                            <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                                                itemStyle={{ color: '#fff' }}
                                            />
                                            <Area type="monotone" dataKey="tasks" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorTasks)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="flex gap-6 h-[300px]">
                                <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6 flex-1">
                                    <h2 className="text-lg font-bold text-white mb-4">Project Distribution</h2>
                                    <div className="w-full h-[calc(100%-30px)]">
                                        {projectStats.pieData.length > 0 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={projectStats.pieData}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={60}
                                                        outerRadius={80}
                                                        paddingAngle={5}
                                                        dataKey="value"
                                                    >
                                                        {projectStats.pieData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip
                                                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                                                        itemStyle={{ color: '#fff' }}
                                                    />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                                                No project data available.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6 flex-1">
                                    <h2 className="text-lg font-bold text-white mb-4">Workload status</h2>
                                    <div className="w-full h-[calc(100%-30px)]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={projectStats.pieData}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                                <Tooltip
                                                    cursor={{ fill: '#334155', opacity: 0.4 }}
                                                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                                                />
                                                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {activeTab === 'operational' && (
                        <div className="bg-dark-800 border border-dark-700 rounded-2xl p-8 flex-1 flex flex-col items-center justify-center text-center">
                            <Briefcase className="text-primary-500 mb-4" size={48} />
                            <h2 className="text-2xl font-bold text-white mb-2">Operational Dashboard</h2>
                            <p className="text-slate-400 max-w-md">Detailed view of resource allocation, active sprint progress, and team capacity tracking.</p>
                        </div>
                    )}

                    {activeTab === 'financial' && (
                        <div className="bg-dark-800 border border-dark-700 rounded-2xl p-8 flex-1 flex flex-col items-center justify-center text-center">
                            <DollarSign className="text-emerald-500 mb-4" size={48} />
                            <h2 className="text-2xl font-bold text-white mb-2">Financial Dashboard</h2>
                            <p className="text-slate-400 max-w-md">Track revenue, project budgets, and expenses across all company initiatives.</p>
                        </div>
                    )}

                    {activeTab === 'marketing' && (
                        <div className="bg-dark-800 border border-dark-700 rounded-2xl p-8 flex-1 flex flex-col items-center justify-center text-center">
                            <Megaphone className="text-fuchsia-500 mb-4" size={48} />
                            <h2 className="text-2xl font-bold text-white mb-2">Marketing Dashboard</h2>
                            <p className="text-slate-400 max-w-md">Analyze campaign performance, social engagement, and content distribution metrics.</p>
                        </div>
                    )}

                </div>

                {/* AI Chatbot Sidebar Widget */}
                {activeTab === 'home' && (
                    <div className="bg-dark-800 border border-dark-700 rounded-2xl overflow-hidden flex flex-col w-full xl:w-[350px] 2xl:w-[400px] shrink-0 self-start xl:sticky top-6">
                        <div className="bg-primary-900/20 border-b border-primary-500/20 p-4 flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary-500/20">
                                <Sparkles size={20} />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-white">Mammu AI Analyst</h2>
                                <p className="text-xs text-primary-400">Ask about company performance</p>
                            </div>
                        </div>

                        <AIChatWidget projectStats={projectStats} />
                    </div>
                )}
            </div>
        </div>
    );
}
