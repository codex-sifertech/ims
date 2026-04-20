import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../../store/useStore';
import { Building2, ChevronDown, Plus, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CompanySwitcher() {
    const { user, activeCompany, setActiveCompany, companies } = useStore();
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const navigate = useNavigate();

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const handleSelect = (company) => {
        setActiveCompany(company);
        setOpen(false);
        navigate('/dashboard'); // Navigate to dashboard root on switch
    };

    return (
        <div className="relative w-full" ref={ref}>
            {/* Trigger */}
            <button
                onClick={() => setOpen(v => !v)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-dark-700/60 hover:bg-dark-700 border border-dark-600/50 text-left transition-all group"
            >
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-600/40 to-indigo-600/30 border border-primary-500/20 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {activeCompany?.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="min-w-0">
                        <p className="text-white text-sm font-semibold truncate">{activeCompany?.name || 'No Workspace'}</p>
                        <p className="text-slate-500 text-[10px] truncate">Workspace</p>
                    </div>
                </div>
                <ChevronDown
                    size={14}
                    className={`text-slate-500 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                />
            </button>

            {/* Dropdown */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        className="absolute top-full left-0 right-0 mt-1.5 bg-dark-800 border border-dark-600/50 rounded-xl shadow-2xl shadow-black/40 z-50 overflow-hidden"
                        initial={{ opacity: 0, y: -6, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.97 }}
                        transition={{ duration: 0.15 }}
                    >
                        {/* List */}
                        <div className="max-h-52 overflow-y-auto">
                            {companies.length === 0 ? (
                                <p className="text-slate-500 text-xs text-center py-5">No workspaces found.</p>
                            ) : (
                                companies.map(company => (
                                    <button
                                        key={company.id}
                                        onClick={() => handleSelect(company)}
                                        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 hover:bg-dark-700 transition-colors text-left group"
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="w-8 h-8 rounded-lg bg-primary-600/20 text-primary-400 flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-primary-500 group-hover:text-white transition-colors">
                                                {(company?.name?.charAt(0) || '?').toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors truncate">
                                                    {company?.name || 'Untitled Workspace'}
                                                </p>
                                                {company.owner === user?.uid && (
                                                    <p className="text-[9px] text-primary-400 font-semibold uppercase tracking-wide">Owner</p>
                                                )}
                                            </div>
                                        </div>
                                        {activeCompany?.id === company.id && (
                                            <Check size={14} className="text-primary-400 shrink-0" />
                                        )}
                                    </button>
                                ))
                            )}
                        </div>

                        {/* Footer: Manage workspaces */}
                        <div className="border-t border-dark-700 p-1.5">
                            <button
                                onClick={() => { 
                                    setOpen(false); 
                                    setActiveCompany(null);
                                    navigate('/'); 
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-dark-700 transition-colors text-xs font-medium"
                            >
                                <Plus size={12} />
                                Add / manage workspaces
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
