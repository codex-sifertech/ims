import { useState, useEffect, useMemo } from 'react';
import { ShieldAlert, ArrowRight, Building2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebase';
import { motion, AnimatePresence } from 'framer-motion';

const MOTIVATIONAL_QUOTES = [
    "Innovation distinguishes between a leader and a follower.",
    "The best way to predict the future is to create it.",
    "Make it work, make it right, make it fast.",
    "Transforming ideas into digital reality.",
    "Quality is not an act, it is a habit."
];

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    
    // Intro screen state
    const [showIntro, setShowIntro] = useState(true);
    const navigate = useNavigate();

    const randomQuote = useMemo(() => {
        return MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
    }, []);

    useEffect(() => {
        // Automatically hide intro after 3 seconds
        const timer = setTimeout(() => {
            setShowIntro(false);
        }, 3000);
        return () => clearTimeout(timer);
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await signInWithEmailAndPassword(auth, email, password);
            navigate('/'); // App.jsx will route to the authenticated dashboard
        } catch (err) {
            setError(err.message || 'Invalid email or password.');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-900/30 blur-[120px] rounded-full pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-900/30 blur-[120px] rounded-full pointer-events-none"></div>

            <AnimatePresence mode="wait">
                {showIntro ? (
                    <motion.div
                        key="intro-screen"
                        className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-dark-900"
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
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
                        className="w-full max-w-md bg-dark-800/80 backdrop-blur-xl border border-dark-600/50 rounded-3xl shadow-2xl overflow-hidden relative z-10"
                    >
                        <div className="p-8">
                            <div className="w-16 h-16 bg-primary-600/20 text-primary-500 rounded-2xl flex items-center justify-center mb-6 border border-primary-500/30 shadow-inner mx-auto">
                                <Building2 size={32} />
                            </div>
                            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight text-center">Access IMS Space</h1>
                            <p className="text-slate-400 mb-8 font-medium text-center">
                                Don't have an account?{' '}
                                <Link to="/signup" className="text-primary-500 hover:text-primary-400 transition-colors">
                                    Sign up instead
                                </Link>
                            </p>

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
                                
                                <div>
                                    <label className="block text-sm font-semibold text-slate-300 mb-2">Password</label>
                                    <input 
                                        type="password" 
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-dark-900/50 border border-dark-600 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all shadow-inner"
                                        placeholder="••••••••"
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
                                    disabled={loading}
                                    className="w-full bg-primary-600 hover:bg-primary-500 text-white rounded-xl py-3.5 font-bold tracking-wide transition-all shadow-lg hover:shadow-primary-500/25 flex items-center justify-center gap-2 group mt-2 disabled:opacity-50"
                                >
                                    {loading ? 'Authenticating...' : 'Sign In'}
                                    {!loading && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
                                </button>
                            </form>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
