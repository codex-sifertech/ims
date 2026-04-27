import { useEffect } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import useStore from '../store/useStore';

/**
 * Manages isOnline / lastSeen fields on the current user's member doc.
 * Call once inside DashboardLayout.
 */
export function useOnlinePresence() {
    const { user, activeCompany } = useStore();

    useEffect(() => {
        if (!user?.uid || !activeCompany?.id) return;

        const memberRef = doc(db, 'companies', activeCompany.id, 'members', user.uid);

        const setOnline = () =>
            setDoc(memberRef, { isOnline: true, lastSeen: serverTimestamp() }, { merge: true }).catch(() => {});

        const setOffline = () =>
            setDoc(memberRef, { isOnline: false, lastSeen: serverTimestamp() }, { merge: true }).catch(() => {});

        // Mark online immediately
        setOnline();

        // Refresh lastSeen every 60s
        const interval = setInterval(setOnline, 60_000);

        // Mark offline on tab close
        window.addEventListener('beforeunload', setOffline);

        return () => {
            clearInterval(interval);
            window.removeEventListener('beforeunload', setOffline);
            setOffline();
        };
    }, [user?.uid, activeCompany?.id]);
}
