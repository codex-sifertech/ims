import { useState, useEffect, useCallback } from 'react';
import {
    collection, onSnapshot, getDocs, doc, getDoc,
    setDoc, deleteDoc, updateDoc, query, orderBy, limit
} from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import useStore from '../store/useStore';
import { useNavigate, Link } from 'react-router-dom';
import {
    Shield, Users, Building2, CalendarDays, Activity, LogOut, Home,
    RefreshCw, CheckCircle2, AlertTriangle, Loader2, Trash2, ExternalLink,
    Calendar, Plus, Search, X, Zap, TrendingUp, Clock, ChevronRight,
    MoreVertical, Bot, Sparkles, Eye, Database, Globe, UserCheck
} from 'lucide-react';
import { createWorkspaceCalendar } from '../utils/workspaceCalendar';

// ─── Constants ────────────────────────────────────────────────────────────────

const MASTER_ADMIN_EMAIL = 'sifertech.co@gmail.com';
const GOOGLE_CLIENT_ID   = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const SCOPES = 'https://www.googleapis.com/auth/calendar';

function loadGsiScript() {
    return new Promise((resolve) => {
        if (window.google?.accounts) return resolve();
        const s  = document.createElement('script');
        s.src    = 'https://accounts.google.com/gsi/client';
        s.async  = true; s.defer = true; s.onload = resolve;
        document.head.appendChild(s);
    });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, color = 'primary', loading }) {
    const palette = {
        primary: 'bg-primary-500/10 border-primary-500/20 text-primary-400',
        emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
        amber:   'bg-amber-500/10  border-amber-500/20  text-amber-400',
        rose:    'bg-rose-500/10   border-rose-500/20   text-rose-400',
        blue:    'bg-blue-500/10   border-blue-500/20   text-blue-400',
    };
    return (
        <div className={`rounded-2xl border p-5 flex flex-col gap-3 ${palette[color]}`}>
            <div className="flex items-center justify-between">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${palette[color]}`}>
                    {icon}
                </div>
                {sub && <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg">{sub}</span>}
            </div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</p>
            {loading
                ? <div className="w-12 h-7 bg-dark-700 animate-pulse rounded-lg" />
                : <h3 className="text-3xl font-black text-white tabular-nums">{value ?? '—'}</h3>
            }
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MasterAdmin() {
    const { user } = useStore();
    const navigate = useNavigate();
    const [tab, setTab]                   = useState('overview');
    const [companies, setCompanies]       = useState([]);
    const [users, setUsers]               = useState([]);
    const [loadingCo, setLoadingCo]       = useState(true);
    const [loadingU, setLoadingU]         = useState(true);
    const [calConnected, setCalConnected] = useState(false);
    const [calChecking, setCalChecking]   = useState(true);
    const [connecting, setConnecting]     = useState(false);
    const [creatingCal, setCreatingCal]   = useState(null); // companyId currently creating
    const [search, setSearch]             = useState('');
    const [userSearch, setUserSearch]     = useState('');

    // ── Security gate ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (user && user.email !== MASTER_ADMIN_EMAIL && user.role !== 'master_admin') {
            navigate('/dashboard', { replace: true });
        }
    }, [user, navigate]);

    // ── Load all companies ────────────────────────────────────────────────────
    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'companies'), async (snap) => {
            const cos = await Promise.all(snap.docs.map(async d => {
                const data = d.data();
                let memberCount = 0;
                try {
                    const mSnap = await getDocs(collection(db, 'companies', d.id, 'members'));
                    memberCount = mSnap.size;
                } catch {}
                return { id: d.id, memberCount, ...data };
            }));
            cos.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
            setCompanies(cos);
            setLoadingCo(false);
        }, () => setLoadingCo(false));
        return () => unsub();
    }, []);

    // ── Load all users ────────────────────────────────────────────────────────
    useEffect(() => {
        getDocs(query(collection(db, 'users'), orderBy('name'))).then(snap => {
            setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }).catch(() => {}).finally(() => setLoadingU(false));
    }, []);

    // ── Check calendar connection ─────────────────────────────────────────────
    useEffect(() => {
        getDoc(doc(db, 'system', 'calendar_token')).then(snap => {
            const data = snap.data();
            setCalConnected(!!(data?.accessToken && (!data.expiresAt || Date.now() < data.expiresAt)));
        }).catch(() => setCalConnected(false)).finally(() => setCalChecking(false));
    }, []);

    // ── Google Calendar OAuth ─────────────────────────────────────────────────
    const handleConnectCalendar = useCallback(async () => {
        if (!GOOGLE_CLIENT_ID) {
            alert('VITE_GOOGLE_CLIENT_ID is not set.');
            return;
        }
        setConnecting(true);
        try {
            await loadGsiScript();
            window.google.accounts.oauth2.initTokenClient({
                client_id: GOOGLE_CLIENT_ID,
                scope: SCOPES,
                callback: async (res) => {
                    if (res.error) { setConnecting(false); return; }
                    const tokenData = {
                        accessToken: res.access_token,
                        expiresAt:   Date.now() + (res.expires_in * 1000),
                        scope:       res.scope,
                        masterEmail: MASTER_ADMIN_EMAIL,
                        updatedAt:   new Date().toISOString(),
                    };
                    // Store at system level (readable by all authenticated users)
                    await setDoc(doc(db, 'system', 'calendar_token'), tokenData);
                    // Also store on own user doc for backwards compat
                    if (user?.uid) {
                        await setDoc(
                            doc(db, 'users', user.uid, 'integrations', 'google_calendar'),
                            tokenData
                        );
                    }
                    setCalConnected(true);
                    setConnecting(false);
                },
            }).requestAccessToken();
        } catch (err) {
            console.error(err);
            setConnecting(false);
        }
    }, [user?.uid]);

    const handleDisconnectCalendar = async () => {
        await setDoc(doc(db, 'system', 'calendar_token'), { accessToken: null });
        setCalConnected(false);
    };

    // ── Create calendar for a workspace ──────────────────────────────────────
    const handleCreateCalendar = async (company) => {
        if (creatingCal) return;
        setCreatingCal(company.id);
        try {
            await createWorkspaceCalendar(user?.uid, company.name, company.id);
        } catch {}
        setCreatingCal(null);
    };

    // ── Delete workspace ──────────────────────────────────────────────────────
    const handleDeleteWorkspace = async (company) => {
        if (!window.confirm(`Permanently delete "${company.name}" and all its data?`)) return;
        try {
            await deleteDoc(doc(db, 'companies', company.id));
        } catch (err) {
            alert('Failed: ' + err.message);
        }
    };

    // ── Change user role ──────────────────────────────────────────────────────
    const handleRoleChange = async (uid, role) => {
        try {
            await updateDoc(doc(db, 'users', uid), { role });
            setUsers(u => u.map(x => x.id === uid ? { ...x, role } : x));
        } catch {}
    };

    // ── Derived stats ─────────────────────────────────────────────────────────
    const stats = {
        workspaces: companies.length,
        users:      users.length,
        members:    companies.reduce((s, c) => s + (c.memberCount || 0), 0),
        withCal:    companies.filter(c => c.calendarId).length,
    };

    const filteredCompanies = companies.filter(c =>
        !search || c.name?.toLowerCase().includes(search.toLowerCase())
    );
    const filteredUsers = users.filter(u =>
        !userSearch ||
        u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email?.toLowerCase().includes(userSearch.toLowerCase())
    );

    // ─────────────────────────────────────────────────────────────────────────
    const tabs = [
        { id: 'overview',    label: 'Overview',    icon: <Activity size={15} /> },
        { id: 'workspaces',  label: 'Workspaces',  icon: <Building2 size={15} /> },
        { id: 'users',       label: 'Users',       icon: <Users size={15} /> },
        { id: 'calendar',    label: 'Calendar',    icon: <CalendarDays size={15} /> },
    ];

    return (
        <div className="min-h-screen bg-dark-900 flex flex-col">

            {/* ── Top Bar ── */}
            <header className="h-14 border-b border-dark-700/80 bg-dark-800/60 backdrop-blur-md flex items-center justify-between px-6 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-primary-600 flex items-center justify-center text-white font-black text-[10px]">IMS</div>
                    <div className="h-4 w-px bg-dark-600" />
                    <div className="flex items-center gap-2">
                        <Shield size={15} className="text-primary-400" />
                        <span className="text-sm font-black text-white uppercase tracking-wider">Master Control Panel</span>
                        <span className="text-[9px] font-black bg-primary-500/20 text-primary-400 border border-primary-500/30 px-2 py-0.5 rounded-full uppercase tracking-widest">RESTRICTED</span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-[11px] text-slate-500 hidden md:block">
                        <span className="text-slate-400 font-medium">{user?.email}</span>
                    </div>
                    <Link to="/dashboard" className="flex items-center gap-1.5 px-3 py-1.5 bg-dark-700 hover:bg-dark-600 text-slate-300 text-xs font-bold rounded-xl transition-all">
                        <Home size={13} /> Dashboard
                    </Link>
                    <button
                        onClick={() => signOut(auth)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold rounded-xl border border-rose-500/20 transition-all"
                    >
                        <LogOut size={13} /> Sign Out
                    </button>
                </div>
            </header>

            {/* ── Tabs ── */}
            <div className="border-b border-dark-700/80 bg-dark-800/30 px-6 flex gap-1">
                {tabs.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        className={`flex items-center gap-2 px-4 py-3 text-[12px] font-semibold border-b-2 -mb-px transition-all ${
                            tab === t.id
                                ? 'border-primary-500 text-white'
                                : 'border-transparent text-slate-500 hover:text-slate-300'
                        }`}
                    >
                        <span className={tab === t.id ? 'text-primary-400' : ''}>{t.icon}</span>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ── Content ── */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">

                {/* ══ OVERVIEW ══════════════════════════════════════════════════ */}
                {tab === 'overview' && (
                    <div className="max-w-6xl mx-auto space-y-8">
                        {/* Greeting */}
                        <div className="relative pl-4">
                            <div className="absolute left-0 top-0 w-0.5 h-full bg-gradient-to-b from-primary-500 to-transparent rounded-full" />
                            <h1 className="text-2xl font-black text-white uppercase tracking-tight">Platform Overview</h1>
                            <p className="text-slate-500 text-xs mt-0.5">Real-time visibility across all workspaces and users.</p>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <StatCard icon={<Building2 size={18} />} label="Workspaces"    value={stats.workspaces} sub="Total"    color="primary" loading={loadingCo} />
                            <StatCard icon={<Users size={18} />}     label="Registered Users" value={stats.users}   sub="All time" color="blue"    loading={loadingU}  />
                            <StatCard icon={<UserCheck size={18} />} label="Total Members" value={stats.members}    sub="Across all" color="emerald" loading={loadingCo} />
                            <StatCard icon={<CalendarDays size={18} />} label="Calendars Active" value={stats.withCal} sub={`of ${stats.workspaces}`} color={calConnected ? 'emerald' : 'amber'} loading={loadingCo} />
                        </div>

                        {/* System Status */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-dark-800/50 border border-dark-700/50 rounded-2xl p-5 flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                    <Zap size={18} className="text-emerald-400" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Firebase</p>
                                    <p className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                                        nexus-work-platform
                                    </p>
                                </div>
                            </div>
                            <div className="bg-dark-800/50 border border-dark-700/50 rounded-2xl p-5 flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${calConnected ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-amber-500/10 border-amber-500/20'}`}>
                                    <CalendarDays size={18} className={calConnected ? 'text-emerald-400' : 'text-amber-400'} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Google Calendar</p>
                                    <p className={`text-sm font-bold flex items-center gap-1.5 ${calConnected ? 'text-emerald-400' : 'text-amber-400'}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full inline-block ${calConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                                        {calChecking ? 'Checking…' : calConnected ? 'Connected' : 'Not Connected'}
                                    </p>
                                </div>
                            </div>
                            <div className="bg-dark-800/50 border border-dark-700/50 rounded-2xl p-5 flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center">
                                    <Globe size={18} className="text-primary-400" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Access Control</p>
                                    <p className="text-sm font-bold text-primary-400 flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-primary-500 inline-block" />
                                        RBAC Active
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Recent Workspaces */}
                        <div className="bg-dark-800/40 border border-dark-700/50 rounded-2xl overflow-hidden">
                            <div className="px-6 py-4 border-b border-dark-700/50 flex items-center justify-between">
                                <h2 className="text-sm font-black text-white uppercase tracking-tight">Recent Workspaces</h2>
                                <button onClick={() => setTab('workspaces')} className="text-xs text-primary-400 hover:text-primary-300 font-bold flex items-center gap-1">View all <ChevronRight size={12} /></button>
                            </div>
                            <div className="divide-y divide-dark-700/40">
                                {loadingCo ? (
                                    <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-primary-500" /></div>
                                ) : companies.slice(0, 5).map(co => (
                                    <div key={co.id} className="flex items-center justify-between px-6 py-3 hover:bg-dark-700/20 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-xl bg-primary-600/20 border border-primary-500/20 flex items-center justify-center text-white text-xs font-bold">
                                                {co.name?.charAt(0)?.toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-white">{co.name}</p>
                                                <p className="text-[10px] text-slate-500">{co.memberCount} members · {co.createdAt ? new Date(co.createdAt).toLocaleDateString() : '—'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {co.calendarId
                                                ? <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase tracking-widest">Cal ✓</span>
                                                : <span className="text-[9px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full uppercase tracking-widest">No Cal</span>
                                            }
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* ══ WORKSPACES ════════════════════════════════════════════════ */}
                {tab === 'workspaces' && (
                    <div className="max-w-6xl mx-auto space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="relative pl-4">
                                <div className="absolute left-0 top-0 w-0.5 h-full bg-gradient-to-b from-primary-500 to-transparent rounded-full" />
                                <h1 className="text-2xl font-black text-white uppercase tracking-tight">All Workspaces</h1>
                                <p className="text-slate-500 text-xs mt-0.5">{companies.length} workspaces across the platform</p>
                            </div>
                            <div className="bg-dark-800 border border-dark-700 rounded-xl px-4 py-2 flex items-center gap-2 w-64">
                                <Search size={14} className="text-slate-500" />
                                <input
                                    value={search} onChange={e => setSearch(e.target.value)}
                                    placeholder="Search workspaces…"
                                    className="bg-transparent text-white text-xs outline-none w-full placeholder:text-slate-600"
                                />
                                {search && <button onClick={() => setSearch('')}><X size={12} className="text-slate-500" /></button>}
                            </div>
                        </div>

                        {loadingCo ? (
                            <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-primary-500" /></div>
                        ) : (
                            <div className="bg-dark-800/40 border border-dark-700/50 rounded-2xl overflow-hidden">
                                <table className="w-full text-left border-separate border-spacing-y-0">
                                    <thead>
                                        <tr className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-dark-700">
                                            <th className="px-5 py-3">Workspace</th>
                                            <th className="px-5 py-3 hidden md:table-cell">Members</th>
                                            <th className="px-5 py-3 hidden lg:table-cell">Created</th>
                                            <th className="px-5 py-3">Calendar</th>
                                            <th className="px-5 py-3" />
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-dark-700/40">
                                        {filteredCompanies.map(co => (
                                            <tr key={co.id} className="hover:bg-dark-700/20 transition-colors group">
                                                <td className="px-5 py-3.5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-xl bg-primary-600/20 border border-primary-500/20 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                                            {co.name?.charAt(0)?.toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-white">{co.name}</p>
                                                            <p className="text-[10px] text-slate-500 truncate max-w-[180px]">{co.id}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3.5 hidden md:table-cell">
                                                    <span className="text-sm font-bold text-white">{co.memberCount}</span>
                                                </td>
                                                <td className="px-5 py-3.5 hidden lg:table-cell">
                                                    <span className="text-xs text-slate-400">{co.createdAt ? new Date(co.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</span>
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    {co.calendarId ? (
                                                        <a href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(co.calendarId)}`}
                                                            target="_blank" rel="noopener noreferrer"
                                                            className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold hover:text-emerald-300 transition-colors">
                                                            <CheckCircle2 size={13} /> Active <ExternalLink size={10} />
                                                        </a>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleCreateCalendar(co)}
                                                            disabled={!calConnected || creatingCal === co.id}
                                                            className="flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 disabled:opacity-40 transition-colors"
                                                        >
                                                            {creatingCal === co.id
                                                                ? <><Loader2 size={12} className="animate-spin" /> Creating…</>
                                                                : <><Plus size={12} /> Create Cal</>
                                                            }
                                                        </button>
                                                    )}
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <button
                                                        onClick={() => handleDeleteWorkspace(co)}
                                                        className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                                                        title="Delete workspace"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {filteredCompanies.length === 0 && (
                                            <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-600 text-sm">No workspaces found</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* ══ USERS ═════════════════════════════════════════════════════ */}
                {tab === 'users' && (
                    <div className="max-w-6xl mx-auto space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="relative pl-4">
                                <div className="absolute left-0 top-0 w-0.5 h-full bg-gradient-to-b from-primary-500 to-transparent rounded-full" />
                                <h1 className="text-2xl font-black text-white uppercase tracking-tight">All Users</h1>
                                <p className="text-slate-500 text-xs mt-0.5">{users.length} registered users on the platform</p>
                            </div>
                            <div className="bg-dark-800 border border-dark-700 rounded-xl px-4 py-2 flex items-center gap-2 w-64">
                                <Search size={14} className="text-slate-500" />
                                <input
                                    value={userSearch} onChange={e => setUserSearch(e.target.value)}
                                    placeholder="Search users…"
                                    className="bg-transparent text-white text-xs outline-none w-full placeholder:text-slate-600"
                                />
                                {userSearch && <button onClick={() => setUserSearch('')}><X size={12} className="text-slate-500" /></button>}
                            </div>
                        </div>

                        {loadingU ? (
                            <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-primary-500" /></div>
                        ) : (
                            <div className="bg-dark-800/40 border border-dark-700/50 rounded-2xl overflow-hidden">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-dark-700">
                                            <th className="px-5 py-3">User</th>
                                            <th className="px-5 py-3 hidden md:table-cell">Email</th>
                                            <th className="px-5 py-3">Role</th>
                                            <th className="px-5 py-3 hidden lg:table-cell">UID</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-dark-700/40">
                                        {filteredUsers.map(u => {
                                            const isMaster = u.email === MASTER_ADMIN_EMAIL;
                                            const roleColor = {
                                                master_admin: 'bg-primary-500/10 text-primary-400 border-primary-500/20',
                                                admin:        'bg-amber-500/10  text-amber-400  border-amber-500/20',
                                                member:       'bg-slate-500/10  text-slate-400  border-slate-500/20',
                                            }[u.role] || 'bg-slate-500/10 text-slate-400 border-slate-500/20';

                                            return (
                                                <tr key={u.id} className="hover:bg-dark-700/20 transition-colors group">
                                                    <td className="px-5 py-3.5">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-xl bg-dark-700 border border-dark-600 flex items-center justify-center overflow-hidden shrink-0">
                                                                {u.photoURL
                                                                    ? <img src={u.photoURL} alt="" className="w-full h-full object-cover" />
                                                                    : <span className="text-xs font-bold text-slate-400">{(u.name || u.email || '?').charAt(0).toUpperCase()}</span>
                                                                }
                                                            </div>
                                                            <p className="text-sm font-bold text-white">{u.name || u.displayName || '—'}</p>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-3.5 hidden md:table-cell">
                                                        <span className="text-xs text-slate-400">{u.email}</span>
                                                    </td>
                                                    <td className="px-5 py-3.5">
                                                        {isMaster ? (
                                                            <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${roleColor}`}>
                                                                Master Admin
                                                            </span>
                                                        ) : (
                                                            <select
                                                                value={u.role || 'member'}
                                                                onChange={e => handleRoleChange(u.id, e.target.value)}
                                                                className="bg-dark-800 border border-dark-600 rounded-lg px-2 py-1 text-[10px] font-bold text-slate-300 uppercase tracking-widest outline-none focus:border-primary-500 cursor-pointer"
                                                            >
                                                                <option value="master_admin">Master Admin</option>
                                                                <option value="admin">Admin</option>
                                                                <option value="operation_manager">Ops Manager</option>
                                                                <option value="member">Member</option>
                                                            </select>
                                                        )}
                                                    </td>
                                                    <td className="px-5 py-3.5 hidden lg:table-cell">
                                                        <span className="text-[10px] text-slate-600 font-mono">{u.id}</span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {filteredUsers.length === 0 && (
                                            <tr><td colSpan={4} className="px-5 py-10 text-center text-slate-600 text-sm">No users found</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* ══ CALENDAR ══════════════════════════════════════════════════ */}
                {tab === 'calendar' && (
                    <div className="max-w-4xl mx-auto space-y-6">
                        <div className="relative pl-4">
                            <div className="absolute left-0 top-0 w-0.5 h-full bg-gradient-to-b from-primary-500 to-transparent rounded-full" />
                            <h1 className="text-2xl font-black text-white uppercase tracking-tight">Calendar Management</h1>
                            <p className="text-slate-500 text-xs mt-0.5">
                                Connect <strong className="text-slate-300">{MASTER_ADMIN_EMAIL}</strong> to power all workspace calendars.
                            </p>
                        </div>

                        {/* Connection Card */}
                        <div className={`border rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-5 ${
                            calConnected
                                ? 'bg-emerald-500/5 border-emerald-500/20'
                                : 'bg-amber-500/5 border-amber-500/20'
                        }`}>
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 ${
                                    calConnected ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-amber-500/10 border-amber-500/20'
                                }`}>
                                    <CalendarDays size={22} className={calConnected ? 'text-emerald-400' : 'text-amber-400'} />
                                </div>
                                <div>
                                    <p className="text-base font-black text-white">
                                        {calChecking ? 'Checking connection…' : calConnected ? 'Google Calendar Connected' : 'Google Calendar Not Connected'}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        {calConnected
                                            ? `${MASTER_ADMIN_EMAIL} · All workspace calendars are managed through this account.`
                                            : 'Connect to enable automatic calendar creation, event sync, and team invitations.'}
                                    </p>
                                </div>
                            </div>
                            <div className="shrink-0 flex items-center gap-3">
                                {calConnected ? (
                                    <>
                                        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-black uppercase tracking-widest">
                                            <CheckCircle2 size={13} /> Active
                                        </div>
                                        <button onClick={handleDisconnectCalendar}
                                            className="text-xs text-slate-500 hover:text-rose-400 underline transition-colors">
                                            Disconnect
                                        </button>
                                        <button onClick={handleConnectCalendar} disabled={connecting}
                                            className="flex items-center gap-2 px-4 py-2 bg-dark-700 hover:bg-dark-600 border border-dark-600 text-white text-xs font-bold rounded-xl transition-all">
                                            <RefreshCw size={12} className={connecting ? 'animate-spin' : ''} />
                                            Re-authorize
                                        </button>
                                    </>
                                ) : (
                                    <button onClick={handleConnectCalendar} disabled={connecting || calChecking}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-slate-100 text-dark-900 font-black text-xs rounded-xl transition-all disabled:opacity-50 shadow-lg">
                                        {connecting
                                            ? <Loader2 size={14} className="animate-spin" />
                                            : <Calendar size={14} className="text-blue-600" />
                                        }
                                        {connecting ? 'Connecting…' : 'Connect Google Calendar'}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* How it works */}
                        <div className="bg-dark-800/40 border border-dark-700/50 rounded-2xl p-6">
                            <h3 className="text-sm font-black text-white uppercase tracking-tight mb-4 flex items-center gap-2">
                                <Sparkles size={15} className="text-primary-400" /> How it works
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {[
                                    { icon: <Building2 size={14} />, title: 'Workspace Created', desc: 'A dedicated Google Calendar is automatically created and linked to the workspace.' },
                                    { icon: <Users size={14} />, title: 'Member Added', desc: 'The workspace calendar is shared with the new member. They get an email invite.' },
                                    { icon: <CalendarDays size={14} />, title: 'Meeting Scheduled', desc: 'Event is created on the workspace calendar. All participants get email invitations.' },
                                    { icon: <CheckCircle2 size={14} />, title: 'Personal Calendars Updated', desc: 'Members accept once — all future events appear automatically in their Google Calendar.' },
                                ].map((item, i) => (
                                    <div key={i} className="flex items-start gap-3 p-3 bg-dark-900/50 rounded-xl border border-dark-700/50">
                                        <div className="w-7 h-7 rounded-lg bg-primary-500/10 border border-primary-500/20 text-primary-400 flex items-center justify-center shrink-0 mt-0.5">
                                            {item.icon}
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-white">{item.title}</p>
                                            <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{item.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Workspace Calendar Status */}
                        <div className="bg-dark-800/40 border border-dark-700/50 rounded-2xl overflow-hidden">
                            <div className="px-5 py-4 border-b border-dark-700/50 flex items-center justify-between">
                                <h3 className="text-sm font-black text-white uppercase tracking-tight">Workspace Calendars</h3>
                                <span className="text-[10px] text-slate-500">{stats.withCal} of {stats.workspaces} active</span>
                            </div>
                            <div className="divide-y divide-dark-700/40">
                                {loadingCo ? (
                                    <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-primary-500" /></div>
                                ) : companies.map(co => (
                                    <div key={co.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-dark-700/20 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-7 h-7 rounded-lg bg-primary-600/20 border border-primary-500/20 flex items-center justify-center text-white text-[10px] font-bold">
                                                {co.name?.charAt(0)?.toUpperCase()}
                                            </div>
                                            <span className="text-sm font-semibold text-white">{co.name}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {co.calendarId ? (
                                                <>
                                                    <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase tracking-widest">Connected</span>
                                                    <a href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(co.calendarId)}`}
                                                        target="_blank" rel="noopener noreferrer"
                                                        className="p-1.5 text-slate-500 hover:text-primary-400 hover:bg-primary-500/10 rounded-lg transition-all">
                                                        <ExternalLink size={13} />
                                                    </a>
                                                </>
                                            ) : (
                                                <button onClick={() => handleCreateCalendar(co)}
                                                    disabled={!calConnected || creatingCal === co.id}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-500 disabled:opacity-40 text-white text-[10px] font-black rounded-xl transition-all uppercase tracking-widest">
                                                    {creatingCal === co.id
                                                        ? <><Loader2 size={10} className="animate-spin" /> Creating…</>
                                                        : <><Plus size={10} /> Create</>
                                                    }
                                                </button>
                                            )}
                                        </div>
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
