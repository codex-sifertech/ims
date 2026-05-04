import { useState, useEffect, useMemo } from 'react';
import { ShieldAlert, ArrowRight, Building2, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { motion, AnimatePresence } from 'framer-motion';

const MOTIVATIONAL_QUOTES = [
    "Innovation distinguishes between a leader and a follower.",
    "The best way to predict the future is to create it.",
    "Make it work, make it right, make it fast.",
    "Transforming ideas into digital reality.",
    "Quality is not an act, it is a habit."
];

const BG_IMAGES = [
    "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1920&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1920&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1920&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1920&auto=format&fit=crop",
];

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [resetMessage, setResetMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [showIntro, setShowIntro] = useState(true);
    const navigate = useNavigate();

    const randomQuote = useMemo(() => MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)], []);
    const randomBg = useMemo(() => BG_IMAGES[Math.floor(Math.random() * BG_IMAGES.length)], []);

    useEffect(() => {
        const timer = setTimeout(() => setShowIntro(false), 3200);
        return () => clearTimeout(timer);
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
            navigate('/');
        } catch (err) {
            const msg = err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password'
                ? 'Invalid email or password. Please try again.'
                : err.message || 'Authentication failed.';
            setError(msg);
            setLoading(false);
        }
    };

    const handleResetPassword = async () => {
        if (!email) {
            setError('Please enter your email address first.');
            setResetMessage('');
            return;
        }
        setError('');
        setResetMessage('');
        setLoading(true);
        try {
            await sendPasswordResetEmail(auth, email);
            setResetMessage('Password reset email sent! Check your inbox.');
        } catch (err) {
            setError(err.message || 'Failed to send reset email.');
        }
        setLoading(false);
    };

    const handleGoogleSignIn = async () => {
        setError('');
        setLoading(true);
        try {
            const provider = new GoogleAuthProvider();
            const cred = await signInWithPopup(auth, provider);
            
            // Check if user exists in db, if not create profile
            const userRef = doc(db, 'users', cred.user.uid);
            const userSnap = await getDoc(userRef);
            
            if (!userSnap.exists()) {
                await setDoc(userRef, {
                    uid: cred.user.uid,
                    email: cred.user.email,
                    name: cred.user.displayName || cred.user.email.split('@')[0],
                    photoURL: cred.user.photoURL || '',
                    createdAt: new Date().toISOString(),
                });
            }
            navigate('/');
        } catch (err) {
            console.error(err);
            setError(err.message || 'Google Sign-In failed.');
            setLoading(false);
        }
    };

    return (
        <div
            className="w-full min-h-screen flex items-center justify-center relative overflow-hidden"
            style={{ backgroundImage: `url(${randomBg})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
        >
            {/* Overlay */}
            <div className="absolute inset-0 bg-dark-900/85 backdrop-blur-sm z-0" />

            {/* Ambient glows */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-600/20 rounded-full blur-[120px] pointer-events-none z-0" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-600/15 rounded-full blur-[120px] pointer-events-none z-0" />

            <AnimatePresence mode="wait">
                {showIntro ? (
                    <motion.div
                        key="intro"
                        className="absolute inset-0 z-50 flex flex-col items-center justify-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, scale: 1.15, filter: 'blur(20px)' }}
                        transition={{ duration: 0.9, ease: 'easeInOut' }}
                    >
                        <motion.div
                            className="flex flex-col items-center gap-4"
                            initial={{ y: 40, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ duration: 0.9, delay: 0.2, ease: 'easeOut' }}
                        >
                            {/* Logo mark */}
                            <motion.div
                                className="w-20 h-20 rounded-3xl bg-primary-600/20 border border-primary-500/30 flex items-center justify-center mb-2"
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ duration: 0.6, delay: 0.1 }}
                            >
                                <Building2 size={40} className="text-primary-400" />
                            </motion.div>

                            <h1 className="text-7xl md:text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-200 to-slate-500 drop-shadow-2xl">
                                SiferTech
                            </h1>
                            <motion.p
                                className="text-lg text-slate-400 italic font-medium max-w-md text-center px-6"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 1, delay: 1.2 }}
                            >
                                "{randomQuote}"
                            </motion.p>
                        </motion.div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="form"
                        className="relative z-10 w-full max-w-md px-4"
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                    >
                        <div className="bg-dark-800/80 backdrop-blur-xl border border-dark-600/50 rounded-3xl shadow-2xl overflow-hidden">
                            <div className="p-8">
                                {/* Header */}
                                <div className="flex flex-col items-center mb-8">
                                    <div className="w-14 h-14 bg-primary-600/20 text-primary-400 rounded-2xl flex items-center justify-center mb-4 border border-primary-500/30">
                                        <Building2 size={28} />
                                    </div>
                                    <h1 className="text-2xl font-bold text-white tracking-tight">Welcome back</h1>
                                    <p className="text-slate-400 text-sm mt-1">
                                        New here?{' '}
                                        <Link to="/signup" className="text-primary-400 hover:text-primary-300 font-semibold transition-colors">
                                            Create an account
                                        </Link>
                                    </p>
                                </div>

                                <form onSubmit={handleLogin} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Email</label>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full bg-dark-900/70 border border-dark-600 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/50 transition-all placeholder:text-slate-600"
                                            placeholder="name@company.com"
                                            required
                                            autoComplete="email"
                                        />
                                    </div>

                                    <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest">Password</label>
                                            <button 
                                                type="button" 
                                                onClick={handleResetPassword}
                                                className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
                                            >
                                                Forgot Password?
                                            </button>
                                        </div>
                                        <div className="relative">
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="w-full bg-dark-900/70 border border-dark-600 rounded-xl px-4 py-3 pr-12 text-white text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/50 transition-all placeholder:text-slate-600"
                                                placeholder="••••••••"
                                                required
                                                autoComplete="current-password"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(v => !v)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                                                tabIndex={-1}
                                            >
                                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </div>

                                    <AnimatePresence>
                                        {error && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl flex items-center gap-3 text-sm"
                                            >
                                                <ShieldAlert size={16} className="shrink-0" />
                                                <p>{error}</p>
                                            </motion.div>
                                        )}
                                        {resetMessage && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-3 rounded-xl flex items-center gap-3 text-sm"
                                            >
                                                <CheckCircle2 size={16} className="shrink-0" />
                                                <p>{resetMessage}</p>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-primary-600 hover:bg-primary-500 text-white rounded-xl py-3 font-bold tracking-wide transition-all shadow-lg shadow-primary-600/20 flex items-center justify-center gap-2 group disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                                    >
                                        {loading ? (
                                            <span className="flex items-center gap-2">
                                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                Signing in...
                                            </span>
                                        ) : (
                                            <>
                                                Sign In
                                                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                            </>
                                        )}
                                    </button>
                                </form>

                                <div className="mt-6 flex items-center gap-4">
                                    <div className="flex-1 h-px bg-dark-600"></div>
                                    <span className="text-xs text-slate-500 font-semibold uppercase tracking-widest">Or continue with</span>
                                    <div className="flex-1 h-px bg-dark-600"></div>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleGoogleSignIn}
                                    disabled={loading}
                                    className="w-full mt-6 bg-white hover:bg-slate-50 text-dark-900 rounded-xl py-3 font-bold transition-all shadow-lg flex items-center justify-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed border border-slate-200"
                                >
                                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                        <path fill="none" d="M1 1h22v22H1z" />
                                    </svg>
                                    Google
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
