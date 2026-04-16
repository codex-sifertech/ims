import { useEffect } from 'react';
import { doc, onSnapshot, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import useStore from '../store/useStore';

export function useTimeTracker() {
    const { user, activeCompany, isCheckedIn, toggleCheckIn } = useStore();

    // Sync check-in status from user settings
    useEffect(() => {
        if (!user?.uid) return;

        const settingsRef = doc(db, 'users', user.uid, 'settings', 'attendance');
        const unsubscribe = onSnapshot(settingsRef, (docSnap) => {
            if (docSnap.exists()) {
                toggleCheckIn(docSnap.data().isCheckedIn);
            }
        });

        return () => unsubscribe();
    }, [user?.uid, toggleCheckIn]);

    const handleCheckInToggle = async () => {
        if (!user?.uid || !activeCompany?.id) return;

        const newStatus = !isCheckedIn;
        const settingsRef = doc(db, 'users', user.uid, 'settings', 'attendance');
        
        try {
            // Update status
            await setDoc(settingsRef, { isCheckedIn: newStatus }, { merge: true });

            // Log event
            const today = new Date().toISOString().split('T')[0];
            const logsRef = collection(db, 'companies', activeCompany.id, 'attendance', today, 'logs');
            
            await addDoc(logsRef, {
                userId: user.uid,
                userName: user.name || user.email,
                type: newStatus ? 'check-in' : 'check-out',
                timestamp: serverTimestamp()
            });
        } catch (error) {
            console.error("Error toggling check-in:", error);
        }
    };

    return { isCheckedIn, toggleCheckIn: handleCheckInToggle };
}
