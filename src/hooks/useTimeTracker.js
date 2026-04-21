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
        const statusString = newStatus ? 'active' : 'checked-out';

        // Optimistic local update
        toggleCheckIn(newStatus);

        const settingsRef = doc(db, 'users', user.uid, 'settings', 'attendance');
        const memberRef = doc(db, 'companies', activeCompany.id, 'members', user.uid);
        const attendanceRef = collection(db, 'companies', activeCompany.id, 'attendance');

        try {
            // Persist to User Settings
            await setDoc(settingsRef, { isCheckedIn: newStatus }, { merge: true });

            // Update Member Status for Real-time presence (Eco Load)
            await setDoc(memberRef, { 
                status: statusString,
                isCheckedIn: newStatus,
                lastSeen: serverTimestamp() 
            }, { merge: true });

            // Log flat attendance event for easier querying
            await addDoc(attendanceRef, {
                userId: user.uid,
                userName: user.name || user.email,
                type: newStatus ? 'check-in' : 'check-out',
                timestamp: serverTimestamp(),
                // Add ISO string for browser-side date filtering if serverTimestamp is messy
                isoDate: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error toggling check-in:', error);
            toggleCheckIn(!newStatus);
        }
    }, [user, activeCompany, isCheckedIn, toggleCheckIn]);

    return { isCheckedIn, toggleCheckIn: handleCheckInToggle };
}
