import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import useStore from '../store/useStore';
import { Shield, UserPlus, Loader2, Trash2, Mail } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export default function CompanySettings() {
    const { activeCompany, user } = useStore();
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState('member');
    const [isInviting, setIsInviting] = useState(false);
    const [inviteError, setInviteError] = useState('');

    const isCompanyOwner = activeCompany?.owner === user?.uid || members.find(m => m.id === user?.uid)?.role === 'owner';
    const isCompanyAdmin = isCompanyOwner || members.find(m => m.id === user?.uid)?.role === 'admin';

    useEffect(() => {
        if (!activeCompany?.id) return;
        setLoading(true);

        const membersRef = collection(db, 'companies', activeCompany.id, 'members');
        const unsubscribeMembers = onSnapshot(membersRef, (snap) => {
            const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            data.sort((a, b) => {
                const weight = { owner: 3, admin: 2, member: 1 };
                return (weight[b.role] || 0) - (weight[a.role] || 0);
            });
            setMembers(data);
            setLoading(false);
        });

        return () => unsubscribeMembers();
    }, [activeCompany?.id, activeCompany?.owner, user?.uid]);

    const handleInvite = async (e) => {
        e.preventDefault();
        if (!inviteEmail.trim() || !activeCompany?.id || !isCompanyAdmin) return;
        setIsInviting(true);
        setInviteError('');

        try {
            // [HOTFIX] Ensure backwards compatibility with old Firebase string enums. 
            // Creators must be strictly 'admin' in Firestore members doc to bypass Vercel/Firebase rule gap.
            if (activeCompany.owner === user?.uid) {
                const myMemberData = members.find(m => m.id === user.uid);
                if (myMemberData && myMemberData.role !== 'admin') {
                    await updateDoc(doc(db, 'companies', activeCompany.id, 'members', user.uid), {
                        role: 'admin'
                    });
                }
            }

            const companyRef = doc(db, 'companies', activeCompany.id);
            const currentAccessList = activeCompany.accessList || [];
            if (!currentAccessList.includes(inviteEmail.trim())) {
                const newAccessList = [...currentAccessList, inviteEmail.trim().toLowerCase()];
                await updateDoc(companyRef, { accessList: newAccessList });
            }

            const stubId = `invite_${Date.now()}`;
            const memberRef = doc(db, 'companies', activeCompany.id, 'members', stubId);
            await setDoc(memberRef, {
                email: inviteEmail.trim().toLowerCase(),
                name: 'Pending User',
                role: inviteRole,
                status: 'pending',
                invitedAt: serverTimestamp(),
                invitedBy: user.email
            });

            setInviteEmail('');
            setInviteRole('member');
        } catch (error) {
            console.error("Error inviting user:", error);
            setInviteError('Failed to invite user. Ensure you have permission.');
        } finally {
            setIsInviting(false);
        }
    };

    const handleRoleChange = async (memberId, newRole) => {
        if (!isCompanyAdmin || !activeCompany?.id) return;
        try {
            await updateDoc(doc(db, 'companies', activeCompany.id, 'members', memberId), {
                role: newRole
            });
        } catch (error) {
            console.error("Error changing role:", error);
        }
    };

    const handleRemoveMember = async (memberId, memberEmail) => {
        if (!isCompanyAdmin || !activeCompany?.id) return;
        if (!window.confirm(`Are you sure you want to remove ${memberEmail} from this workspace?`)) return;

        try {
            await deleteDoc(doc(db, 'companies', activeCompany.id, 'members', memberId));
            
            if (memberEmail && activeCompany.accessList) {
                const newAccessList = activeCompany.accessList.filter(e => e !== memberEmail);
                await updateDoc(doc(db, 'companies', activeCompany.id), {
                    accessList: newAccessList
                });
            }
        } catch (error) {
            console.error("Error removing member:", error);
        }
    };

    const handleExportData = () => {
        if (!activeCompany?.id) return;
        const exportTree = {
            metadata: activeCompany,
            members: members,
            exportDate: new Date().toISOString()
        };
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportTree, null, 2));
        const anchor = document.createElement('a');
        anchor.href = dataStr;
        anchor.download = `${activeCompany.name.replace(/\s+/g, '_')}_backup.json`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
    };

    const handleDeleteWorkspace = async () => {
        if (!isCompanyOwner || !activeCompany?.id) return;
        
        const confirmation = window.prompt(`DANGER: This action cannot be undone. All data will be permanently deleted.\n\nType the name of your workspace ("${activeCompany.name}") to confirm:`);
        if (confirmation !== activeCompany.name) {
            if (confirmation !== null) alert("Workspace name did not match. Deletion cancelled.");
            return;
        }

        try {
            await deleteDoc(doc(db, 'companies', activeCompany.id));
            alert("Workspace successfully deleted.");
            localStorage.removeItem('activeCompany');
            window.location.href = '/'; 
        } catch (error) {
            console.error("Error deleting workspace:", error);
            alert("Failed to delete workspace. Ensure you are the owner.");
        }
    };

    return (
        <div className="h-full flex flex-col p-8 overflow-y-auto bg-dark-900 custom-scrollbar">
            <header className="mb-8 border-b border-dark-700 pb-6 shrink-0 flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                        <Shield className="text-primary-500" size={32} />
                        Admin Panel
                    </h1>
                    <p className="text-slate-400 mt-2 max-w-2xl text-sm">
                        Access control and workspace management for <span className="text-white font-medium">{activeCompany?.name}</span>.
                    </p>
                </div>
                
                {/* ── DANGER ZONE ── */}
                {isCompanyOwner && (
                    <div className="flex gap-3">
                        <button 
                            onClick={handleExportData}
                            className="py-2.5 px-5 border border-primary-500/30 text-primary-400 rounded-xl hover:bg-primary-500/10 transition-colors text-sm font-bold uppercase tracking-widest shrink-0"
                        >
                            Export Data
                        </button>
                        <button 
                            onClick={handleDeleteWorkspace}
                            className="py-2.5 px-5 border border-red-500/30 text-red-400 rounded-xl hover:bg-red-500/10 transition-colors text-sm font-bold uppercase tracking-widest flex items-center gap-2 shrink-0"
                        >
                            <Trash2 size={16} />
                            Delete Workspace
                        </button>
                    </div>
                )}
            </header>

            <div className="flex-1 max-w-4xl pb-8">
                {/* ── ACCESS MANAGEMENT ── */}
                <div className="bg-dark-800/60 backdrop-blur-md border border-dark-700 rounded-2xl flex flex-col shadow-xl overflow-hidden">
                    
                    <div className="p-6 border-b border-dark-700 bg-dark-800 flex flex-col gap-5 shrink-0">
                        <div>
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                Access Control
                            </h2>
                            <p className="text-sm text-slate-400 mt-1">Manage team members, roles, and invitations.</p>
                        </div>

                        <AnimatePresence>
                            {isCompanyAdmin && (
                                <motion.form 
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    onSubmit={handleInvite} 
                                    className="bg-dark-900/50 border border-dark-700 p-4 rounded-2xl flex flex-col sm:flex-row gap-3 items-start sm:items-center"
                                >
                                    <div className="relative flex-1 w-full">
                                        <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="email"
                                            value={inviteEmail}
                                            onChange={(e) => setInviteEmail(e.target.value)}
                                            placeholder="colleague@company.com"
                                            className="w-full bg-dark-900 border border-dark-600 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500 transition-colors"
                                        />
                                    </div>
                                    <div className="flex gap-2 w-full sm:w-auto shrink-0">
                                        <select
                                            value={inviteRole}
                                            onChange={e => setInviteRole(e.target.value)}
                                            className="bg-dark-900 border border-dark-600 rounded-xl px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-primary-500"
                                        >
                                            <option value="member">Member</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                        <button
                                            type="submit"
                                            disabled={!inviteEmail || isInviting}
                                            className="flex-1 sm:flex-none px-5 py-2.5 bg-primary-600 outline-none text-white text-sm font-bold rounded-xl hover:bg-primary-500 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                                        >
                                            {isInviting ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                                            Invite
                                        </button>
                                    </div>
                                </motion.form>
                            )}
                        </AnimatePresence>
                        {inviteError && <p className="text-red-400 text-xs px-2">{inviteError}</p>}
                    </div>

                    <div className="flex-1 p-2">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center text-slate-500 gap-3 min-h-[200px]">
                                <Loader2 className="animate-spin text-primary-500" size={28} />
                                Loading members...
                            </div>
                        ) : members.length === 0 ? (
                            <div className="flex flex-col items-center justify-center text-slate-500 py-10">
                                No members found.
                            </div>
                        ) : (
                            <div className="space-y-2 p-4">
                                {members.map((member) => {
                                    const isYou = member.id === user?.uid || member.email === user?.email;
                                    const isOwner = member.role === 'owner' || activeCompany?.owner === member.id;
                                    
                                    return (
                                        <div key={member.id} className="bg-dark-900/60 border border-dark-700/60 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-dark-600 transition-colors">
                                            
                                            <div className="flex items-center gap-4 min-w-0">
                                                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center font-bold text-sm shrink-0 ${
                                                    isOwner ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                                                    member.status === 'pending' ? 'bg-slate-500/10 border-slate-500/20 text-slate-400 border-dashed' :
                                                    'bg-primary-500/10 border-primary-500/20 text-primary-400'
                                                }`}>
                                                    {(member.name?.charAt(0) || member.email?.charAt(0) || '?').toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="font-bold text-white flex items-center gap-2 truncate text-sm">
                                                        {member.name}
                                                        {isYou && <span className="text-[9px] uppercase font-black bg-primary-500/20 text-primary-400 px-2 py-0.5 rounded-md tracking-wider">You</span>}
                                                        {member.status === 'pending' && <span className="text-[9px] uppercase font-black bg-slate-500/20 text-slate-400 px-2 py-0.5 rounded-md tracking-wider border border-slate-500/20 border-dashed">Pending</span>}
                                                    </div>
                                                    <div className="text-xs text-slate-500 truncate mt-0.5">{member.email}</div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 sm:gap-6 ml-[56px] sm:ml-0 shrink-0">
                                                <div className="flex items-center gap-2">
                                                    {member.role === 'owner' ? (
                                                        <span className="flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20 uppercase tracking-widest">
                                                            <Shield size={14} /> Owner
                                                        </span>
                                                    ) : (
                                                        <select
                                                            value={member.role}
                                                            onChange={(e) => handleRoleChange(member.id, e.target.value)}
                                                            disabled={!isCompanyAdmin || isYou} 
                                                            className="bg-dark-800 border border-dark-600 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-300 focus:outline-none focus:border-primary-500 cursor-pointer disabled:opacity-50 disabled:cursor-auto"
                                                        >
                                                            <option value="admin">Admin</option>
                                                            <option value="member">Member</option>
                                                        </select>
                                                    )}
                                                </div>

                                                {isCompanyAdmin && !isOwner && !isYou && (
                                                    <button
                                                        onClick={() => handleRemoveMember(member.id, member.email)}
                                                        className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/20"
                                                        title="Remove User"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>

                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
