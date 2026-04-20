import { useState } from 'react';
import { ShieldAlert, ArrowRight, Building2 } from 'lucide-react';
import { validateUserAccess } from '../../config/accessControl';
import useStore from '../../store/useStore';
import { motion } from 'framer-motion';

import { useNavigate } from 'react-router-dom';

export default function Login() {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const { setUser } = useStore();
    const navigate = useNavigate();

    const handleLogin = (e) => {
        e.preventDefault();
        setError('');

        const userData = validateUserAccess(email);
        if (userData) {
            // Provide a reliable fallback UID since this mock login doesn't use Firebase Auth
            const userWithUid = {
                ...userData,
                uid: userData.uid || `user-${btoa(email).substring(0, 10)}`
            };
            setUser(userWithUid);
            navigate('/');
        } else {
            setError('Access Denied: Email not found in the authorized access list.');
        }
    };

    return (
        <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-900/30 blur-[120px] rounded-full pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-900/30 blur-[120px] rounded-full pointer-events-none"></div>

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md bg-dark-800/80 backdrop-blur-xl border border-dark-600/50 rounded-3xl shadow-2xl overflow-hidden relative z-10"
            >
                <div className="p-8">
                    <div className="w-16 h-16 bg-primary-600/20 text-primary-500 rounded-2xl flex items-center justify-center mb-6 border border-primary-500/30 shadow-inner">
                        <Building2 size={32} />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Access IMS Space</h1>
                    <p className="text-slate-400 mb-8 font-medium">Enter your authorized email to continue.</p>

                    <form onSubmit={handleLogin} className="space-y-5">
                        <div>
                            <label className="block text-sm font-semibold text-slate-300 mb-2">Email Address</label>
                            <input 
                                type="email" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-dark-900/50 border border-dark-600 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all shadow-inner"
                                placeholder="name@company.com"
                                required
                            />
                        </div>

                        {error && (
                            <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl flex items-start gap-3 text-sm"
                            >
                                <ShieldAlert size={18} className="shrink-0 mt-0.5" />
                                <p>{error}</p>
                            </motion.div>
                        )}

                        <button 
                            type="submit"
                            className="w-full bg-primary-600 hover:bg-primary-500 text-white rounded-xl py-3.5 font-bold tracking-wide transition-all shadow-lg hover:shadow-primary-500/25 flex items-center justify-center gap-2 group mt-2"
                        >
                            Authorize Access
                            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-dark-700/50">
                        <p className="text-xs text-slate-500 font-mono leading-relaxed">
                            <strong>Note:</strong> Currently restricted to allowlisted users only. Try <span className="text-primary-400">admin@ims.com</span>, <span className="text-primary-400">ops@ims.com</span>, or <span className="text-primary-400">user@ims.com</span>.
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
