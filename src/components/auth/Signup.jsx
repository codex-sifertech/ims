import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';

export default function Signup() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSignup = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // Create user in Auth
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Create user document in Firestore for persistent profile data
            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                email: user.email,
                name: name || user.email.split('@')[0],
                createdAt: new Date().toISOString(),
            });

            navigate('/');
        } catch (err) {
            setError(err.message || 'Failed to create an account');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-dark-900 border-none m-0 p-0 overflow-hidden">
            {/* Visual Section */}
            <div className="hidden md:flex flex-col justify-center items-center bg-dark-800 p-12 text-center border-r border-dark-700">
                <h1 className="text-4xl font-bold text-white mb-6">Join IMS</h1>
                <p className="text-slate-400 max-w-md text-lg">
                    Create your account to start managing projects, organizing your work, and collaborating across companies.
                </p>
            </div>

            {/* Form Section */}
            <div className="flex items-center justify-center p-8 bg-dark-900 w-full h-full relative">
                <div className="w-full max-w-md space-y-8 bg-dark-800/50 p-10 rounded-2xl border border-dark-700 shadow-2xl backdrop-blur-sm">
                    <div>
                        <h2 className="text-center text-3xl font-extrabold text-white">Create your account</h2>
                        <p className="mt-2 text-center text-sm text-slate-400">
                            Already have an account?{' '}
                            <Link to="/login" className="font-medium text-primary-500 hover:text-primary-400 transition-colors">
                                Sign in
                            </Link>
                        </p>
                    </div>

                    <form className="mt-8 space-y-6" onSubmit={handleSignup}>
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded-lg text-center">
                                {error}
                            </div>
                        )}

                        <div className="space-y-4 rounded-md shadow-sm">
                            <div>
                                <label className="sr-only" htmlFor="name">Full Name</label>
                                <input
                                    id="name"
                                    name="name"
                                    type="text"
                                    className="appearance-none rounded-lg relative block w-full px-4 py-3 border border-dark-600 bg-dark-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:z-10 sm:text-sm transition-all"
                                    placeholder="Full Name (optional)"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="sr-only" htmlFor="email-address">Email address</label>
                                <input
                                    id="email-address"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    className="appearance-none rounded-lg relative block w-full px-4 py-3 border border-dark-600 bg-dark-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:z-10 sm:text-sm transition-all"
                                    placeholder="Email address"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="sr-only" htmlFor="password">Password</label>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="new-password"
                                    required
                                    className="appearance-none rounded-lg relative block w-full px-4 py-3 border border-dark-600 bg-dark-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:z-10 sm:text-sm transition-all"
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-900 focus:ring-primary-500 disabled:opacity-50 transition-all shadow-lg"
                            >
                                {loading ? 'Creating account...' : 'Sign up'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
