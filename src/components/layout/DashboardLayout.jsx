import { Outlet, Link, useLocation } from 'react-router-dom';
import { LogOut, Home, FolderKanban, Briefcase, MessageSquare, Sparkles, Video, Settings, ChevronDown, Shield, Sun, Moon, ChevronLeft, ChevronRight, Users2 } from 'lucide-react';
import { auth } from '../../firebase';
import useStore from '../../store/useStore';
import CompanySwitcher from './CompanySwitcher';
import GlobalScreenShare from '../projects/GlobalScreenShare';
import GlobalTimeTracker from './GlobalTimeTracker';
import { useState } from 'react';
import { useGlobalTasks } from '../../hooks/useGlobalTasks';
import { useTimeTracker } from '../../hooks/useTimeTracker';
import { useOnlinePresence } from '../../hooks/useOnlinePresence';

export default function DashboardLayout() {
    const { user, theme, setTheme, isSidebarCollapsed, setSidebarCollapsed } = useStore();
    const location = useLocation();
    const [dashboardExpanded, setDashboardExpanded] = useState(true);

    // Initialize Global Persistence Hooks
    useGlobalTasks();
    useTimeTracker();
    useOnlinePresence();


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
        { name: 'People HR', path: '/dashboard/people', icon: <Users2 size={20} /> },
        ...(user?.uid === useStore.getState().activeCompany?.owner ? [
            { name: 'Admin Panel', path: '/dashboard/settings', icon: <Shield size={20} />, danger: true }
        ] : [
            { name: 'Workspace Details', path: '/dashboard/settings', icon: <Settings size={20} /> }
        ]),
        ...(user?.role === 'master_admin' ? [{ name: 'Super Admin', path: '/dashboard/admin', icon: <Shield size={20} />, danger: true }] : []),
    ];

    const isDashboardActive = location.pathname === '/dashboard';

    return (
        <div className="flex h-screen bg-dark-900 overflow-hidden w-full">
            {/* Sidebar Navigation */}
            <aside className={`transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'w-20' : 'w-64'} bg-dark-800 border-r border-dark-700 flex flex-col justify-between relative group`}>
                {/* Collapse Toggle */}
                <button 
                    onClick={() => setSidebarCollapsed(!isSidebarCollapsed)}
                    className="absolute -right-3 top-20 w-6 h-6 bg-dark-700 border border-dark-600 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-colors z-10 opacity-0 group-hover:opacity-100 shadow-xl"
                >
                    {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </button>

                <div className="flex flex-col flex-1 overflow-y-auto custom-scrollbar overflow-x-hidden">
                    <div className={`h-16 flex items-center ${isSidebarCollapsed ? 'justify-center' : 'px-6'} border-b border-dark-700 shrink-0`}>
                        {isSidebarCollapsed ? (
                            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white font-black">IMS</div>
                        ) : (
                            <h1 className="text-xl font-bold text-white tracking-tight">IMS Platform</h1>
                        )}
                    </div>

                    {/* Company Switcher */}
                    <div className={`${isSidebarCollapsed ? 'px-2' : 'px-4'} mt-6 shrink-0`}>
                        <CompanySwitcher isCollapsed={isSidebarCollapsed} />
                    </div>

                    <nav className={`mt-6 ${isSidebarCollapsed ? 'px-2' : 'px-4'} space-y-1 pb-4`}>
                        {navItems.map((item) => {
                            if (item.isParent) {
                                return (
                                    <div key={item.name} className="flex flex-col space-y-1">
                                        <div 
                                            onClick={() => !isSidebarCollapsed && setDashboardExpanded(!dashboardExpanded)}
                                            className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'} px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
                                                isDashboardActive ? 'bg-primary-600/10 text-primary-400' : 'text-slate-400 hover:bg-dark-700 hover:text-white'
                                            }`}
                                            title={isSidebarCollapsed ? item.name : ''}
                                        >
                                            <div className="flex items-center gap-3">
                                                {item.icon}
                                                {!isSidebarCollapsed && item.name}
                                            </div>
                                            {!isSidebarCollapsed && <ChevronDown size={16} className={`transition-transform ${dashboardExpanded ? 'rotate-180' : ''}`} />}
                                        </div>
                                        
                                        {/* Submenu */}
                                        {dashboardExpanded && !isSidebarCollapsed && (
                                            <div className="pl-9 pr-2 space-y-1 mt-1">
                                                {item.children.map(child => {
                                                    const isActive = isDashboardActive && location.search === child.path.substring(child.path.indexOf('?'));
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
                                    className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                                        location.pathname === item.path
                                        ? item.danger ? 'bg-rose-500/10 text-rose-400' : 'bg-primary-600/10 text-primary-400'
                                        : item.danger ? 'text-rose-500/70 hover:bg-rose-500/10 hover:text-rose-400' : 'text-slate-400 hover:bg-dark-700 hover:text-white'
                                    }`}
                                    title={isSidebarCollapsed ? item.name : ''}
                                >
                                    {item.icon}
                                    {!isSidebarCollapsed && item.name}
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                <div className="shrink-0 mt-auto pt-4 border-t border-dark-700 bg-dark-800 overflow-x-hidden">
                    {!isSidebarCollapsed && <GlobalTimeTracker />}
                    <div className="flex flex-col gap-2 p-3">
                        {!isSidebarCollapsed && (
                            <div className="flex items-center justify-between px-4 py-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                                        {user?.name?.charAt(0) || user?.email?.charAt(0) || '?'}
                                    </div>
                                    <div className="text-xs truncate">
                                        <p className="text-white font-medium truncate w-32">{user?.name || user?.email}</p>
                                        <p className="text-slate-500">Online</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                            className={`flex w-full items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'gap-3 px-4'} py-2 rounded-lg text-sm font-medium text-slate-400 hover:bg-dark-700 hover:text-white transition-colors`}
                            title={isSidebarCollapsed ? (theme === 'dark' ? 'Day Mode' : 'Night Mode') : ''}
                        >
                            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                            {!isSidebarCollapsed && (theme === 'dark' ? 'Day Mode' : 'Night Mode')}
                        </button>

                        <button
                            onClick={() => auth.signOut()}
                            className={`flex w-full items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'gap-3 px-4'} py-2 rounded-lg text-sm font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors`}
                            title={isSidebarCollapsed ? 'Logout' : ''}
                        >
                            <LogOut size={20} />
                            {!isSidebarCollapsed && 'Logout'}
                        </button>
                    </div>
                </div>
            </aside>

            <main className="flex-1 overflow-auto bg-dark-900 relative">
                <Outlet />
                <GlobalScreenShare />
            </main>
        </div>
    );
}
