import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { Building2, Plus, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MOTIVATIONAL_QUOTES = [
    "Innovation distinguishes between a leader and a follower.",
    "The best way to predict the future is to create it.",
    "Make it work, make it right, make it fast.",
    "Transforming ideas into digital reality.",
    "Quality is not an act, it is a habit."
];

const BACKGROUND_IMAGES = [
    "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1920&auto=format&fit=crop", // Galaxy/Earth
    "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1920&auto=format&fit=crop", // Premium Workspace
    "https://images.unsplash.com/photo-1449844908441-8829872d2607?q=80&w=1920&auto=format&fit=crop", // Architecture
    "https://images.unsplash.com/photo-1469474968028-56623f02e42e?q=80&w=1920&auto=format&fit=crop", // Nature/Travel
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1920&auto=format&fit=crop", // City Skycrapers
    "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1920&auto=format&fit=crop"  // Tech/Circuit aesthetic
];

export default function CompanySelection() {
    const { companies, setActiveCompany, setCompanies } = useStore();
    const navigate = useNavigate();
    const [newCompanyName, setNewCompanyName] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    // Intro screen state
    const [showIntro, setShowIntro] = useState(true);

    const randomQuote = useMemo(() => {
        return MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
    }, []);

    const randomBackground = useMemo(() => {
        return BACKGROUND_IMAGES[Math.floor(Math.random() * BACKGROUND_IMAGES.length)];
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            setShowIntro(false);
        }, 3000); // Intro lasts 3 seconds before switching
        return () => clearTimeout(timer);
    }, []);

    const handleSelectCompany = (company) => {
        setActiveCompany(company);
        navigate('/dashboard');
    };

    const handleCreateCompany = (e) => {
        e.preventDefault();
        if (!newCompanyName.trim()) return;

        const newCompany = {
            id: `company-${Date.now()}`,
            name: newCompanyName.trim()
        };

        setCompanies([...companies, newCompany]);
        setActiveCompany(newCompany);
        navigate('/dashboard');
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
                {showIntro ? (
                    <motion.div
                        key="intro-screen"
                        className="absolute inset-0 z-50 flex flex-col items-center justify-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, scale: 2, filter: 'blur(15px)' }} // Teleport zoom effect
                        transition={{ duration: 0.8, ease: "easeInOut" }}
                    >
                        <motion.h1
                            className="text-6xl md:text-7xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-t from-dark-800 via-slate-300 to-white pb-2 mb-4 drop-shadow-2xl"
                            initial={{ y: 30, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ duration: 0.8, delay: 0.3 }}
                        >
                            SiferTech
                        </motion.h1>

                        <motion.p
                            className="text-lg md:text-xl text-slate-400 italic font-medium max-w-xl text-center px-6"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 1, delay: 1 }}
                        >
                            "{randomQuote}"
                        </motion.p>
                    </motion.div>
                ) : (
                    <motion.div
                        key="main-screen"
                        className="max-w-md w-full relative z-10"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }} // Show slightly after intro starts fading
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
                                                disabled={!newCompanyName.trim()}
                                                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-500 disabled:opacity-50 disabled:hover:bg-primary-600 transition-colors font-medium"
                                            >
                                                Create
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
                )}
            </AnimatePresence>
        </div>
    );
}
