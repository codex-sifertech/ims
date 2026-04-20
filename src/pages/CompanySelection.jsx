import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { collection, doc, setDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import useStore from '../store/useStore';
import { Building2, Plus, ArrowRight, Loader2, ChevronRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const BG_IMAGES = [
    "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1920&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1920&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1449844908441-8829872d2607?q=80&w=1920&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1469474968028-56623f02e42e?q=80&w=1920&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1920&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1920&auto=format&fit=crop",
];

export default function CompanySelection() {
    const { companies, setActiveCompany, setCompanies, user } = useStore();
    const navigate = useNavigate();
    const [newCompanyName, setNewCompanyName] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [createError, setCreateError] = useState('');

    const randomBackground = useMemo(() => BG_IMAGES[Math.floor(Math.random() * BG_IMAGES.length)], []);

    const handleSelectCompany = (company) => {
        setActiveCompany(company);
        navigate('/dashboard');
    };

    const handleCreateCompany = async (e) => {
        e.preventDefault();
        if (!newCompanyName.trim() || !user) return;
        setCreateError('');
        setIsSaving(true);
        try {
            const batch = writeBatch(db);
            const newCompanyRef = doc(collection(db, 'companies'));
            
            const newCompanyData = {
                name: newCompanyName.trim(),
                createdAt: new Date().toISOString(),
                accessList: [user.email.toLowerCase()],
                owner: user.uid,
            };
            
            batch.set(newCompanyRef, newCompanyData);
            
            const memberRef = doc(db, 'companies', newCompanyRef.id, 'members', user.uid);
            batch.set(memberRef, {
                email: user.email.toLowerCase(),
                name: user.name || user.displayName || 'Creator',
                role: 'admin',
                joinedAt: new Date().toISOString(),
            });

            await batch.commit();

            const newCompany = { id: newCompanyRef.id, ...newCompanyData };
            setCompanies([...companies, newCompany]);
            setActiveCompany(newCompany);
            navigate('/dashboard');
        } catch (error) {
            console.error('Error saving workspace:', error);
            setCreateError(error.message || 'Failed to create workspace. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div
            className="w-full min-h-screen flex items-center justify-center relative overflow-hidden p-4"
            style={{ backgroundImage: `url(${randomBackground})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
        >
            {/* Overlay */}
            <div className="absolute inset-0 bg-dark-900/85 backdrop-blur-sm z-0" />
            {/* Ambient glows */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-600/15 rounded-full blur-[120px] pointer-events-none z-0" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none z-0" />

            <motion.div
                className="w-full max-w-md relative z-10"
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
            >
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-primary-600/20 text-primary-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-primary-500/30">
                        <Building2 size={32} />
                    </div>
                    <h1 className="text-3xl font-bold text-white">Choose a Workspace</h1>
                    <p className="text-slate-400 mt-2 text-sm">
                        {user?.name && <span className="text-primary-400 font-medium">{user.name}</span>} · Select or create a workspace to continue.
                    </p>
                </div>

                <div className="space-y-4">
                    {/* Workspace List */}
                    {companies.length > 0 && (
                        <div className="bg-dark-800/80 backdrop-blur-xl rounded-2xl border border-dark-600/50 overflow-hidden shadow-2xl">
                            <div className="px-4 py-3 border-b border-dark-700/60 flex items-center justify-between">
                                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Your Workspaces</h2>
                                <span className="text-xs text-slate-600 font-mono">{companies.length} total</span>
                            </div>
                            <div className="divide-y divide-dark-700/50 max-h-64 overflow-y-auto">
                                {companies.map((company, i) => (
                                    <motion.button
                                        key={company.id}
                                        onClick={() => handleSelectCompany(company)}
                                        className="w-full flex items-center justify-between p-4 hover:bg-dark-700/60 transition-colors group text-left"
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600/30 to-indigo-600/20 flex items-center justify-center text-white font-bold text-sm border border-primary-500/20 group-hover:border-primary-500/50 transition-colors">
                                                {company.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <span className="text-white font-semibold text-sm">{company.name}</span>
                                                {company.owner === user?.uid && (
                                                    <span className="block text-[10px] text-primary-400 font-medium">Owner</span>
                                                )}
                                            </div>
                                        </div>
                                        <ChevronRight size={16} className="text-slate-600 group-hover:text-primary-400 transition-colors" />
                                    </motion.button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Create New Workspace */}
                    <div className="bg-dark-800/80 backdrop-blur-xl rounded-2xl border border-dark-600/50 overflow-hidden shadow-2xl">
                        <AnimatePresence mode="wait">
                            {isCreating ? (
                                <motion.form
                                    key="create-form"
                                    onSubmit={handleCreateCompany}
                                    className="p-5"
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-white font-semibold text-sm">New Workspace</h3>
                                        <button
                                            type="button"
                                            onClick={() => { setIsCreating(false); setCreateError(''); }}
                                            className="text-slate-500 hover:text-white transition-colors"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Name</label>
                                    <input
                                        type="text"
                                        autoFocus
                                        required
                                        value={newCompanyName}
                                        onChange={(e) => setNewCompanyName(e.target.value)}
                                        className="w-full bg-dark-900/70 border border-dark-600 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/50 transition-all placeholder:text-slate-600 mb-4"
                                        placeholder="e.g. Acme Corp, Project Alpha"
                                    />
                                    {createError && (
                                        <p className="text-red-400 text-xs mb-3">{createError}</p>
                                    )}
                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setIsCreating(false)}
                                            className="flex-1 px-4 py-2.5 border border-dark-600 text-slate-300 rounded-xl hover:bg-dark-700 transition-colors text-sm font-medium"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={!newCompanyName.trim() || isSaving}
                                            className="flex-1 px-4 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl disabled:opacity-50 transition-colors text-sm font-bold flex items-center justify-center gap-2"
                                        >
                                            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                                            {isSaving ? 'Creating…' : 'Create'}
                                        </button>
                                    </div>
                                </motion.form>
                            ) : (
                                <motion.button
                                    key="create-btn"
                                    onClick={() => setIsCreating(true)}
                                    className="w-full flex items-center justify-center gap-2 py-4 text-slate-400 hover:text-white hover:bg-dark-700/50 transition-all group"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                >
                                    <div className="w-7 h-7 rounded-lg border border-dashed border-dark-500 group-hover:border-primary-500 flex items-center justify-center transition-colors">
                                        <Plus size={14} />
                                    </div>
                                    <span className="font-semibold text-sm">Create New Workspace</span>
                                </motion.button>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Empty state message if no workspaces */}
                    {companies.length === 0 && !isCreating && (
                        <p className="text-center text-slate-600 text-xs py-2">
                            You don't have any workspaces yet. Create one above to get started.
                        </p>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
