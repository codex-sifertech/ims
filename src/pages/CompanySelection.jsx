import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import useStore from '../store/useStore';
import { Building2, Plus, ArrowRight, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const BACKGROUND_IMAGES = [
    "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1920&auto=format&fit=crop", // Galaxy/Earth
    "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1920&auto=format&fit=crop", // Premium Workspace
    "https://images.unsplash.com/photo-1449844908441-8829872d2607?q=80&w=1920&auto=format&fit=crop", // Architecture
    "https://images.unsplash.com/photo-1469474968028-56623f02e42e?q=80&w=1920&auto=format&fit=crop", // Nature/Travel
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1920&auto=format&fit=crop", // City Skycrapers
    "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1920&auto=format&fit=crop"  // Tech/Circuit aesthetic
];

export default function CompanySelection() {
    const { companies, setActiveCompany, setCompanies, user } = useStore();
    const navigate = useNavigate();
    const [newCompanyName, setNewCompanyName] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const randomBackground = useMemo(() => {
        return BACKGROUND_IMAGES[Math.floor(Math.random() * BACKGROUND_IMAGES.length)];
    }, []);

    const handleSelectCompany = (company) => {
        setActiveCompany(company);
        navigate('/dashboard');
    };

    const handleCreateCompany = async (e) => {
        e.preventDefault();
        if (!newCompanyName.trim() || !user) return;

        setIsSaving(true);
        try {
            const newCompanyRef = doc(collection(db, 'companies'));
            const newCompanyData = {
                name: newCompanyName.trim(),
                createdAt: new Date().toISOString(),
                accessList: [user.email], // Add creator to access list
                owner: user.uid
            };

            // 1. Create company doc
            await setDoc(newCompanyRef, newCompanyData);

            // 2. Create membership doc for the creator (crucial for security rules)
            const memberRef = doc(db, 'companies', newCompanyRef.id, 'members', user.uid);
            await setDoc(memberRef, {
                email: user.email,
                name: user.name || user.displayName || 'Owner',
                role: 'owner', // Creator is owner
                joinedAt: new Date().toISOString()
            });

            const newCompany = {
                id: newCompanyRef.id,
                ...newCompanyData
            };

            setCompanies([...companies, newCompany]);
            setActiveCompany(newCompany);
            navigate('/dashboard');
        } catch (error) {
            console.error("Error saving new workspace:", error);
            // Optionally set an error state here to show the user
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div
            className="relative min-h-screen bg-dark-900 overflow-hidden w-full flex flex-col items-center justify-center p-4 transition-all duration-1000"
            style={{
                backgroundImage: `url(${randomBackground})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
            }}
        >
            {/* Very dark frosted overlay to ensure visibility of UI against rich bright images */}
            <div className="absolute inset-0 bg-dark-900/80 backdrop-blur-sm z-0"></div>

            <AnimatePresence mode="wait">
                <motion.div
                    key="main-screen"
                    className="max-w-md w-full relative z-10"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                >
                    <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-primary-600/20 text-primary-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-primary-500/30">
                                <Building2 size={32} />
                            </div>
                            <h1 className="text-3xl font-bold text-white mb-2">Welcome to IMS</h1>
                            <p className="text-slate-400">Select a workspace or create a new one to get started.</p>
                        </div>

                        <div className="space-y-6">
                            {/* Company List */}
                            {companies.length > 0 && (
                                <div className="bg-dark-800/80 backdrop-blur-xl rounded-2xl border border-dark-600/50 overflow-hidden shadow-2xl">
                                    <div className="px-4 py-3 border-b border-dark-600/50 bg-dark-800/60">
                                        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Your Workspaces</h2>
                                    </div>
                                    <div className="divide-y divide-dark-600/50">
                                        {companies.map((company) => (
                                            <button
                                                key={company.id}
                                                onClick={() => handleSelectCompany(company)}
                                                className="w-full flex items-center justify-between p-4 hover:bg-dark-700 transition-colors group text-left"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-dark-600 flex items-center justify-center text-white font-bold border border-dark-500 group-hover:border-primary-500 transition-colors">
                                                        {company.name.charAt(0)}
                                                    </div>
                                                    <span className="text-white font-medium">{company.name}</span>
                                                </div>
                                                <ArrowRight size={18} className="text-slate-500 group-hover:text-primary-500 transition-colors" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Create New Company */}
                            <div className="bg-dark-800/80 backdrop-blur-xl rounded-2xl border border-dark-600/50 p-5 shadow-2xl">
                                {isCreating ? (
                                    <form onSubmit={handleCreateCompany} className="animate-in fade-in slide-in-from-top-2">
                                        <label className="block text-sm font-medium text-slate-400 mb-2">Workspace Name</label>
                                        <input
                                            type="text"
                                            autoFocus
                                            required
                                            value={newCompanyName}
                                            onChange={(e) => setNewCompanyName(e.target.value)}
                                            className="w-full bg-dark-900 border border-dark-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all shadow-inner mb-4"
                                            placeholder="e.g. Acme Corp"
                                        />
                                        <div className="flex gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setIsCreating(false)}
                                                className="flex-1 px-4 py-2 border border-dark-600 text-slate-300 rounded-xl hover:bg-dark-700 transition-colors font-medium"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={!newCompanyName.trim() || isSaving}
                                                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-500 disabled:opacity-50 disabled:hover:bg-primary-600 transition-colors font-medium flex items-center justify-center gap-2"
                                            >
                                                {isSaving ? <Loader2 size={18} className="animate-spin" /> : 'Create'}
                                            </button>
                                        </div>
                                    </form>
                                ) : (
                                    <button
                                        onClick={() => setIsCreating(true)}
                                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-dark-600 text-slate-400 hover:text-white hover:bg-dark-700 hover:border-dark-500 transition-all"
                                    >
                                        <Plus size={18} />
                                        <span className="font-medium">Create New Workspace</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </motion.div>
            </AnimatePresence>
        </div>
    );
}
