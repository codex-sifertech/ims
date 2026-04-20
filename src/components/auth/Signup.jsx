import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { Building2, ArrowRight, Eye, EyeOff, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const BG_IMAGES = [
    "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1920&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1920&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1920&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1920&auto=format&fit=crop",
];

export default function Signup() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const randomBg = useMemo(() => BG_IMAGES[Math.floor(Math.random() * BG_IMAGES.length)], []);

    const handleSignup = async (e) => {
        e.preventDefault();
        if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
        setError('');
        setLoading(true);
        try {
            const cred = await createUserWithEmailAndPassword(auth, email, password);
            // Optionally update display name
            if (name.trim()) await updateProfile(cred.user, { displayName: name.trim() });
            // Create user profile doc
            await setDoc(doc(db, 'users', cred.user.uid), {
                uid: cred.user.uid,
                email: cred.user.email,
                name: name.trim() || cred.user.email.split('@')[0],
                createdAt: new Date().toISOString(),
            });
            navigate('/');
        } catch (err) {
            const msg = err.code === 'auth/email-already-in-use'
                ? 'An account with this email already exists.'
                : err.message || 'Failed to create account.';
            setError(msg);
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
            <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none z-0" />
            <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-primary-600/15 rounded-full blur-[120px] pointer-events-none z-0" />

            <motion.div
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
                            <h1 className="text-2xl font-bold text-white tracking-tight">Create your account</h1>
                            <p className="text-slate-400 text-sm mt-1">
                                Already have one?{' '}
                                <Link to="/login" className="text-primary-400 hover:text-primary-300 font-semibold transition-colors">
                                    Sign in
                                </Link>
                            </p>
                        </div>

                        <form onSubmit={handleSignup} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Full Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-dark-900/70 border border-dark-600 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/50 transition-all placeholder:text-slate-600"
                                    placeholder="Your full name"
                                    autoComplete="name"
                                />
                            </div>

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
                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Password</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-dark-900/70 border border-dark-600 rounded-xl px-4 py-3 pr-12 text-white text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/50 transition-all placeholder:text-slate-600"
                                        placeholder="Min. 6 characters"
                                        required
                                        autoComplete="new-password"
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
                            </AnimatePresence>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-primary-600 hover:bg-primary-500 text-white rounded-xl py-3 font-bold tracking-wide transition-all shadow-lg shadow-primary-600/20 flex items-center justify-center gap-2 group disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                            >
                                {loading ? (
                                    <span className="flex items-center gap-2">
                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Creating account...
                                    </span>
                                ) : (
                                    <>
                                        Create Account
                                        <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
