import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import useStore from '../../store/useStore';
import { CheckCircle2, Calendar, Loader2, ExternalLink } from 'lucide-react';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '791274596080-bv0l4otccm3hkm0utcu42u9cchavfqpj.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/calendar.events';

function loadGsiScript() {
    return new Promise((resolve) => {
        if (window.google?.accounts) return resolve();
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = resolve;
        document.head.appendChild(script);
    });
}

export default function GoogleCalendarConnect() {
    const { user } = useStore();
    const [connected, setConnected] = useState(false);
    const [loading, setLoading] = useState(true);
    const [connecting, setConnecting] = useState(false);

    // Check if already connected
    useEffect(() => {
        if (!user?.uid) return;
        const check = async () => {
            try {
                const ref = doc(db, 'users', user.uid, 'integrations', 'google_calendar');
                const snap = await getDoc(ref);
                setConnected(snap.exists() && !!snap.data()?.accessToken);
            } catch { /* ignore */ }
            setLoading(false);
        };
        check();
    }, [user?.uid]);

    const handleConnect = useCallback(async () => {
        if (!GOOGLE_CLIENT_ID) {
            alert('Google Client ID not configured. Add VITE_GOOGLE_CLIENT_ID to your .env file.');
            return;
        }
        setConnecting(true);
        try {
            await loadGsiScript();
            const client = window.google.accounts.oauth2.initTokenClient({
                client_id: GOOGLE_CLIENT_ID,
                scope: SCOPES,
                callback: async (response) => {
                    if (response.error) {
                        console.error('OAuth error:', response.error);
                        setConnecting(false);
                        return;
                    }
                    // Save token to Firestore
                    const ref = doc(db, 'users', user.uid, 'integrations', 'google_calendar');
                    await setDoc(ref, {
                        accessToken: response.access_token,
                        expiresAt: Date.now() + (response.expires_in * 1000),
                        scope: response.scope,
                        connectedAt: new Date().toISOString(),
                    });
                    setConnected(true);
                    setConnecting(false);
                },
            });
            client.requestAccessToken();
        } catch (err) {
            console.error('Google connect error:', err);
            setConnecting(false);
        }
    }, [user?.uid]);

    const handleDisconnect = async () => {
        if (!user?.uid) return;
        const ref = doc(db, 'users', user.uid, 'integrations', 'google_calendar');
        await setDoc(ref, { accessToken: null });
        setConnected(false);
    };

    if (loading) {
        return (
            <div className="flex items-center gap-2 text-slate-500 text-sm">
                <Loader2 size={16} className="animate-spin" /> Checking connection…
            </div>
        );
    }

    return (
        <div className="flex items-center gap-4">
            {connected ? (
                <>
                    <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-black uppercase tracking-widest">
                        <CheckCircle2 size={14} />
                        Connected to Google Calendar
                    </div>
                    <button
                        onClick={handleDisconnect}
                        className="text-xs text-slate-500 hover:text-red-400 underline transition-colors"
                    >
                        Disconnect
                    </button>
                </>
            ) : (
                <button
                    onClick={handleConnect}
                    disabled={connecting}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-slate-100 text-dark-900 font-black text-xs rounded-xl transition-all disabled:opacity-50 shadow-lg"
                >
                    {connecting ? (
                        <Loader2 size={14} className="animate-spin" />
                    ) : (
                        <Calendar size={14} className="text-blue-600" />
                    )}
                    {connecting ? 'Connecting…' : 'Connect Google Calendar'}
                    <ExternalLink size={11} className="text-slate-400" />
                </button>
            )}
        </div>
    );
}
