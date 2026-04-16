import { useState } from 'react';
import useStore from '../store/useStore';
import { Settings, Shield, User, UserPlus, CheckCircle2 } from 'lucide-react';

export default function CompanySettings() {
    const { activeCompany, user } = useStore();

    // Members data - eventually this will come from Firestore: companies/{id}/members
    const [members, setMembers] = useState([
        { id: user?.uid || '1', name: user?.name || 'IMS Founder', email: user?.email || 'founder@example.com', role: 'admin' }
    ]);

    const [inviteEmail, setInviteEmail] = useState('');

    const handleRoleChange = (memberId, newRole) => {
        setMembers(members.map(m => m.id === memberId ? { ...m, role: newRole } : m));
    };

    const handleInvite = (e) => {
        e.preventDefault();
        if (!inviteEmail.trim()) return;

        const newMember = {
            id: `mock-user-${Date.now()}`,
            name: 'Pending User',
            email: inviteEmail,
            role: 'member'
        };

        setMembers([...members, newMember]);
        setInviteEmail('');
    };

    return (
        <div className="h-full flex flex-col p-8 overflow-y-auto">
            <header className="mb-8 border-b border-dark-700 pb-6">
                <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                    <Settings className="text-slate-400" size={32} />
                    Workspace Settings
                </h1>
                <p className="text-slate-400 mt-2 max-w-2xl">
                    Manage your workspace details, invite team members, and configure access roles for {activeCompany?.name || 'this company'}.
                </p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Workspace Info */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6">
                        <h2 className="text-lg font-bold text-white mb-4">Workspace Details</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Company Name</label>
                                <input
                                    type="text"
                                    value={activeCompany?.name || ''}
                                    disabled
                                    className="w-full bg-dark-900 border border-dark-600 rounded-lg px-4 py-2 text-white focus:outline-none opacity-70 cursor-not-allowed"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Workspace ID</label>
                                <div className="bg-dark-900 text-slate-500 font-mono text-xs p-3 rounded-lg border border-dark-600 break-all">
                                    {activeCompany?.id || 'company-undefined'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Member Management */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-dark-800 border border-dark-700 rounded-2xl overflow-hidden flex flex-col h-full">
                        <div className="p-6 border-b border-dark-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-lg font-bold text-white">Team Members</h2>
                                <p className="text-sm text-slate-400">Manage who has access to this workspace.</p>
                            </div>

                            <form onSubmit={handleInvite} className="flex gap-2">
                                <div className="relative">
                                    <UserPlus size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="email"
                                        value={inviteEmail}
                                        onChange={(e) => setInviteEmail(e.target.value)}
                                        placeholder="Email address..."
                                        className="w-full sm:w-64 bg-dark-900 border border-dark-600 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-primary-500 transition-colors"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={!inviteEmail}
                                    className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-500 disabled:opacity-50 transition-colors"
                                >
                                    Invite
                                </button>
                            </form>
                        </div>

                        <div className="flex-1 overflow-y-auto min-h-[300px]">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-dark-900/50 border-b border-dark-700 text-sm font-medium text-slate-400">
                                        <th className="px-6 py-4 font-medium">User</th>
                                        <th className="px-6 py-4 font-medium">Role</th>
                                        <th className="px-6 py-4 font-medium text-right">Access</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-dark-700">
                                    {members.map((member) => (
                                        <tr key={member.id} className="hover:bg-dark-700/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-dark-600 border border-dark-500 flex items-center justify-center text-slate-300 font-bold">
                                                        {member.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-white flex items-center gap-2">
                                                            {member.name}
                                                            {member.id === user?.uid && <span className="text-[10px] uppercase font-bold bg-primary-500/20 text-primary-400 px-2 py-0.5 rounded-full">You</span>}
                                                        </div>
                                                        <div className="text-sm text-slate-400">{member.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    {member.role === 'admin' ? (
                                                        <Shield size={14} className="text-amber-500" />
                                                    ) : (
                                                        <User size={14} className="text-slate-400" />
                                                    )}
                                                    <select
                                                        value={member.role}
                                                        onChange={(e) => handleRoleChange(member.id, e.target.value)}
                                                        disabled={member.id === user?.uid} // Stop self-demotion in MVP
                                                        className="bg-transparent text-sm text-white focus:outline-none cursor-pointer disabled:opacity-50 disabled:cursor-auto"
                                                    >
                                                        <option value="admin" className="bg-dark-800">Admin</option>
                                                        <option value="member" className="bg-dark-800">Member</option>
                                                    </select>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full">
                                                    <CheckCircle2 size={12} /> Active
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                    </div>
                </div>

            </div>
        </div>
    );
}
