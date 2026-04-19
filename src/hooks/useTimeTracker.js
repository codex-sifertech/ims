import { useEffect, useCallback } from 'react';
import { doc, onSnapshot, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import useStore from '../store/useStore';

export function useTimeTracker() {
    const { user, activeCompany, isCheckedIn, toggleCheckIn } = useStore();

    // Sync check-in status FROM Firestore → store on mount
    useEffect(() => {
        if (!user?.uid) return;

        const settingsRef = doc(db, 'users', user.uid, 'settings', 'attendance');
        const unsubscribe = onSnapshot(settingsRef, (docSnap) => {
            if (docSnap.exists()) {
                // Only sync if the value actually differs to avoid infinite loops
                const remoteStatus = docSnap.data().isCheckedIn ?? false;
                toggleCheckIn(remoteStatus);
            }
        }, (err) => {
            console.error('Time tracker sync error:', err);
        });

        return () => unsubscribe();
    }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleCheckInToggle = useCallback(async () => {
        if (!user?.uid || !activeCompany?.id) return;

        const newStatus = !isCheckedIn;

        // Optimistic local update first so UI responds instantly
        toggleCheckIn(newStatus);

        const settingsRef = doc(db, 'users', user.uid, 'settings', 'attendance');

        try {
            // Persist to Firestore
            await setDoc(settingsRef, { isCheckedIn: newStatus }, { merge: true });

            // Log the attendance event
            const today = new Date().toISOString().split('T')[0];
            const logsRef = collection(
                db, 'companies', activeCompany.id, 'attendance', today, 'logs'
            );

            await addDoc(logsRef, {
                userId: user.uid,
                userName: user.name || user.email,
                type: newStatus ? 'check-in' : 'check-out',
                timestamp: serverTimestamp()
            });
        } catch (error) {
            console.error('Error toggling check-in:', error);
            // Revert optimistic update on failure
            toggleCheckIn(!newStatus);
        }
    }, [user, activeCompany, isCheckedIn, toggleCheckIn]);

    return { isCheckedIn, toggleCheckIn: handleCheckInToggle };
}
