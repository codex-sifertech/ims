import React from 'react';
import { 
    Clock, 
    Calendar, 
    CheckCircle2, 
    AlertCircle, 
    Users, 
    Target,
    BarChart3
} from 'lucide-react';

export default function ProjectOverview({ project }) {
    if (!project) return null;

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* Project Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-dark-800 border border-dark-700 rounded-2xl p-5 flex items-center gap-4 hover:border-indigo-500/50 transition-all">
                    <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-500">
                        <Target size={24} />
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Project Progress</p>
                        <h3 className="text-xl font-bold text-white">45%</h3>
                    </div>
                </div>
                
                <div className="bg-dark-800 border border-dark-700 rounded-2xl p-5 flex items-center gap-4 hover:border-emerald-500/50 transition-all">
                    <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500">
                        <CheckCircle2 size={24} />
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Completed Tasks</p>
                        <h3 className="text-xl font-bold text-white">12 / 24</h3>
                    </div>
                </div>

                <div className="bg-dark-800 border border-dark-700 rounded-2xl p-5 flex items-center gap-4 hover:border-primary-500/50 transition-all">
                    <div className="p-3 bg-primary-500/10 rounded-xl text-primary-500">
                        <Clock size={24} />
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Days to Launch</p>
                        <h3 className="text-xl font-bold text-white">14 Days</h3>
                    </div>
                </div>
            </div>

            {/* Main Content Info */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <section className="bg-dark-800 border border-dark-700 rounded-2xl p-6">
                        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                             Project Description
                        </h2>
                        <p className="text-slate-400 leading-relaxed">
                            {project.description || "No description provided for this project yet. Use the settings tab to add a vision and scope for your team."}
                        </p>
                    </section>

                    <section className="bg-dark-800 border border-dark-700 rounded-2xl p-6">
                        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            Recent Activity
                        </h2>
                        <div className="space-y-4">
                            {[1, 2, 3].map((_, i) => (
                                <div key={i} className="flex gap-4 items-start border-l-2 border-dark-600 pl-4 py-1">
                                    <div className="h-2 w-2 rounded-full bg-indigo-500 mt-2 -ml-[25px] border-4 border-dark-800" />
                                    <div>
                                        <p className="text-sm text-slate-200"><span className="font-bold text-white">John Doe</span> updated the Mind Map structure</p>
                                        <p className="text-[10px] text-slate-500 uppercase font-bold mt-1">2 hours ago</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                <div className="space-y-6">
                    <section className="bg-dark-800 border border-dark-700 rounded-2xl p-6">
                        <h2 className="text-sm font-bold text-white mb-4 uppercase tracking-widest text-slate-500">Team Members</h2>
                        <div className="flex -space-x-2 mb-4">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="h-10 w-10 rounded-full border-2 border-dark-800 bg-dark-600 flex items-center justify-center text-xs font-bold text-white">
                                    JD
                                </div>
                            ))}
                        </div>
                        <button className="w-full py-2 rounded-xl border border-dark-600 text-slate-300 hover:text-white hover:bg-dark-700 text-xs font-bold transition-all">
                            Invite Team
                        </button>
                    </section>

                    <section className="bg-dark-800 border border-dark-700 rounded-2xl p-6">
                         <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-bold text-white uppercase tracking-widest text-slate-500">Timeline</h2>
                            <BarChart3 size={16} className="text-slate-500" />
                         </div>
                         <div className="space-y-4">
                            <div className="flex justify-between text-xs font-bold">
                                <span className="text-slate-400">Design Phase</span>
                                <span className="text-emerald-500">Completed</span>
                            </div>
                            <div className="flex justify-between text-xs font-bold">
                                <span className="text-slate-400">Implementation</span>
                                <span className="text-amber-500">In Progress</span>
                            </div>
                            <div className="flex justify-between text-xs font-bold">
                                <span className="text-slate-400">Beta Testing</span>
                                <span className="text-slate-600">Pending</span>
                            </div>
                         </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
