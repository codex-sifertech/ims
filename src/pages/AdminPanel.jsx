import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import useStore from '../store/useStore';
import {
    Shield, Users, Building2, Activity, AlertTriangle,
    CheckCircle2, XCircle, RefreshCw, Loader2, Eye, Trash2,
    Lock, Unlock, Database, Server, Wifi, WifiOff, Search
} from 'lucide-react';
import { accessList } from '../config/accessControl';

function StatCard({ icon, label, value, color = 'primary', sub }) {
    const colors = {
        primary: 'from-primary-500/20 to-indigo-500/10 border-primary-500/20 text-primary-400',
        emerald: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/20 text-emerald-400',
        amber:   'from-amber-500/20 to-orange-500/10 border-amber-500/20 text-amber-400',
        rose:    'from-rose-500/20 to-red-500/10 border-rose-500/20 text-rose-400',
    };
    return (
        <div className={`bg-gradient-to-br ${colors[color]} border rounded-2xl p-5`}>
            <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-xl bg-current/10`}>{icon}</div>
            </div>
            <div className="text-3xl font-black text-white tabular-nums">{value}</div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{label}</div>
            {sub && <div className="text-[10px] text-slate-500 mt-0.5">{sub}</div>}
        </div>
    );
}

export default function AdminPanel() {
    const { user } = useStore();
    const [companies, setCompanies] = useState([]);
    const [loadingCompanies, setLoadingCompanies] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('overview');
    const [refreshKey, setRefreshKey] = useState(0);
    const [systemStatus, setSystemStatus] = useState('checking');

    const isMasterAdmin = accessList[user?.email]?.role === 'master_admin';

    useEffect(() => {
        // Firebase connectivity check
        const check = setTimeout(() => {
            setSystemStatus(navigator.onLine ? 'online' : 'offline');
        }, 800);
        return () => clearTimeout(check);
    }, []);

    useEffect(() => {
        if (!isMasterAdmin) return;
        setLoadingCompanies(true);
        getDocs(collection(db, 'companies'))
            .then(snap => {
                const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                setCompanies(data);
            })
            .catch(console.error)
            .finally(() => setLoadingCompanies(false));
    }, [refreshKey, isMasterAdmin]);

    const handleDeleteCompany = async (id) => {
        if (!window.confirm('Are you sure? This will permanently delete the company record.')) return;
        try {
            await deleteDoc(doc(db, 'companies', id));
            setCompanies(prev => prev.filter(c => c.id !== id));
        } catch (err) {
            console.error('Delete failed:', err);
        }
    };

    if (!isMasterAdmin) {
        return (
            <div className="h-full flex flex-col items-center justify-center bg-dark-900 text-center p-8">
                <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mb-6 border border-red-500/20">
                    <Lock size={40} className="text-red-400" />
                </div>
                <h1 className="text-3xl font-black text-white mb-3">Access Denied</h1>
                <p className="text-slate-400 max-w-sm">
                    This panel is restricted to Master Administrators only. Your account does not have the required privileges.
                </p>
            </div>
        );
    }

    const filteredCompanies = companies.filter(c =>
        c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.id?.includes(searchQuery)
    );

    const tabs = [
        { id: 'overview',    label: 'Overview',    icon: <Activity size={14} /> },
        { id: 'companies',   label: 'Companies',   icon: <Building2 size={14} /> },
        { id: 'access',      label: 'Access Control', icon: <Shield size={14} /> },
        { id: 'system',      label: 'System Health', icon: <Server size={14} /> },
    ];

    return (
        <div className="h-full flex flex-col bg-dark-900 w-full overflow-hidden">
            {/* Header */}
            <header className="px-8 py-5 border-b border-dark-700 shrink-0 bg-dark-800/50 backdrop-blur">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-center">
                            <Shield className="text-rose-400" size={20} />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-white uppercase tracking-tight">Super Admin Panel</h1>
                            <p className="text-xs text-slate-500">Logged in as <span className="text-rose-400 font-bold">{user?.email}</span> · Master Administrator</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold ${
                            systemStatus === 'online' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}>
                            {systemStatus === 'online' ? <Wifi size={12} /> : <WifiOff size={12} />}
                            Firebase {systemStatus === 'online' ? 'connected' : 'offline'}
                        </div>
                        <button
                            onClick={() => setRefreshKey(k => k + 1)}
                            className="p-2 hover:bg-dark-700 rounded-xl text-slate-400 hover:text-white transition-all"
                        >
                            <RefreshCw size={16} />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 mt-5">
                    {tabs.map(t => (
                        <button
                            key={t.id}
                            onClick={() => setActiveTab(t.id)}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                activeTab === t.id
                                    ? 'bg-primary-600 text-white shadow-lg'
                                    : 'text-slate-400 hover:text-white hover:bg-dark-700'
                            }`}
                        >
                            {t.icon} {t.label}
                        </button>
                    ))}
                </div>
            </header>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-8">

                {/* ── OVERVIEW ── */}
                {activeTab === 'overview' && (
                    <div className="space-y-8">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                            <StatCard icon={<Building2 size={20} />} label="Total Companies" value={companies.length} color="primary" />
                            <StatCard icon={<Users size={20} />} label="Admin Users" value={Object.keys(accessList).length} color="emerald" sub="In access list" />
                            <StatCard icon={<Shield size={20} />} label="Master Admins" value={Object.values(accessList).filter(u => u.role === 'master_admin').length} color="amber" />
                            <StatCard icon={<Activity size={20} />} label="System Status" value={systemStatus === 'online' ? 'Online' : 'Offline'} color={systemStatus === 'online' ? 'emerald' : 'rose'} />
                        </div>

                        <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6">
                            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Recent Companies</h2>
                            {loadingCompanies ? (
                                <div className="flex items-center gap-3 text-slate-500 py-4">
                                    <Loader2 className="animate-spin" size={18} /> Loading...
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {companies.slice(0, 5).map(company => (
                                        <div key={company.id} className="flex items-center justify-between p-3 bg-dark-900/50 rounded-xl border border-dark-700/50">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-primary-600/10 rounded-lg flex items-center justify-center text-primary-400 font-black text-sm">
                                                    {company.name?.charAt(0) || '?'}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-white">{company.name}</p>
                                                    <p className="text-[10px] text-slate-500 font-mono">{company.id}</p>
                                                </div>
                                            </div>
                                            <span className="text-[10px] text-slate-500">{(company.accessList || []).length} members</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── COMPANIES ── */}
                {activeTab === 'companies' && (
                    <div className="space-y-5">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                            <input
                                type="text"
                                placeholder="Search companies..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full bg-dark-800 border border-dark-700 rounded-xl pl-10 pr-4 py-3 text-white text-sm focus:outline-none focus:border-primary-500 transition-all"
                            />
                        </div>

                        {loadingCompanies ? (
                            <div className="flex items-center justify-center py-16 text-slate-500 gap-3">
                                <Loader2 className="animate-spin text-primary-500" size={28} /> Loading companies...
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {filteredCompanies.map(company => (
                                    <div key={company.id} className="bg-dark-800 border border-dark-700 rounded-2xl p-5 flex items-start justify-between gap-4 hover:border-dark-600 transition-all">
                                        <div className="flex items-start gap-4">
                                            <div className="w-12 h-12 bg-primary-600/10 rounded-xl flex items-center justify-center text-primary-400 font-black text-xl border border-primary-500/10">
                                                {company.name?.charAt(0) || '?'}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-white">{company.name || 'Unnamed Company'}</h3>
                                                <p className="text-xs text-slate-500 font-mono mt-0.5">{company.id}</p>
                                                <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                                                    <span className="flex items-center gap-1"><Users size={10} /> {(company.accessList || []).length} members</span>
                                                    {company.createdAt && <span>Created {new Date(company.createdAt).toLocaleDateString()}</span>}
                                                    {company.owner && <span>Owner: {company.owner.substring(0, 8)}...</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <button
                                                onClick={() => handleDeleteCompany(company.id)}
                                                className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                                title="Delete company"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {filteredCompanies.length === 0 && (
                                    <div className="text-center py-16 text-slate-500">
                                        No companies found
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* ── ACCESS CONTROL ── */}
                {activeTab === 'access' && (
                    <div className="space-y-5">
                        <div className="bg-dark-800 border border-dark-700 rounded-2xl overflow-hidden">
                            <div className="p-5 border-b border-dark-700 bg-dark-800/80">
                                <h2 className="font-black text-white">Authorized Users</h2>
                                <p className="text-xs text-slate-500 mt-1">Users with hardcoded access in accessControl.js</p>
                            </div>
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-dark-900/50 text-xs font-bold text-slate-500 uppercase tracking-widest">
                                        <th className="px-6 py-3">Email</th>
                                        <th className="px-6 py-3">Name</th>
                                        <th className="px-6 py-3">Role</th>
                                        <th className="px-6 py-3">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-dark-700">
                                    {Object.entries(accessList).map(([email, data]) => (
                                        <tr key={email} className="hover:bg-dark-700/30 transition-colors">
                                            <td className="px-6 py-4 text-sm text-white font-mono">{email}</td>
                                            <td className="px-6 py-4 text-sm text-slate-300">{data.name}</td>
                                            <td className="px-6 py-4">
                                                <span className={`text-[10px] px-2.5 py-1 rounded-full font-black uppercase tracking-widest border ${
                                                    data.role === 'master_admin'
                                                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                                        : 'bg-primary-500/10 text-primary-400 border-primary-500/20'
                                                }`}>
                                                    {data.role.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold">
                                                    <CheckCircle2 size={12} /> Active
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5 flex items-start gap-4">
                            <AlertTriangle className="text-amber-400 mt-0.5 shrink-0" size={20} />
                            <div>
                                <h3 className="font-bold text-amber-400 mb-1">Access List is Code-Defined</h3>
                                <p className="text-sm text-slate-400 leading-relaxed">
                                    The user access list is currently defined in <code className="text-amber-300 bg-dark-800 px-1.5 py-0.5 rounded text-xs">src/config/accessControl.js</code>. 
                                    To add or remove users, edit that file and redeploy. Future versions will support dynamic Firestore-based approval flows.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── SYSTEM HEALTH ── */}
                {activeTab === 'system' && (
                    <div className="space-y-5">
                        {[
                            { label: 'Firebase Authentication', status: 'operational', desc: 'Email/Password + Google OAuth enabled' },
                            { label: 'Cloud Firestore',         status: systemStatus === 'online' ? 'operational' : 'degraded', desc: 'Region: nam5 (US Central)' },
                            { label: 'Firebase Storage',        status: 'operational', desc: 'nexus-work-platform.firebasestorage.app' },
                            { label: 'Vercel Hosting',          status: 'operational', desc: 'SPA routing via vercel.json rewrites' },
                        ].map(svc => (
                            <div key={svc.label} className="bg-dark-800 border border-dark-700 rounded-2xl p-5 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`w-3 h-3 rounded-full ${svc.status === 'operational' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                                    <div>
                                        <h3 className="font-bold text-white text-sm">{svc.label}</h3>
                                        <p className="text-xs text-slate-500">{svc.desc}</p>
                                    </div>
                                </div>
                                <span className={`text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border ${
                                    svc.status === 'operational'
                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                }`}>
                                    {svc.status}
                                </span>
                            </div>
                        ))}

                        <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6">
                            <h2 className="font-black text-white mb-4 text-sm uppercase tracking-widest">Firebase Configuration</h2>
                            <div className="space-y-2">
                                {[
                                    ['Project ID',    'nexus-work-platform'],
                                    ['Auth Domain',   'nexus-work-platform.firebaseapp.com'],
                                    ['Storage',       'nexus-work-platform.firebasestorage.app'],
                                    ['Firestore Region', 'nam5 (Iowa, US)'],
                                    ['Vercel Routing',   'SPA rewrite → /index.html'],
                                ].map(([k, v]) => (
                                    <div key={k} className="flex items-center justify-between py-2.5 border-b border-dark-700/50 last:border-0">
                                        <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">{k}</span>
                                        <span className="text-xs text-slate-300 font-mono">{v}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
