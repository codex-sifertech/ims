import { Outlet, Link, useLocation } from 'react-router-dom';
import { LogOut, Home, FolderKanban, Briefcase, MessageSquare, Sparkles, Video, Settings, ChevronDown } from 'lucide-react';
import { auth } from '../../firebase';
import useStore from '../../store/useStore';
import CompanySwitcher from './CompanySwitcher';
import GlobalScreenShare from '../projects/GlobalScreenShare';
import GlobalTimeTracker from './GlobalTimeTracker';
import { useState } from 'react';
import { useGlobalTasks } from '../../hooks/useGlobalTasks';
import { useTimeTracker } from '../../hooks/useTimeTracker';

export default function DashboardLayout() {
    const { user } = useStore();
    const location = useLocation();
    const [dashboardExpanded, setDashboardExpanded] = useState(true);

    // Initialize Global Persistence Hooks
    useGlobalTasks();
    useTimeTracker();


    const navItems = [
        { 
            name: 'Dashboard', 
            path: '/dashboard', 
            icon: <Home size={20} />,
            isParent: true,
            children: [
                { name: 'Overview', path: '/dashboard?tab=home' },
                { name: 'Operational', path: '/dashboard?tab=operational' },
                { name: 'Financial', path: '/dashboard?tab=financial' },
                { name: 'Marketing', path: '/dashboard?tab=marketing' }
            ]
        },
        { name: 'My Board', path: '/dashboard/my-board', icon: <FolderKanban size={20} /> },
        { name: 'Projects', path: '/dashboard/projects', icon: <Briefcase size={20} /> },
        { name: 'Chat', path: '/dashboard/chat', icon: <MessageSquare size={20} /> },
        { name: 'AI Ecosystem', path: '/dashboard/ai', icon: <Sparkles size={20} /> },
        { name: 'Meetings', path: '/dashboard/meetings', icon: <Video size={20} /> },
        { name: 'Settings', path: '/dashboard/settings', icon: <Settings size={20} /> },
    ];

    const isDashboardActive = location.pathname === '/dashboard';

    return (
        <div className="flex h-screen bg-dark-900 overflow-hidden w-full">
            {/* Sidebar Navigation */}
            <aside className="w-64 bg-dark-800 border-r border-dark-700 flex flex-col justify-between">
                <div className="flex flex-col flex-1 overflow-y-auto custom-scrollbar">
                    <div className="h-16 flex items-center px-6 border-b border-dark-700 shrink-0">
                        <h1 className="text-xl font-bold text-white tracking-tight">IMS Platform</h1>
                    </div>

                    {/* Company Switcher */}
                    <div className="px-4 mt-6 shrink-0">
                        <CompanySwitcher />
                    </div>

                    <nav className="mt-6 px-4 space-y-1 pb-4">
                        {navItems.map((item) => {
                            if (item.isParent) {
                                return (
                                    <div key={item.name} className="flex flex-col space-y-1">
                                        <div 
                                            onClick={() => setDashboardExpanded(!dashboardExpanded)}
                                            className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
                                                isDashboardActive ? 'bg-primary-600/10 text-primary-400' : 'text-slate-400 hover:bg-dark-700 hover:text-white'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                {item.icon}
                                                {item.name}
                                            </div>
                                            <ChevronDown size={16} className={`transition-transform ${dashboardExpanded ? 'rotate-180' : ''}`} />
                                        </div>
                                        
                                        {/* Submenu */}
                                        {dashboardExpanded && (
                                            <div className="pl-9 pr-2 space-y-1 mt-1">
                                                {item.children.map(child => {
                                                    const isActive = isDashboardActive && location.search === child.path.substring(child.path.indexOf('?'));
                                                    // If no search param and child is home, it's also active
                                                    const isHomeActive = isDashboardActive && !location.search && child.path.includes('tab=home');
                                                    
                                                    return (
                                                        <Link
                                                            key={child.name}
                                                            to={child.path}
                                                            className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                                                                isActive || isHomeActive
                                                                ? 'bg-dark-700 text-white font-medium shadow-sm border border-dark-600'
                                                                : 'text-slate-500 hover:text-slate-300 hover:bg-dark-700/50'
                                                            }`}
                                                        >
                                                            {child.name}
                                                        </Link>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            }

                            return (
                                <Link
                                    key={item.name}
                                    to={item.path}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                                        location.pathname === item.path
                                        ? 'bg-primary-600/10 text-primary-400'
                                        : 'text-slate-400 hover:bg-dark-700 hover:text-white'
                                    }`}
                                >
                                    {item.icon}
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                <div className="shrink-0 mt-auto pt-4 border-t border-dark-700 bg-dark-800">
                    <GlobalTimeTracker />
                    <div className="flex items-center justify-between px-7 py-2">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold text-sm">
                                {user?.name?.charAt(0) || user?.email?.charAt(0) || '?'}
                            </div>
                            <div className="text-xs">
                                <p className="text-white font-medium truncate w-32">{user?.name || user?.email}</p>
                                <p className="text-slate-500">Online</p>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => auth.signOut()}
                        className="mt-4 flex w-full items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                    >
                        <LogOut size={20} />
                        Logout
                    </button>
                </div>
            </aside>

            <main className="flex-1 overflow-auto bg-dark-900 relative">
                <Outlet />
                <GlobalScreenShare />
            </main>
        </div>
    );
}
