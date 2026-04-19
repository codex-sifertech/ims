import { useMemo } from 'react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    PieChart, Pie, Cell
} from 'recharts';
import { CheckCircle2, Clock, AlertTriangle, TrendingUp, Target } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function ProjectOverview({ project, tasks = [] }) {
    // Analytics calculation
    const stats = useMemo(() => {
        const total = tasks.length;
        const completed = tasks.filter(t => t.status === 'done').length;
        const inProgress = tasks.filter(t => t.status === 'in-progress' || t.status === 'review').length;
        const pending = tasks.filter(t => t.status === 'todo').length;
        const efficiency = total > 0 ? Math.round((completed / total) * 100) : 0;

        // Distribution for Pie Chart
        const distributionData = [
            { name: 'Completed', value: completed },
            { name: 'In Progress', value: inProgress },
            { name: 'Pending', value: pending },
        ].filter(d => d.value > 0);

        // Dummy data for velocity if no tasks exist
        const progressData = [
            { day: 'Mon', completed: 2, tasks: 5 },
            { day: 'Tue', completed: 3, tasks: 6 },
            { day: 'Wed', completed: 5, tasks: 8 },
            { day: 'Thu', completed: 6, tasks: 9 },
            { day: 'Fri', completed: 8, tasks: 12 },
            { day: 'Sat', completed: 10, tasks: 15 },
            { day: 'Sun', completed: completed, tasks: total },
        ];

        return { total, completed, inProgress, pending, efficiency, distributionData, progressData };
    }, [tasks]);

    if (!project) return null;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Completion', value: `${stats.efficiency}%`, icon: <CheckCircle2 className="text-emerald-500" />, color: 'bg-emerald-500' },
                    { label: 'Active', value: stats.inProgress, icon: <Clock className="text-blue-500" />, color: 'bg-blue-500' },
                    { label: 'Pending', value: stats.pending, icon: <AlertTriangle className="text-amber-500" />, color: 'bg-amber-500' },
                    { label: 'Total Tasks', value: stats.total, icon: <Target className="text-indigo-500" />, color: 'bg-indigo-500' },
                ].map((stat, i) => (
                    <div key={i} className="bg-dark-800 border border-dark-700 p-5 rounded-2xl shadow-sm hover:border-dark-600 transition-colors">
                        <div className="flex items-center justify-between mb-3">
                            <div className="p-2 bg-dark-900 rounded-xl">{stat.icon}</div>
                            <TrendingUp size={16} className="text-emerald-500 opacity-50" />
                        </div>
                        <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
                        <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">{stat.label}</div>
                        <div className="mt-4 h-1 w-full bg-dark-900 rounded-full overflow-hidden">
                            <div 
                                className={`h-full ${stat.color} transition-all duration-1000`} 
                                style={{ width: i === 0 ? `${stats.efficiency}%` : '100%' }}
                            ></div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Progress Chart */}
                <div className="lg:col-span-2 bg-dark-800 border border-dark-700 p-6 rounded-2xl flex flex-col h-[400px]">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-white">Execution Velocity</h3>
                        <div className="flex gap-4">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                <span className="w-2 h-2 rounded-full bg-blue-500/50"></span> Total
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Done
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.progressData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                <XAxis 
                                    dataKey="day" 
                                    stroke="#475569" 
                                    fontSize={10} 
                                    tickLine={false} 
                                    axisLine={false} 
                                    dy={10}
                                />
                                <YAxis 
                                    stroke="#475569" 
                                    fontSize={10} 
                                    tickLine={false} 
                                    axisLine={false} 
                                />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)' }}
                                    itemStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                                    cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                                />
                                <Bar dataKey="tasks" fill="#3b82f6aa" radius={[4, 4, 0, 0]} barSize={20} />
                                <Bar dataKey="completed" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Status Distribution */}
                <div className="bg-dark-800 border border-dark-700 p-6 rounded-2xl flex flex-col h-[400px]">
                    <h3 className="text-lg font-bold text-white mb-2">Task Load</h3>
                    <p className="text-xs text-slate-500 mb-6">Real-time status distribution.</p>
                    <div className="flex-1 min-h-0 flex flex-col items-center justify-center">
                        <div className="relative w-full h-[200px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={stats.distributionData.length > 0 ? stats.distributionData : [{ name: 'No Data', value: 1 }]}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={8}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {stats.distributionData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} cornerRadius={4} />
                                        ))}
                                        {stats.distributionData.length === 0 && <Cell fill="#1e293b" />}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-2xl font-bold text-white">{stats.efficiency}%</span>
                                <span className="text-[10px] text-slate-500 font-bold uppercase">Done</span>
                            </div>
                        </div>
                        <div className="mt-8 w-full space-y-3">
                            {stats.distributionData.map((d, i) => (
                                <div key={i} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                                        <span className="text-xs font-semibold text-slate-400">{d.name}</span>
                                    </div>
                                    <span className="text-xs font-bold text-white">{d.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Description & Resources Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <section className="bg-dark-800 border border-dark-700 rounded-2xl p-6">
                    <h2 className="text-lg font-bold text-white mb-4">Project Context</h2>
                    <p className="text-slate-400 text-sm leading-relaxed mb-6">
                        {project.desc || "No comprehensive vision documentation provided. Use the settings panel to define the project scope and long-term objectives."}
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {['High Priority', 'Phase 1', 'Internal'].map(tag => (
                            <span key={tag} className="px-3 py-1 bg-dark-900 text-slate-500 text-[10px] font-bold rounded-full border border-dark-700 italic">
                                #{tag}
                            </span>
                        ))}
                    </div>
                </section>

                <section className="bg-dark-800 border border-dark-700 rounded-2xl p-6">
                    <h2 className="text-lg font-bold text-white mb-4">Sync Status</h2>
                    <div className="space-y-4">
                        {[
                            { label: 'Ecosystem Sync', status: 'Live', color: 'text-emerald-500' },
                            { label: 'Collaboration Channel', status: 'Active', color: 'text-emerald-500' },
                            { label: 'AI Documentation', status: 'Pending', color: 'text-amber-500' }
                        ].map((item, i) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-dark-900/50 rounded-xl border border-dark-700/50">
                                <span className="text-sm font-medium text-slate-300">{item.label}</span>
                                <span className={`text-xs font-bold ${item.color}`}>{item.status}</span>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
}
