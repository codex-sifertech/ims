import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Users, ArrowUpRight, Clock, Calendar, Search, Filter,
    MoreVertical, Flame, UserCircle2, Timer, Zap, Trophy,
    Download, ChevronDown, X, UserPlus, Shield, UserMinus,
    CheckCircle2, AlertCircle, ChevronRight, RefreshCw
} from 'lucide-react';
import {
    collection, onSnapshot, query, where, orderBy,
    getDocs, setDoc, doc, deleteDoc, addDoc, limit, serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import useStore from '../store/useStore';
import { format, isToday, startOfMonth, endOfMonth, isSameDay, startOfWeek } from 'date-fns';

// ─── Helpers ────────────────────────────────────────────────────────────────

function exportCSV(rows, filename) {
    const headers = ['Name', 'Date', 'Clock In', 'Clock Out', 'Duration (min)'];
    const lines = rows.map(r => [
        r.userName, r.date,
        r.startTime ? format(new Date(r.startTime), 'HH:mm') : '-',
        r.endTime ? format(new Date(r.endTime), 'HH:mm') : 'Active',
        r.durationMinutes ?? '-'
    ]);
    const csv = [headers, ...lines].map(l => l.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
}

function safeDate(val) {
    if (!val) return null;
    try {
        if (typeof val?.toDate === 'function') return val.toDate();
        return new Date(val);
    } catch { return null; }
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function DrillDownModal({ member, logs, onClose }) {
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const filtered = useMemo(() => {
        return logs.filter(l => {
            if (from && l.date < from) return false;
            if (to && l.date > to) return false;
            return true;
        }).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    }, [logs, from, to]);

    return (
        <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="bg-dark-900 border border-dark-700 rounded-3xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
                <div className="flex items-center justify-between p-6 border-b border-dark-700">
                    <h3 className="text-lg font-black text-white uppercase tracking-tight">
                        {member.name} — Session History
                    </h3>
                    <button onClick={onClose} className="p-2 text-slate-500 hover:text-white rounded-lg hover:bg-dark-700">
                        <X size={18} />
                    </button>
                </div>
                <div className="flex items-center gap-3 px-6 py-3 border-b border-dark-700">
                    <input type="date" value={from} onChange={e => setFrom(e.target.value)}
                        className="bg-dark-800 border border-dark-600 rounded-lg px-3 py-1.5 text-xs text-white outline-none" />
                    <span className="text-slate-500 text-xs">to</span>
                    <input type="date" value={to} onChange={e => setTo(e.target.value)}
                        className="bg-dark-800 border border-dark-600 rounded-lg px-3 py-1.5 text-xs text-white outline-none" />
                    <button
                        onClick={() => exportCSV(filtered, `${member.name}_logs.csv`)}
                        className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-500 text-white text-xs font-bold rounded-lg transition-all"
                    >
                        <Download size={12} /> Export CSV
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <table className="w-full text-xs text-left">
                        <thead className="sticky top-0 bg-dark-900 border-b border-dark-700">
                            <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                <th className="px-6 py-3">Date</th>
                                <th className="px-6 py-3">Clock In</th>
                                <th className="px-6 py-3">Clock Out</th>
                                <th className="px-6 py-3">Duration</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(l => (
                                <tr key={l.id} className="border-b border-dark-800 hover:bg-dark-800/50">
                                    <td className="px-6 py-3 text-slate-300">{l.date || '-'}</td>
                                    <td className="px-6 py-3 text-emerald-400">
                                        {l.startTime ? format(new Date(l.startTime), 'HH:mm') : '-'}
                                    </td>
                                    <td className="px-6 py-3 text-amber-400">
                                        {l.endTime ? format(new Date(l.endTime), 'HH:mm')
                                            : <span className="text-emerald-500">Active</span>}
                                    </td>
                                    <td className="px-6 py-3 text-white font-bold">
                                        {l.durationMinutes != null ? `${l.durationMinutes}m` : '-'}
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-600">No sessions found</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function InviteMemberModal({ activeCompany, user, onClose }) {
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [role, setRole] = useState('member');
    const [status, setStatus] = useState(null); // null | 'loading' | 'success' | 'error'
    const [errMsg, setErrMsg] = useState('');

    const handleInvite = async () => {
        const trimmedEmail = email.trim().toLowerCase();
        if (!trimmedEmail || !name.trim()) {
            setErrMsg('Name and email are required.');
            setStatus('error');
            return;
        }
        setStatus('loading');
        setErrMsg('');
        try {
            // Check if already a member by email
            const membersRef = collection(db, 'companies', activeCompany.id, 'members');
            const existing = await getDocs(query(membersRef, where('email', '==', trimmedEmail)));
            if (!existing.empty) {
                setErrMsg('This email is already a member of the workspace.');
                setStatus('error');
                return;
            }

            // Add a pending member document (uid = email placeholder until they log in)
            const pendingId = `pending_${Date.now()}`;
            await setDoc(doc(db, 'companies', activeCompany.id, 'members', pendingId), {
                email: trimmedEmail,
                name: name.trim(),
                role,
                status: 'invited',
                invitedBy: user.uid,
                invitedAt: new Date().toISOString(),
                isPending: true,
            });

            // Add email to company accessList so they can log in and see this workspace
            const companyRef = doc(db, 'companies', activeCompany.id);
            const companySnap = await getDocs(query(collection(db, 'companies'), where('__name__', '==', activeCompany.id)));
            if (!companySnap.empty) {
                const currentList = companySnap.docs[0].data().accessList || [];
                if (!currentList.includes(trimmedEmail)) {
                    await setDoc(companyRef, { accessList: [...currentList, trimmedEmail] }, { merge: true });
                }
            }

            setStatus('success');
        } catch (err) {
            console.error('Invite error:', err);
            setErrMsg(err.message || 'Failed to invite member.');
            setStatus('error');
        }
    };

    return (
        <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="bg-dark-900 border border-dark-700 rounded-3xl w-full max-w-md shadow-2xl">
                <div className="flex items-center justify-between p-6 border-b border-dark-700">
                    <h3 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                        <UserPlus size={20} className="text-primary-400" /> Invite Member
                    </h3>
                    <button onClick={onClose} className="p-2 text-slate-500 hover:text-white rounded-lg hover:bg-dark-700">
                        <X size={18} />
                    </button>
                </div>

                {status === 'success' ? (
                    <div className="p-8 flex flex-col items-center gap-4 text-center">
                        <div className="w-14 h-14 bg-emerald-500/10 rounded-full flex items-center justify-center">
                            <CheckCircle2 size={28} className="text-emerald-400" />
                        </div>
                        <p className="text-white font-bold">Member added to workspace!</p>
                        <p className="text-slate-400 text-sm">
                            <span className="text-primary-400">{email}</span> will have access when they log in.
                        </p>
                        <button onClick={onClose}
                            className="mt-2 px-6 py-2.5 bg-primary-600 hover:bg-primary-500 text-white text-sm font-bold rounded-xl transition-colors">
                            Done
                        </button>
                    </div>
                ) : (
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">Full Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="e.g. John Doe"
                                className="w-full bg-dark-800 border border-dark-600 focus:border-primary-500 rounded-xl px-4 py-2.5 text-sm text-white outline-none transition-colors"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">Email Address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="member@company.com"
                                className="w-full bg-dark-800 border border-dark-600 focus:border-primary-500 rounded-xl px-4 py-2.5 text-sm text-white outline-none transition-colors"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">Role</label>
                            <select
                                value={role}
                                onChange={e => setRole(e.target.value)}
                                className="w-full bg-dark-800 border border-dark-600 focus:border-primary-500 rounded-xl px-4 py-2.5 text-sm text-white outline-none transition-colors"
                            >
                                <option value="member">Member</option>
                                <option value="admin">Admin</option>
                                <option value="operation_manager">Operation Manager</option>
                            </select>
                        </div>

                        {status === 'error' && (
                            <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3 text-rose-400 text-sm">
                                <AlertCircle size={16} /> {errMsg}
                            </div>
                        )}

                        <button
                            onClick={handleInvite}
                            disabled={status === 'loading'}
                            className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary-600 hover:bg-primary-500 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {status === 'loading'
                                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Adding...</>
                                : <><UserPlus size={16} /> Add to Workspace</>
                            }
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

function MemberActionsMenu({ member, activeCompany, currentUser, isAdmin, onClose }) {
    const [confirmRemove, setConfirmRemove] = useState(false);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState('');

    const isSelf = member.id === currentUser?.uid;

    const handleRoleChange = async (newRole) => {
        if (!activeCompany?.id) return;
        setLoading(true);
        try {
            await setDoc(doc(db, 'companies', activeCompany.id, 'members', member.id), { role: newRole }, { merge: true });
            onClose();
        } catch (e) {
            setErr('Failed to update role.');
        } finally {
            setLoading(false);
        }
    };

    const handleRemove = async () => {
        if (!activeCompany?.id) return;
        setLoading(true);
        try {
            await deleteDoc(doc(db, 'companies', activeCompany.id, 'members', member.id));
            // Remove from accessList
            const companyRef = doc(db, 'companies', activeCompany.id);
            const snap = await getDocs(query(collection(db, 'companies'), where('__name__', '==', activeCompany.id)));
            if (!snap.empty) {
                const current = snap.docs[0].data().accessList || [];
                await setDoc(companyRef, { accessList: current.filter(e => e !== member.email) }, { merge: true });
            }
            onClose();
        } catch (e) {
            setErr('Failed to remove member.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[300] bg-black/40 backdrop-blur-sm flex items-center justify-center p-6" onClick={onClose}>
            <div className="bg-dark-800 border border-dark-700 rounded-2xl w-64 shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-dark-700">
                    <p className="text-white font-bold text-sm">{member.name}</p>
                    <p className="text-slate-500 text-[11px]">{member.email}</p>
                </div>
                {!confirmRemove ? (
                    <div className="p-2">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-3 py-2">Change Role</p>
                        {['member', 'admin', 'operation_manager'].map(r => (
                            <button key={r}
                                onClick={() => handleRoleChange(r)}
                                disabled={loading || member.role === r}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-colors ${
                                    member.role === r ? 'text-primary-400 bg-primary-500/10' : 'text-slate-300 hover:bg-dark-700'
                                } disabled:opacity-50`}
                            >
                                <span className="capitalize">{r.replace('_', ' ')}</span>
                                {member.role === r && <CheckCircle2 size={14} />}
                            </button>
                        ))}
                        {!isSelf && (
                            <>
                                <div className="border-t border-dark-700 my-2" />
                                <button
                                    onClick={() => setConfirmRemove(true)}
                                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-rose-400 hover:bg-rose-500/10 transition-colors"
                                >
                                    <UserMinus size={14} /> Remove from Workspace
                                </button>
                            </>
                        )}
                        {err && <p className="text-rose-400 text-xs px-3 pb-2">{err}</p>}
                    </div>
                ) : (
                    <div className="p-4 space-y-3">
                        <p className="text-white text-sm font-bold">Remove {member.name}?</p>
                        <p className="text-slate-400 text-xs">They will lose access to this workspace immediately.</p>
                        <div className="flex gap-2">
                            <button onClick={() => setConfirmRemove(false)}
                                className="flex-1 py-2 text-sm text-slate-400 hover:text-white bg-dark-700 hover:bg-dark-600 rounded-xl transition-colors">
                                Cancel
                            </button>
                            <button onClick={handleRemove} disabled={loading}
                                className="flex-1 py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition-colors disabled:opacity-60">
                                {loading ? 'Removing...' : 'Remove'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function PeopleHR() {
    const navigate = useNavigate();
    const { activeCompany, user } = useStore();
    const [members, setMembers] = useState([]);
    const [timeLogs, setTimeLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'active' | 'offline'
    const [filterRole, setFilterRole] = useState('all');
    const [showFilter, setShowFilter] = useState(false);
    const [drillMember, setDrillMember] = useState(null);
    const [showInvite, setShowInvite] = useState(false);
    const [actionsMember, setActionsMember] = useState(null);
    const [refreshingLogs, setRefreshingLogs] = useState(false);

    const myRole = useMemo(() => members.find(m => m.id === user?.uid)?.role || 'member', [members, user?.uid]);
    const isAdmin = myRole === 'admin' || myRole === 'master_admin' || myRole === 'owner' || user?.role === 'master_admin';

    // ── Data fetching ─────────────────────────────────────────────────────────

    useEffect(() => {
        if (!activeCompany?.id) return;

        const membersRef = collection(db, 'companies', activeCompany.id, 'members');
        const unsubMembers = onSnapshot(membersRef, (snap) => {
            setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        }, () => setLoading(false));

        fetchTimeLogs();

        return () => unsubMembers();
    }, [activeCompany?.id]);

    const fetchTimeLogs = async () => {
        if (!activeCompany?.id) return;
        setRefreshingLogs(true);
        try {
            const tlRef = collection(db, 'companies', activeCompany.id, 'timeLogs');
            // Fetch last 500 logs sorted by date desc
            const tlSnap = await getDocs(query(tlRef, orderBy('date', 'desc'), limit(500)));
            setTimeLogs(tlSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) {
            console.error('timeLogs fetch error:', e);
        } finally {
            setRefreshingLogs(false);
        }
    };

    // ── Stats computation ─────────────────────────────────────────────────────

    const memberStats = useMemo(() => {
        const now = new Date();
        const weekStart = startOfWeek(now).toISOString().split('T')[0];
        const monthStart = startOfMonth(now).toISOString().split('T')[0];

        return members.map(member => {
            const mLogs = timeLogs.filter(l => l.userId === member.id);
            // Only closed sessions for hour totals (durationMinutes != null)
            const closedLogs = mLogs.filter(l => l.durationMinutes != null);

            const weekMins = closedLogs
                .filter(l => l.date >= weekStart)
                .reduce((s, l) => s + (l.durationMinutes || 0), 0);

            const monthMins = closedLogs
                .filter(l => l.date >= monthStart)
                .reduce((s, l) => s + (l.durationMinutes || 0), 0);

            // Streak: consecutive days with at least one closed session (last 30 days)
            let streak = 0;
            for (let i = 0; i < 30; i++) {
                const checkDate = new Date(now);
                checkDate.setDate(now.getDate() - i);
                const dateStr = checkDate.toISOString().split('T')[0];
                const hasLog = closedLogs.some(l => l.date === dateStr);
                if (hasLog) streak++;
                else if (i > 0) break;
            }

            // Last activity date
            const lastLog = closedLogs[0]; // already sorted desc

            // Safe lastSeen format
            const lastSeenDate = safeDate(member.lastSeen) || safeDate(lastLog?.startTime);
            const lastSeen = lastSeenDate
                ? format(lastSeenDate, 'MMM dd, HH:mm')
                : 'Never';

            return {
                ...member,
                streak,
                weekHours: (weekMins / 60).toFixed(1),
                monthHours: (monthMins / 60).toFixed(1),
                lastSeen,
                status: member.status || 'offline',
            };
        });
    }, [members, timeLogs]);

    const companyStats = useMemo(() => {
        if (!memberStats.length) return { avgMonthHours: 0, highStreak: 0, activeCount: 0, topPerformer: 'N/A' };
        const totalMonthMins = memberStats.reduce((s, m) => s + parseFloat(m.monthHours), 0);
        const avgMonthHours = (totalMonthMins / memberStats.length).toFixed(1);
        const highStreak = Math.max(...memberStats.map(m => m.streak), 0);
        const activeCount = memberStats.filter(m => m.status === 'active').length;
        const topPerformer = [...memberStats].sort((a, b) => parseFloat(b.monthHours) - parseFloat(a.monthHours))[0]?.name || 'N/A';
        return { avgMonthHours, highStreak, activeCount, topPerformer };
    }, [memberStats]);

    const todayActivity = useMemo(() => {
        const todayStr = new Date().toISOString().split('T')[0];
        return timeLogs
            .filter(l => l.date === todayStr)
            .sort((a, b) => (b.startTime || '').localeCompare(a.startTime || ''));
    }, [timeLogs]);

    const filteredMembers = useMemo(() => {
        let result = memberStats;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(m =>
                m.name?.toLowerCase().includes(q) ||
                m.email?.toLowerCase().includes(q) ||
                m.role?.toLowerCase().includes(q)
            );
        }
        if (filterStatus !== 'all') {
            result = result.filter(m => m.status === filterStatus);
        }
        if (filterRole !== 'all') {
            result = result.filter(m => m.role === filterRole);
        }
        return result;
    }, [memberStats, searchQuery, filterStatus, filterRole]);

    // ── Render ────────────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-slate-500 font-black uppercase tracking-widest text-[10px]">Loading Workforce Data...</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">

                {/* ── Header ── */}
                <div className="mb-10 flex items-center justify-between">
                    <div>
                        <h1 className="text-4xl font-black text-white tracking-tighter uppercase flex items-center gap-4">
                            <Users className="text-primary-500" size={40} />
                            People & HR
                        </h1>
                        <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] mt-2">
                            Workforce performance, attendance & team management
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="bg-dark-800/50 border border-white/5 rounded-2xl px-5 py-3 flex flex-col items-end">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Now</span>
                            <span className="text-2xl font-black text-emerald-500">
                                {companyStats.activeCount} / {members.length}
                            </span>
                        </div>
                        {isAdmin && (
                            <button
                                onClick={() => setShowInvite(true)}
                                className="flex items-center gap-2 px-5 py-3 bg-primary-600 hover:bg-primary-500 text-white text-sm font-bold rounded-2xl transition-colors"
                            >
                                <UserPlus size={18} /> Invite Member
                            </button>
                        )}
                    </div>
                </div>

                {/* ── Quick Stats Grid ── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-10">
                    {[
                        { label: 'Avg Monthly Hours', value: `${companyStats.avgMonthHours}h`, icon: Timer, color: 'text-primary-500' },
                        { label: 'Company High Streak', value: `${companyStats.highStreak} Days`, icon: Flame, color: 'text-orange-500' },
                        { label: 'Active Today', value: `${companyStats.activeCount}`, icon: Zap, color: 'text-emerald-500' },
                        { label: 'Top Performer', value: companyStats.topPerformer, icon: Trophy, color: 'text-purple-500' },
                    ].map((stat, i) => (
                        <div key={i} className="bg-dark-800/40 border border-white/5 p-5 rounded-3xl backdrop-blur-sm">
                            <div className="flex items-center justify-between mb-3">
                                <div className={`p-2.5 rounded-xl bg-dark-900 border border-white/5 ${stat.color}`}>
                                    <stat.icon size={18} />
                                </div>
                                <ArrowUpRight size={14} className="text-emerald-500 opacity-60" />
                            </div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{stat.label}</p>
                            <h3 className="text-xl font-black text-white mt-1 truncate">{stat.value}</h3>
                        </div>
                    ))}
                </div>

                {/* ── Today's Activity ── */}
                {todayActivity.length > 0 && (
                    <div className="bg-dark-800/40 border border-white/5 rounded-3xl p-6 backdrop-blur-md mb-8">
                        <h2 className="text-sm font-black text-white uppercase tracking-tight mb-4 flex items-center gap-2">
                            <Calendar size={16} className="text-primary-500" /> Today's Activity
                        </h2>
                        <div className="flex flex-wrap gap-3">
                            {todayActivity.map(log => {
                                const member = members.find(m => m.id === log.userId);
                                const isActive = !log.endTime;
                                return (
                                    <div key={log.id}
                                        className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border text-xs font-bold ${
                                            isActive
                                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                                : 'bg-dark-900 border-dark-700 text-slate-400'
                                        }`}
                                    >
                                        <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
                                        <span>{log.userName || member?.name || 'Unknown'}</span>
                                        <span className="opacity-60">
                                            {log.startTime ? format(new Date(log.startTime), 'HH:mm') : ''}
                                            {log.endTime ? ` → ${format(new Date(log.endTime), 'HH:mm')}` : ' → Now'}
                                        </span>
                                        {log.durationMinutes != null && (
                                            <span className="bg-dark-700 px-1.5 py-0.5 rounded-md">{log.durationMinutes}m</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ── Members Directory ── */}
                <div className="bg-dark-800/40 border border-white/5 rounded-[3rem] p-8 backdrop-blur-md mb-8">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
                        <div>
                            <h2 className="text-xl font-black text-white uppercase tracking-tight">Workforce Directory</h2>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">
                                {filteredMembers.length} of {members.length} members
                            </p>
                        </div>
                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <div className="bg-dark-900 border border-white/5 rounded-2xl px-4 py-2.5 flex items-center gap-3 flex-1 md:w-72 focus-within:border-primary-500/50 transition-all">
                                <Search className="text-slate-500 shrink-0" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search name, email, role..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="bg-transparent border-none text-white text-sm outline-none w-full placeholder:text-slate-600"
                                />
                                {searchQuery && (
                                    <button onClick={() => setSearchQuery('')}>
                                        <X size={14} className="text-slate-500 hover:text-white" />
                                    </button>
                                )}
                            </div>
                            <div className="relative">
                                <button
                                    onClick={() => setShowFilter(v => !v)}
                                    className={`p-2.5 border rounded-2xl transition-colors ${showFilter ? 'bg-primary-600/10 border-primary-500/40 text-primary-400' : 'bg-dark-900 border-white/5 text-slate-400 hover:text-white'}`}
                                >
                                    <Filter size={18} />
                                </button>
                                {showFilter && (
                                    <div className="absolute right-0 top-12 z-20 bg-dark-800 border border-dark-600 rounded-2xl p-4 w-52 shadow-2xl">
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Status</p>
                                        {['all', 'active', 'checked-out', 'offline'].map(s => (
                                            <button key={s} onClick={() => setFilterStatus(s)}
                                                className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-colors mb-1 capitalize ${filterStatus === s ? 'bg-primary-500/10 text-primary-400' : 'text-slate-300 hover:bg-dark-700'}`}>
                                                {s === 'all' ? 'All Statuses' : s}
                                            </button>
                                        ))}
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-3 mb-2">Role</p>
                                        {['all', 'admin', 'member', 'operation_manager'].map(r => (
                                            <button key={r} onClick={() => setFilterRole(r)}
                                                className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-colors mb-1 capitalize ${filterRole === r ? 'bg-primary-500/10 text-primary-400' : 'text-slate-300 hover:bg-dark-700'}`}>
                                                {r === 'all' ? 'All Roles' : r.replace('_', ' ')}
                                            </button>
                                        ))}
                                        {(filterStatus !== 'all' || filterRole !== 'all') && (
                                            <button
                                                onClick={() => { setFilterStatus('all'); setFilterRole('all'); }}
                                                className="w-full mt-2 py-2 text-xs text-rose-400 hover:text-rose-300 font-bold"
                                            >
                                                Clear Filters
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-separate border-spacing-y-3">
                            <thead>
                                <tr className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                                    <th className="px-5 pb-2">Member</th>
                                    <th className="px-5 pb-2">Status</th>
                                    <th className="px-5 pb-2 text-center">Streak</th>
                                    <th className="px-5 pb-2">This Month</th>
                                    <th className="px-5 pb-2">This Week</th>
                                    <th className="px-5 pb-2">Last Active</th>
                                    {isAdmin && <th className="px-5 pb-2" />}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredMembers.map(member => (
                                    <tr
                                        key={member.id}
                                        className="group bg-dark-900/40 hover:bg-dark-900/80 transition-all duration-200 cursor-pointer"
                                        onClick={() => navigate(`/dashboard/people/${member.id}`)}
                                    >
                                        <td className="px-5 py-4 rounded-l-2xl border-y border-l border-white/5 group-hover:border-primary-500/20">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-2xl bg-dark-800 border border-white/5 flex items-center justify-center text-slate-400 overflow-hidden shrink-0 group-hover:border-primary-500/30 transition-colors">
                                                    {member.photoURL
                                                        ? <img src={member.photoURL} alt="" className="w-full h-full object-cover" />
                                                        : <UserCircle2 size={22} />
                                                    }
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="text-sm font-black text-white group-hover:text-primary-400 transition-colors">
                                                            {member.name || 'Anonymous'}
                                                        </h4>
                                                        {member.isPending && (
                                                            <span className="text-[9px] font-black bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded-full uppercase">
                                                                Invited
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                                        {member.role === 'admin' && <Shield size={9} className="text-primary-400" />}
                                                        {member.role || 'Member'}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 border-y border-white/5 group-hover:border-primary-500/20">
                                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-black uppercase ${
                                                member.status === 'active'
                                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                    : member.status === 'checked-out'
                                                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                                    : 'bg-slate-500/10 text-slate-500 border-slate-500/20'
                                            }`}>
                                                <div className={`w-1.5 h-1.5 rounded-full ${
                                                    member.status === 'active' ? 'bg-emerald-500 animate-pulse' :
                                                    member.status === 'checked-out' ? 'bg-amber-500' : 'bg-slate-600'
                                                }`} />
                                                {member.status || 'offline'}
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 border-y border-white/5 group-hover:border-primary-500/20 text-center">
                                            <div className="flex flex-col items-center gap-0.5">
                                                <div className="flex items-center gap-1 text-orange-500">
                                                    <Flame size={14} fill={member.streak > 0 ? 'currentColor' : 'none'} />
                                                    <span className="text-base font-black">{member.streak}</span>
                                                </div>
                                                <span className="text-[9px] font-black text-slate-600 uppercase">days</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 border-y border-white/5 group-hover:border-primary-500/20">
                                            <div>
                                                <span className="text-white font-black">{member.monthHours}h</span>
                                                <div className="w-20 h-1 bg-dark-800 rounded-full mt-1.5 overflow-hidden">
                                                    <div className="h-full bg-primary-500 rounded-full"
                                                        style={{ width: `${Math.min((parseFloat(member.monthHours) / 160) * 100, 100)}%` }} />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 border-y border-white/5 group-hover:border-primary-500/20">
                                            <span className="text-slate-300 font-bold text-sm">{member.weekHours}h</span>
                                        </td>
                                        <td className="px-5 py-4 border-y border-white/5 group-hover:border-primary-500/20">
                                            <div className="flex items-center gap-1.5 text-slate-400">
                                                <Clock size={12} />
                                                <span className="text-[11px] font-bold">{member.lastSeen}</span>
                                            </div>
                                        </td>
                                        {isAdmin && (
                                            <td className="px-5 py-4 rounded-r-2xl border-y border-r border-white/5 group-hover:border-primary-500/20"
                                                onClick={e => { e.stopPropagation(); setActionsMember(member); }}>
                                                <button className="p-2 hover:bg-dark-700 rounded-xl text-slate-500 hover:text-white transition-all">
                                                    <MoreVertical size={16} />
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                                {filteredMembers.length === 0 && (
                                    <tr>
                                        <td colSpan={isAdmin ? 7 : 6} className="py-12 text-center text-slate-600 font-bold uppercase tracking-widest text-xs">
                                            No members match your search
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ── Time Analytics ── */}
                <div className="bg-dark-800/40 border border-white/5 rounded-[3rem] p-8 backdrop-blur-md">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                            <Timer className="text-primary-500" size={22} /> Time Analytics
                        </h2>
                        <button
                            onClick={fetchTimeLogs}
                            disabled={refreshingLogs}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-white bg-dark-900 border border-dark-700 hover:border-dark-500 rounded-xl transition-all disabled:opacity-50"
                        >
                            <RefreshCw size={12} className={refreshingLogs ? 'animate-spin' : ''} /> Refresh
                        </button>
                    </div>

                    {isAdmin ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-separate border-spacing-y-2">
                                <thead>
                                    <tr className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                                        <th className="px-4 pb-2">Name</th>
                                        <th className="px-4 pb-2">Role</th>
                                        <th className="px-4 pb-2">This Week</th>
                                        <th className="px-4 pb-2">This Month</th>
                                        <th className="px-4 pb-2">Streak</th>
                                        <th className="px-4 pb-2">Status</th>
                                        <th className="px-4 pb-2" />
                                    </tr>
                                </thead>
                                <tbody>
                                    {memberStats.map(m => (
                                        <tr key={m.id}
                                            className="bg-dark-900/40 hover:bg-dark-900/70 transition-all cursor-pointer group"
                                            onClick={() => setDrillMember(m)}>
                                            <td className="px-4 py-3 rounded-l-2xl border-y border-l border-white/5 group-hover:border-primary-500/20">
                                                <span className="font-bold text-white text-sm">{m.name || 'Unknown'}</span>
                                            </td>
                                            <td className="px-4 py-3 border-y border-white/5 group-hover:border-primary-500/20">
                                                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">{m.role}</span>
                                            </td>
                                            <td className="px-4 py-3 border-y border-white/5 group-hover:border-primary-500/20">
                                                <span className="font-black text-white">{m.weekHours}h</span>
                                            </td>
                                            <td className="px-4 py-3 border-y border-white/5 group-hover:border-primary-500/20">
                                                <span className="font-black text-white">{m.monthHours}h</span>
                                            </td>
                                            <td className="px-4 py-3 border-y border-white/5 group-hover:border-primary-500/20">
                                                <div className="flex items-center gap-1 text-orange-500">
                                                    <Flame size={12} fill={m.streak > 0 ? 'currentColor' : 'none'} />
                                                    <span className="font-black text-sm">{m.streak}d</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 border-y border-white/5 group-hover:border-primary-500/20">
                                                <span className={`text-[10px] px-2 py-1 rounded-full font-black uppercase ${
                                                    m.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-500/10 text-slate-400'
                                                }`}>{m.status || 'offline'}</span>
                                            </td>
                                            <td className="px-4 py-3 rounded-r-2xl border-y border-r border-white/5 group-hover:border-primary-500/20">
                                                <ChevronRight size={14} className="text-slate-500" />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        /* Member view — own stats only */
                        (() => {
                            const myLogs = timeLogs
                                .filter(l => l.userId === user?.uid && l.durationMinutes != null)
                                .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
                            const me = memberStats.find(m => m.id === user?.uid);
                            return (
                                <div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                        {[
                                            { label: 'Hours This Week', val: `${me?.weekHours || '0.0'}h` },
                                            { label: 'Hours This Month', val: `${me?.monthHours || '0.0'}h` },
                                            { label: 'Current Streak', val: `${me?.streak || 0} days` },
                                            { label: 'Sessions This Month', val: myLogs.filter(l => l.date >= startOfMonth(new Date()).toISOString().split('T')[0]).length },
                                        ].map(s => (
                                            <div key={s.label} className="bg-dark-900/60 border border-white/5 rounded-2xl p-5">
                                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{s.label}</p>
                                                <p className="text-2xl font-black text-white mt-1">{s.val}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <table className="w-full text-xs text-left">
                                        <thead>
                                            <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-dark-700">
                                                <th className="px-3 pb-2">Date</th>
                                                <th className="px-3 pb-2">Clock In</th>
                                                <th className="px-3 pb-2">Clock Out</th>
                                                <th className="px-3 pb-2">Duration</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {myLogs.slice(0, 20).map(l => (
                                                <tr key={l.id} className="border-b border-dark-800 hover:bg-dark-800/50">
                                                    <td className="px-3 py-2.5 text-slate-300">{l.date}</td>
                                                    <td className="px-3 py-2.5 text-emerald-400">
                                                        {l.startTime ? format(new Date(l.startTime), 'HH:mm') : '-'}
                                                    </td>
                                                    <td className="px-3 py-2.5 text-amber-400">
                                                        {l.endTime ? format(new Date(l.endTime), 'HH:mm') : 'Active'}
                                                    </td>
                                                    <td className="px-3 py-2.5 font-bold text-white">
                                                        {l.durationMinutes != null ? `${l.durationMinutes}m` : '-'}
                                                    </td>
                                                </tr>
                                            ))}
                                            {myLogs.length === 0 && (
                                                <tr><td colSpan={4} className="py-8 text-center text-slate-600">No sessions recorded yet</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            );
                        })()
                    )}
                </div>
            </div>

            {/* ── Modals ── */}
            {drillMember && (
                <DrillDownModal
                    member={drillMember}
                    logs={timeLogs.filter(l => l.userId === drillMember.id)}
                    onClose={() => setDrillMember(null)}
                />
            )}
            {showInvite && (
                <InviteMemberModal
                    activeCompany={activeCompany}
                    user={user}
                    onClose={() => setShowInvite(false)}
                />
            )}
            {actionsMember && (
                <MemberActionsMenu
                    member={actionsMember}
                    activeCompany={activeCompany}
                    currentUser={user}
                    isAdmin={isAdmin}
                    onClose={() => setActionsMember(null)}
                />
            )}
        </>
    );
}
